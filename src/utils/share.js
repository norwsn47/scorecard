import { deriveResult } from './game.js'
import { deriveHolePars, formatToPar, playerAverage, playerTotal, roundToPar, scoreToPar } from './scores.js'

const C = {
  bg:     '#F7F4EE',
  card:   '#F5EFE3',
  text:   '#1A1A18',
  muted:  '#6B6560',
  accent: '#1A4329',
  border: '#D9D0C4',
  // Score-vs-par delta colours — mirrored from DESIGN.md "Score vs par"
  // (`--color-under-par` / `--color-over-par`). The canvas can't read CSS
  // tokens, so the two hexes are duplicated here and must stay in sync.
  underPar: '#2C6B3C',
  overPar:  '#9B3A24',
}

// Colour for a vs-par delta on the canvas. Per the DESIGN.md override rule the
// canvas has no filled active cell, so the choice is purely by sign:
// negative → under-par, positive → over-par, level (E) → inherit the cell's
// current fill (`baseColor`) — including a winner column drawn in C.accent.
function deltaColour(delta, baseColor) {
  if (delta == null || Number.isNaN(delta) || delta === 0) return baseColor
  return delta < 0 ? C.underPar : C.overPar
}

// Draws `main` (in `baseColor`/`mainFont`) immediately followed by `trail`
// (in `trailColor`/`trailFont`), as a unit centred on `cx`. `raise` lifts the
// trailing text into a superscript. Restores textAlign to 'center'.
function drawWithTrail(ctx, cx, baseline, main, trail, opts) {
  const { baseColor, trailColor, mainFont, trailFont, raise = 0, gap = 1 } = opts
  ctx.font = mainFont
  const mw = ctx.measureText(main).width
  let tw = 0
  if (trail) {
    ctx.font = trailFont
    tw = gap + ctx.measureText(trail).width
  }
  const startX = cx - (mw + tw) / 2
  ctx.textAlign = 'left'
  ctx.font = mainFont
  ctx.fillStyle = baseColor
  ctx.fillText(main, startX, baseline)
  if (trail) {
    ctx.font = trailFont
    ctx.fillStyle = trailColor
    ctx.fillText(trail, startX + mw + gap, baseline - raise)
  }
  ctx.textAlign = 'center'
}

// "Tied" is the shared term across the Summary, History and this image
// (PRD §4.7 / item 36). `result` is a deriveResult() output.
function winnerLabel({ winners, winningTotal }) {
  if (winners.length === 0) return 'No winner - all players DNF'
  const strokes = `${winningTotal} strokes`
  if (winners.length === 1) return `Winner: ${winners[0]} - ${strokes}`
  if (winners.length >= 4) return `Tied: ${winners.length} players level on ${strokes}`
  const names = winners.length === 2
    ? `${winners[0]} & ${winners[1]}`
    : `${winners.slice(0, -1).join(', ')} & ${winners.at(-1)}`
  return `Tied: ${names} - ${strokes}`
}

