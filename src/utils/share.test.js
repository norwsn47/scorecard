import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shareScorecard } from './share.js'

// Coverage for the share image (BACKLOG #104). jsdom has no canvas, so the
// canvas is faked: createElement('canvas') returns a recording stand-in whose
// 2D context logs every fillText / fillRect and whose toBlob hands back a
// small Blob. That is enough to check what the image says (course name, the
// winner / tie label, totals) and the share-vs-download branching, but NOT how
// it looks - layout, fonts, colours and truncation are not verified here.
// Only shareScorecard is exported; winnerLabel and buildCanvas are reached
// through it by reading the text drawn onto the fake canvas.

let ctx
let canvas
let blobResult

function fakeCanvas() {
  ctx = {
    scale: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    // Fixed-width glyphs keep the name-truncation loop deterministic.
    measureText: vi.fn(text => ({ width: String(text).length * 6 })),
    fillStyle: '',
    font: '',
    textAlign: '',
  }
  canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toBlob: vi.fn(cb => cb(blobResult)),
  }
  return canvas
}

const drawnText = () => ctx.fillText.mock.calls.map(([text]) => text)

function game(overrides = {}) {
  return {
    id: 'g1',
    courseName: 'Bruntsfield',
    completedAt: '2026-08-01T12:00:00.000Z',
    holes: 2,
    holesPlayed: 2,
    holePars: [3, 3],
    players: ['Ann', 'Bo'],
    scores: { Ann: [3, 3], Bo: [4, 4] },
    ...overrides,
  }
}

function setShareApi({ canShare, share }) {
  Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true, writable: true })
  Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true })
}

let anchorClick

beforeEach(() => {
  blobResult = new Blob(['png-bytes'], { type: 'image/png' })

  // The share code awaits document.fonts.ready before drawing.
  Object.defineProperty(document, 'fonts', { value: { ready: Promise.resolve() }, configurable: true })

  const realCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag, ...rest) =>
    tag === 'canvas' ? fakeCanvas() : realCreate(tag, ...rest),
  )
  anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

  URL.createObjectURL = vi.fn(() => 'blob:fake-url')
  URL.revokeObjectURL = vi.fn()

  // No Web Share API unless a test opts in - the desktop / download path.
  setShareApi({ canShare: undefined, share: undefined })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  delete navigator.canShare
  delete navigator.share
  delete document.fonts
  delete URL.createObjectURL
  delete URL.revokeObjectURL
})

describe('shareScorecard - what the image says', () => {
  it('sizes the canvas at 2x a 390px-wide card and scales the context to match', async () => {
    await shareScorecard(game())

    expect(canvas.width).toBe(780)
    expect(ctx.scale).toHaveBeenCalledWith(2, 2)
  })

  it('draws the course name, falling back to "Golf Scorecard" when there is none', async () => {
    await shareScorecard(game())
    expect(drawnText()).toContain('Bruntsfield')

    await shareScorecard(game({ courseName: undefined }))
    expect(drawnText()).toContain('Golf Scorecard')
  })

  it('draws the Outbuild wordmark', async () => {
    await shareScorecard(game())

    expect(drawnText()).toEqual(expect.arrayContaining(['Scorecard', ' by ', 'Outbuild']))
  })

  it('draws each player\'s name in capitals and their total', async () => {
    await shareScorecard(game())

    const text = drawnText()
    expect(text).toEqual(expect.arrayContaining(['ANN', 'BO', '6', '8']))
  })

  it('draws a dash for a hole with no score', async () => {
    await shareScorecard(game({ scores: { Ann: [3, 3], Bo: [4] } }))

    expect(drawnText()).toContain('-')
  })

  it('marks a player who stopped early as DNF in the totals row', async () => {
    await shareScorecard(game({ scores: { Ann: [3, 3], Bo: [4] } }))

    expect(drawnText()).toContain('DNF')
  })

  describe('winner callout wording (shared with Summary and History)', () => {
    it('names an outright winner with their strokes', async () => {
      await shareScorecard(game())
      expect(drawnText()).toContain('Winner: Ann - 6 strokes')
    })

    it('spells out two tied winners with an ampersand', async () => {
      await shareScorecard(game({ scores: { Ann: [3, 4], Bo: [4, 3] } }))
      expect(drawnText()).toContain('Tied: Ann & Bo - 7 strokes')
    })

    it('spells out three tied winners as "A, B & C"', async () => {
      const players = ['Ann', 'Bo', 'Cass']
      await shareScorecard(game({
        players,
        scores: Object.fromEntries(players.map(p => [p, [3, 3]])),
      }))
      expect(drawnText()).toContain('Tied: Ann, Bo & Cass - 6 strokes')
    })

    it('falls back to a count for four or more level', async () => {
      const players = ['Ann', 'Bo', 'Cass', 'Dev']
      await shareScorecard(game({
        players,
        scores: Object.fromEntries(players.map(p => [p, [3, 3]])),
      }))
      expect(drawnText()).toContain('Tied: 4 players level on 6 strokes')
    })

    it('says nobody won when no player has a score', async () => {
      await shareScorecard(game({ scores: {} }))
      expect(drawnText()).toContain('No winner - all players DNF')
    })

    it('re-derives the winner from the scores rather than trusting a stale stored one', async () => {
      await shareScorecard(game({ winner: 'Bo', winners: ['Bo'], winningTotal: 1 }))
      expect(drawnText()).toContain('Winner: Ann - 6 strokes')
      expect(drawnText()).not.toContain('Winner: Bo - 1 strokes')
    })

    it('omits the callout entirely for a solo round, and the card is shorter for it', async () => {
      await shareScorecard(game())
      const duoHeight = canvas.height

      await shareScorecard(game({ players: ['Ann'], scores: { Ann: [3, 3] } }))

      expect(drawnText().some(t => /^(Winner|Tied|No winner)/.test(t))).toBe(false)
      // Callout box (44) + the gap after it (12), drawn at 2x.
      expect(canvas.height).toBe(duoHeight - (44 + 12) * 2)
    })
  })
})

