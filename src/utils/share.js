import { deriveResult } from './game.js'
import { deriveHolePars, formatToPar, playerTotal, roundToPar, scoreToPar, subtotal } from './scores.js'
import { formatDateOnly } from './format.js'
import { strokesLabel, tiedNames } from './result.js'

// The share image is a picture of the Summary screen (DESIGN.md "Share
// image"): Title-style course name and Caption date, the result line between
// hairlines, then the score table with the 56px tinted hole column, Label caps
// headers (Caption for 5 or 6 players), Strong scores with inline Caption
// deltas, Front 9 / Back 9 band rows and the Total row, and the Outbuild
// lockup at the foot. Every size is a DESIGN.md type style; nothing is below
// the 12px Caption floor.
//
// The canvas cannot read CSS, so the colour hexes are mirrored from the
// tokens here; tokens.test.js checks they stay equal to tokens.json.
const C = {
  bg:     '#F7F4EE',
  card:   '#F5EFE3',
  text:   '#1A1A18',
  muted:  '#6B6560',
  accent: '#1A4329',
  border: '#D9D0C4',
  underPar: '#2C6B3C',
  overPar:  '#9B3A24',
}

// DESIGN.md type styles as canvas fonts. Tracking is applied where the
// browser supports ctx.letterSpacing (Label caps 1.1px, Caption 0.2px).
const SANS = 'Inter, system-ui, sans-serif'
const T = {
  title:     { font: `italic 500 24px "Cormorant Garamond", Georgia, serif`, line: 30 },
  body:      { font: `400 16px ${SANS}`, line: 24 },
  strong:    { font: `500 16px ${SANS}`, line: 24 },
  small:     { font: `400 14px ${SANS}`, line: 20 },
  caption:   { font: `500 12px ${SANS}`, line: 16, tracking: '0.2px' },
  labelCaps: { font: `600 14px ${SANS}`, line: 20, tracking: '1.1px' },
}

function setType(ctx, style) {
  ctx.font = style.font
  if ('letterSpacing' in ctx) ctx.letterSpacing = style.tracking ?? '0px'
}

function textWidth(ctx, style, text) {
  setType(ctx, style)
  return ctx.measureText(text).width
}

// Shortens `text` with an ellipsis until it fits `max` pixels.
function fit(ctx, style, text, max) {
  if (textWidth(ctx, style, text) <= max) return text
  let t = text
  while (t.length > 1 && textWidth(ctx, style, t + '…') > max) t = t.slice(0, -1)
  return t + '…'
}

// Splits a title into at most two lines of `max` pixels; the second line
// ends in an ellipsis if the title is longer (the header's two-line clamp).
function titleLines(ctx, text, max) {
  if (textWidth(ctx, T.title, text) <= max) return [text]
  const words = text.split(' ')
  let first = ''
  let i = 0
  for (; i < words.length; i++) {
    const next = first ? `${first} ${words[i]}` : words[i]
    if (first && textWidth(ctx, T.title, next) > max) break
    first = next
  }
  const rest = words.slice(i).join(' ')
  return rest ? [fit(ctx, T.title, first, max), fit(ctx, T.title, rest, max)] : [fit(ctx, T.title, first, max)]
}

// Draws text pieces [{ text, style, color }] left to right from x on one
// baseline. Returns the end x.
function drawRun(ctx, x, baseline, pieces) {
  ctx.textAlign = 'left'
  for (const p of pieces) {
    setType(ctx, p.style)
    ctx.fillStyle = p.color
    ctx.fillText(p.text, x, baseline)
    x += ctx.measureText(p.text).width
  }
  return x
}

function runWidth(ctx, pieces) {
  return pieces.reduce((w, p) => w + textWidth(ctx, p.style, p.text), 0)
}

// Colour of a vs-par delta (DESIGN.md "Score vs par"): under par green, over
// par terracotta, level par (E) in the surrounding text colour. The image has
// no filled active cell, so the inverted branch never applies.
function deltaColour(delta) {
  if (delta == null || Number.isNaN(delta) || delta === 0) return C.text
  return delta < 0 ? C.underPar : C.overPar
}

// The result line, the same words as Summary's: muted, the winner's name in
// accent. Only for rounds of two or more players.
function resultPieces(result) {
  const { winners, winningTotal } = result
  const muted = t => ({ text: t, style: T.body, color: C.muted })
  if (winners.length === 0) return { pieces: [muted('No winner')], rules: true }
  if (winners.length >= 4) {
    return { pieces: [muted(`Tied - ${winners.length} players level on ${strokesLabel(winningTotal)}`)], rules: false }
  }
  const lead = winners.length === 1 ? 'Winner - ' : 'Tied - '
  const names = winners.length === 1 ? winners[0] : tiedNames(winners)
  return {
    pieces: [muted(lead), { text: names, style: T.body, color: C.accent }, muted(` - ${strokesLabel(winningTotal)}`)],
    rules: true,
  }
}