async function buildCanvas(game) {
  await document.fonts.ready

  const players = game.players ?? []
  const holes   = game.holesPlayed ?? game.holes
  const result  = deriveResult(game)
  const winners = result.winners
  const isSolo  = players.length < 2
  const isDnf   = p => result.dnf.includes(p)
  const isWin   = p => winners.includes(p)

  const SCALE       = 2
  const W           = 390
  const PAD         = 20
  // Widened from 38 to fit the hole-number-plus-par label added for the
  // per-hole par bracket (e.g. "36 (3)") without crowding the first player
  // column — see the hole-row loop below.
  const HOLE_COL    = 44
  const playerColW  = (W - PAD * 2 - HOLE_COL) / players.length

  // Per-hole par for the vs-par superscripts and the round total-to-par (§5.3).
  const holePars   = deriveHolePars(game.holePars, holes)

  // Section heights
  const TOP_PAD   = 20
  const TITLE_H   = 40   // course name (serif italic)
  const BRAND_H   = 26   // "Scorecard by Outbuild"
  const GAP1      = 12   // before winner callout
  const WIN_H     = 44   // winner callout box
  const GAP2      = 12   // after winner callout
  const DIV_H     = 1
  const COL_H     = 30   // column headers
  const ROW_H     = 32
  const TOTAL_H   = 54   // totals + avg
  const BOT_PAD   = 20

  // Solo rounds carry no result — the winner callout box is omitted entirely.
  const H = TOP_PAD + TITLE_H + BRAND_H + GAP1 + (isSolo ? 0 : WIN_H + GAP2) + DIV_H + COL_H + holes * ROW_H + DIV_H + TOTAL_H + BOT_PAD

  const canvas  = document.createElement('canvas')
  canvas.width  = W * SCALE
  canvas.height = H * SCALE
  const ctx     = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  // Background
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  let y = TOP_PAD

  // Course name — serif italic display font
  const courseName = game.courseName || 'Golf Scorecard'
  ctx.fillStyle = C.accent
  ctx.font      = 'italic 22px "Cormorant Garamond", Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText(courseName, W / 2, y + 28, W - PAD * 2)
  y += TITLE_H

  // "Scorecard by Outbuild" wordmark — mixed weight
  {
    const boldFont = 'bold 12px Inter, system-ui, sans-serif'
    const normFont = '12px Inter, system-ui, sans-serif'
    ctx.font = boldFont
    const w1 = ctx.measureText('Scorecard').width
    ctx.font = normFont
    const w2 = ctx.measureText(' by ').width
    const w3 = ctx.measureText('Outbuild').width
    let x = W / 2 - (w1 + w2 + w3) / 2

    ctx.textAlign = 'left'
    ctx.fillStyle = C.text
    ctx.font      = boldFont
    ctx.fillText('Scorecard', x, y + 16)
    x += w1

    ctx.fillStyle = C.muted
    ctx.font      = normFont
    ctx.fillText(' by ', x, y + 16)
    x += w2

    ctx.fillStyle = C.muted
    ctx.fillText('Outbuild', x, y + 16)
  }
  y += BRAND_H

  y += GAP1

  // Winner callout box — omitted for a solo round (no result concept)
  if (!isSolo) {
    ctx.fillStyle = C.card
    ctx.fillRect(PAD, y, W - PAD * 2, WIN_H)

    const label   = winnerLabel(result)
    const noWin   = winners.length === 0
    ctx.fillStyle = noWin ? C.muted : C.accent
    ctx.font      = noWin
      ? '13px Inter, system-ui, sans-serif'
      : 'bold 15px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(label, W / 2, y + WIN_H / 2 + 5, W - PAD * 2 - 16)
    y += WIN_H + GAP2
  }

  // Divider
  ctx.fillStyle = C.border
  ctx.fillRect(PAD, y, W - PAD * 2, 1)
  y += DIV_H

  // Column headers
  ctx.fillStyle = C.muted
  ctx.font      = '11px Inter, system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('HOLE', PAD + 4, y + COL_H / 2 + 4)

  players.forEach((p, i) => {
    const cx = PAD + HOLE_COL + i * playerColW + playerColW / 2
    ctx.textAlign = 'center'
    ctx.fillStyle = isWin(p) ? C.accent : C.muted
    ctx.font = isWin(p) ? 'bold 11px Inter' : '11px Inter, system-ui, sans-serif'
    let name = p.toUpperCase()
    while (ctx.measureText(name).width > playerColW - 6 && name.length > 1) name = name.slice(0, -1)
    if (name !== p.toUpperCase()) name += '…'
    ctx.fillText(name, cx, y + COL_H / 2 + 4)
  })
  y += COL_H

  // Hole rows
  for (let h = 0; h < holes; h++) {
    const rowY = y + h * ROW_H
    if (h % 2 === 0) {
      ctx.fillStyle = C.card
      ctx.fillRect(PAD, rowY, W - PAD * 2, ROW_H)
    }
    // Hole number + par in brackets, matching the live grid and Summary
    // treatment (§5.1): the number bold, the par trailing in brackets at the
    // same size, not bold, no colour of its own — e.g. "3 (3)".
    ctx.textAlign = 'left'
    ctx.fillStyle = C.muted
    const holeLabel = String(h + 1)
    const parLabel  = ` (${holePars[h]})`
    ctx.font = 'bold 10px Inter, system-ui, sans-serif'
    ctx.fillText(holeLabel, PAD + 4, rowY + ROW_H / 2 + 4)
    const holeLabelW = ctx.measureText(holeLabel).width
    ctx.font = '10px Inter, system-ui, sans-serif'
    ctx.fillText(parLabel, PAD + 4 + holeLabelW, rowY + ROW_H / 2 + 4)

    players.forEach((p, i) => {
      const score = game.scores?.[p]?.[h] ?? null
      const cx    = PAD + HOLE_COL + i * playerColW + playerColW / 2
      const base  = isWin(p) ? C.accent : C.text
      if (score == null) {
        ctx.textAlign = 'center'
        ctx.fillStyle = base
        ctx.font      = '13px Inter, system-ui, sans-serif'
        ctx.fillText('-', cx, rowY + ROW_H / 2 + 5)
        return
      }
      const delta = scoreToPar(score, holePars[h])
      drawWithTrail(ctx, cx, rowY + ROW_H / 2 + 5, String(score), formatToPar(delta), {
        baseColor:  base,
        trailColor: deltaColour(delta, base),
        mainFont:   '13px Inter, system-ui, sans-serif',
        trailFont:  '9px Inter, system-ui, sans-serif',
        raise:      5,
      })
    })
  }
  y += holes * ROW_H

  // Divider before totals
  ctx.fillStyle = C.border
  ctx.fillRect(PAD, y, W - PAD * 2, 1)
  y += DIV_H

  // Totals row
  ctx.fillStyle = C.card
  ctx.fillRect(PAD, y, W - PAD * 2, TOTAL_H)

  ctx.fillStyle = C.muted
  ctx.font      = '11px Inter, system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('TOTAL', PAD + 4, y + 22)

  players.forEach((p, i) => {
    const cx    = PAD + HOLE_COL + i * playerColW + playerColW / 2
    const total = playerTotal(game.scores, p)
    const avg   = playerAverage(game.scores, p)
    const dnf   = isDnf(p)

    const base = isWin(p) ? C.accent : C.text
    if (dnf) {
      ctx.textAlign = 'center'
      ctx.fillStyle = base
      ctx.font      = 'bold 15px Inter, system-ui, sans-serif'
      ctx.fillText('DNF', cx, y + 22)
    } else {
      const rtp   = roundToPar((game.scores?.[p] ?? []).slice(0, holes), holePars)
      const bracket = rtp == null ? '' : `(${formatToPar(rtp)})`
      drawWithTrail(ctx, cx, y + 22, String(total || '-'), bracket, {
        baseColor:  base,
        trailColor: deltaColour(rtp, base),
        mainFont:   'bold 15px Inter, system-ui, sans-serif',
        trailFont:  '11px Inter, system-ui, sans-serif',
        raise:      0,
        gap:        3,
      })
    }

    if (!dnf && avg !== null) {
      ctx.fillStyle = C.muted
      ctx.font      = '11px Inter, system-ui, sans-serif'
      ctx.fillText(`Av. ${avg}`, cx, y + 40)
    }
  })
  y += TOTAL_H

  return canvas
}


export async function shareScorecard(game) {
  const canvas = await buildCanvas(game)

  return new Promise((resolve, reject) => {
    canvas.toBlob(async blob => {
      if (!blob) { reject(new Error('Failed to generate image')); return }

      const file = new File([blob], 'scorecard.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Scorecard - ${game.courseName || 'Golf Scorecard'}` })
          resolve('shared')
        } catch (e) {
          if (e.name === 'AbortError') resolve('cancelled')
          else reject(e)
        }
      } else {
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href     = url
        a.download = 'scorecard.png'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        resolve('downloaded')
      }
    }, 'image/png')
  })
}