describe('shareScorecard - share sheet vs download', () => {
  it('rejects when the canvas cannot produce an image', async () => {
    blobResult = null

    await expect(shareScorecard(game())).rejects.toThrow('Failed to generate image')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('opens the native share sheet with the PNG, a title and course + date text when files can be shared', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const canShare = vi.fn(() => true)
    setShareApi({ canShare, share })

    await expect(shareScorecard(game())).resolves.toBe('shared')

    const [{ files }] = canShare.mock.calls[0]
    expect(files).toHaveLength(1)
    expect(files[0].name).toBe('scorecard.png')
    expect(files[0].type).toBe('image/png')

    expect(share).toHaveBeenCalledTimes(1)
    const [payload] = share.mock.calls[0]
    expect(payload.files[0].name).toBe('scorecard.png')
    expect(payload.title).toBe('Scorecard - Bruntsfield')
    expect(payload.text).toBe('Bruntsfield - 1 August 2026')

    // Sharing means no fallback download.
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(anchorClick).not.toHaveBeenCalled()
  })

  it('titles the share "Golf Scorecard" when the round has no course name', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    setShareApi({ canShare: () => true, share })

    await shareScorecard(game({ courseName: undefined }))

    expect(share.mock.calls[0][0].title).toBe('Scorecard - Golf Scorecard')
    expect(share.mock.calls[0][0].text).toMatch(/^Golf Scorecard - /)
  })

  it('downloads scorecard.png when the browser has no Web Share API', async () => {
    vi.useFakeTimers()

    await expect(shareScorecard(game())).resolves.toBe('downloaded')

    expect(URL.createObjectURL).toHaveBeenCalledWith(blobResult)
    expect(anchorClick).toHaveBeenCalledTimes(1)
    const anchor = anchorClick.mock.contexts[0]
    expect(anchor.download).toBe('scorecard.png')
    expect(anchor.href).toBe('blob:fake-url')

    // The object URL is released a second later, not immediately.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url')
  })

  it('downloads when canShare exists but says it cannot share files', async () => {
    vi.useFakeTimers()
    const share = vi.fn()
    setShareApi({ canShare: vi.fn(() => false), share })

    await expect(shareScorecard(game())).resolves.toBe('downloaded')

    expect(share).not.toHaveBeenCalled()
    expect(anchorClick).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1000)
  })

  it('resolves "cancelled" when the user dismisses the share sheet, without falling back to a download', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('Share canceled', 'AbortError'))
    setShareApi({ canShare: () => true, share })

    await expect(shareScorecard(game())).resolves.toBe('cancelled')

    expect(anchorClick).not.toHaveBeenCalled()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('rejects with any other share error, so the caller can see it', async () => {
    const failure = new DOMException('Permission denied', 'NotAllowedError')
    setShareApi({ canShare: () => true, share: vi.fn().mockRejectedValue(failure) })

    await expect(shareScorecard(game())).rejects.toBe(failure)
    expect(anchorClick).not.toHaveBeenCalled()
  })
})