// Exported for tests only: the image's height for a game, so a test can check
// what each section adds without a real canvas.
export const LAYOUT = {
  W: 390,
  PAD: 16,           // page margin
  HOLE_COL: 56,      // tinted hole column, w-14
  TOP: 24,
  DATE_GAP: 4,       // title to date
  HEADER_BOTTOM: 16, // date to the header hairline
  RESULT_H: 40,      // pt-3 + one Body line + pb-1
  TABLE_GAP: 12,     // mt-3 above the table
  HEAD_H: 36,        // header row, h-9
  ROW_H: 36,         // hole rows, h-9 (Summary)
  BAND_H: 44,        // Front 9 / Back 9 / Total, h-11
  BAND_H_DENSE: 56,  // the same for 5 or 6 players, h-14
  FOOT_GAP: 24,
  LOCKUP_H: 24,
  BOTTOM: 24,
}

async function buildCanvas(game) {
  await document.fonts.ready

  const players = game.players ?? []
  const holes   = game.holesPlayed ?? game.holes
  const result  = deriveResult(game)
  const isSolo  = players.length < 2
  const isDnf   = p => result.dnf.includes(p)
  const dense   = players.length >= 5
  const L       = LAYOUT
  const W       = L.W
  const bandH   = dense ? L.BAND_H_DENSE : L.BAND_H
  const colW    = (W - L.HOLE_COL) / Math.max(players.length, 1)
  const colX    = i => L.HOLE_COL + i * colW
  const holePars = deriveHolePars(game.holePars, holes)
  const halves  = game.holes === 18
  // Front 9 once hole 9 was played, Back 9 once hole 18 was (as Summary).
  const bands   = (halves && holes >= 9 ? 1 : 0) + (halves && holes >= 18 ? 1 : 0)
  // A DNF sub-label grows the Total row by one Caption line (as Summary).
  const totalH  = bandH + (players.some(isDnf) ? T.caption.line : 0)

  // Measure the title first (it may take two lines) to size the canvas.
  const SCALE  = 2
  const canvas = document.createElement('canvas')
  const ctx    = canvas.getContext('2d')
  const courseName = game.courseName || 'Golf Scorecard'
  const lines = titleLines(ctx, courseName, W - L.PAD * 2)
  const date  = game.completedAt ? formatDateOnly(game.completedAt) : ''

  const headerH = L.TOP + lines.length * T.title.line + (date ? L.DATE_GAP + T.caption.line : 0) + L.HEADER_BOTTOM
  const H = headerH + 1
    + (isSolo ? 0 : L.RESULT_H)
    + L.TABLE_GAP + L.HEAD_H + holes * L.ROW_H + bands * bandH + totalH
    + L.FOOT_GAP + L.LOCKUP_H + L.BOTTOM

  canvas.width  = W * SCALE
  canvas.height = H * SCALE
  ctx.scale(SCALE, SCALE)

  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  const hairline = (y, h = 1, x = 0, w = W) => { ctx.fillStyle = C.border; ctx.fillRect(x, y, w, h) }
  // Text baseline for a style centred in a band of height h starting at y.
  const mid = (y, h, style) => y + h / 2 + parseInt(style.font.match(/(\d+)px/)[1], 10) * 0.35

  // ── Header: Title, Caption date, hairline (the page header) ──
  let y = L.TOP
  ctx.textAlign = 'center'
  for (const line of lines) {
    setType(ctx, T.title)
    ctx.fillStyle = C.text
    ctx.textAlign = 'center'
    ctx.fillText(line, W / 2, y + 23)
    y += T.title.line
  }
  if (date) {
    y += L.DATE_GAP
    setType(ctx, T.caption)
    ctx.fillStyle = C.muted
    ctx.textAlign = 'center'
    ctx.fillText(date, W / 2, y + 12)
    y += T.caption.line
  }
  y += L.HEADER_BOTTOM
  hairline(y)
  y += 1

  // ── Result line between hairlines (not for a solo round) ──
  if (!isSolo) {
    const { pieces, rules } = resultPieces(result)
    const maxText = W - L.PAD * 2 - (rules ? 2 * (24 + 12) : 0)
    let drawn = pieces
    if (runWidth(ctx, drawn) > maxText) {
      // Too long for one line: drop to Small, then shorten the names.
      drawn = pieces.map(p => ({ ...p, style: T.small }))
      if (runWidth(ctx, drawn) > maxText && drawn.length === 3) {
        const room = maxText - textWidth(ctx, T.small, drawn[0].text) - textWidth(ctx, T.small, drawn[2].text)
        drawn[1] = { ...drawn[1], text: fit(ctx, T.small, drawn[1].text, room) }
      }
    }
    const w = runWidth(ctx, drawn)
    const top = y + 12
    const base = mid(top, 24, drawn[0].style)
    const x0 = (W - w) / 2
    drawRun(ctx, x0, base, drawn)
    if (rules) {
      hairline(Math.round(top + 12), 1, L.PAD, x0 - 12 - L.PAD)
      hairline(Math.round(top + 12), 1, x0 + w + 12, W - L.PAD - (x0 + w + 12))
    }
    y += L.RESULT_H
  }

  y += L.TABLE_GAP

  // ── Table header row: tinted, Label caps (Caption when dense), muted ──
  const headStyle = dense ? T.caption : T.labelCaps
  ctx.fillStyle = C.card
  ctx.fillRect(0, y, W, L.HEAD_H)
  drawRun(ctx, 12, mid(y, L.HEAD_H, headStyle), [{ text: dense ? 'Hole' : 'HOLE', style: headStyle, color: C.muted }])
  players.forEach((p, i) => {
    const label = fit(ctx, headStyle, dense ? p : p.toUpperCase(), colW - 8)
    setType(ctx, headStyle)
    ctx.fillStyle = C.muted
    ctx.textAlign = 'center'
    ctx.fillText(label, colX(i) + colW / 2, mid(y, L.HEAD_H, headStyle))
  })
  y += L.HEAD_H
  hairline(y - 1)

  // A Strong number with an optional Caption trail, centred in a column.
  // `stacked` puts the trail on the line below (dense totals).
  const drawScore = (cx, top, h, main, trail, trailColor, { gap = 4, stacked = false } = {}) => {
    if (stacked && trail) {
      const mw = textWidth(ctx, T.strong, main)
      const tw = textWidth(ctx, T.caption, trail)
      drawRun(ctx, cx - mw / 2, top + h / 2 - 2, [{ text: main, style: T.strong, color: C.text }])
      drawRun(ctx, cx - tw / 2, top + h / 2 + 14, [{ text: trail, style: T.caption, color: trailColor }])
      return
    }
    const pieces = [{ text: main, style: T.strong, color: C.text }]
    if (trail) pieces.push({ text: (gap ? ' ' : '') + trail, style: T.caption, color: trailColor })
    const w = runWidth(ctx, pieces)
    drawRun(ctx, cx - w / 2, mid(top, h, T.strong), pieces)
  }

  // A band row (Front 9, Back 9, Total): tinted, a double hairline above.
  const drawBand = (label, labelStyle, from, to, rowH = bandH) => {
    hairline(y - 1, 2)
    ctx.fillStyle = C.card
    ctx.fillRect(0, y + 1, W, rowH - 1)
    drawRun(ctx, 12, mid(y, bandH, labelStyle), [{ text: label, style: labelStyle, color: C.text }])
    players.forEach((p, i) => {
      const cx = colX(i) + colW / 2
      const row = game.scores?.[p] ?? []
      const { total, toPar } = to == null
        ? { total: playerTotal(game.scores, p) || null, toPar: roundToPar(row.slice(0, holes), holePars) }
        : subtotal(row, holePars, from, to)
      const bracket = toPar == null ? '' : `(${formatToPar(toPar)})`
      drawScore(cx, y, bandH, String(total ?? '-'), bracket, deltaColour(toPar), { stacked: dense })
      if (to == null && isDnf(p)) {
        const w = textWidth(ctx, T.caption, 'DNF')
        drawRun(ctx, cx - w / 2, y + bandH + 8, [{ text: 'DNF', style: T.caption, color: C.muted }])
      }
    })
    y += rowH
  }

  // ── Hole rows: tinted hole column, Strong number + Caption par, scores ──
  for (let h = 0; h < holes; h++) {
    ctx.fillStyle = C.card
    ctx.fillRect(0, y, L.HOLE_COL, L.ROW_H)
    drawRun(ctx, 12, mid(y, L.ROW_H, T.strong), [
      { text: String(h + 1), style: T.strong, color: C.text },
      { text: ` (${holePars[h]})`, style: T.caption, color: C.muted },
    ])
    players.forEach((p, i) => {
      const score = game.scores?.[p]?.[h] ?? null
      const cx = colX(i) + colW / 2
      if (score == null) {
        drawScore(cx, y, L.ROW_H, '-', '', C.text)
        return
      }
      const delta = scoreToPar(score, holePars[h])
      drawScore(cx, y, L.ROW_H, String(score), formatToPar(delta), deltaColour(delta))
    })
    y += L.ROW_H
    hairline(y - 1)
    if (halves && h === 8) drawBand('Front 9', T.caption, 0, 9)
    if (halves && h === 17) drawBand('Back 9', T.caption, 9, 18)
  }

  // ── Total row ──
  drawBand('Total', T.strong, 0, null, totalH)

  // ── Outbuild lockup, as in Home's footer ──
  y += L.FOOT_GAP
  const lockup = [
    { text: 'Scorecard', style: T.strong, color: C.text },
    { text: ' by ', style: T.small, color: C.muted },
    { text: 'Outbuild', style: T.small, color: C.muted },
  ]
  drawRun(ctx, (W - runWidth(ctx, lockup)) / 2, y + 18, lockup)

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
          const courseName = game.courseName || 'Golf Scorecard'
          await navigator.share({
            files: [file],
            title: `Scorecard - ${courseName}`,
            // The share sheet (WhatsApp etc.) shows this alongside the image —
            // course + date so the recipient knows which round it is (#68).
            text: `${courseName} - ${formatDateOnly(game.completedAt)}`,
          })
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
