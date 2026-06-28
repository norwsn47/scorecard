const COLORS = {
  bg:     '#FAF7F0',
  card:   '#F5EFE3',
  text:   '#1A1A18',
  muted:  '#6B6560',
  accent: '#B85530',
  border: '#D9D0C4',
  bgText: '#FAF7F0',
}

import { playerTotal } from './scores.js'

async function buildCanvas(game) {
  await document.fonts.ready

  const players  = game.players ?? []
  const holes    = game.holesPlayed ?? game.holes
  const winner   = game.winner ?? null

  const SCALE    = 2
  const W        = 540
  const PAD      = 32
  const HOLE_COL = 48
  const playerColW = (W - PAD * 2 - HOLE_COL) / players.length

  const HEADER_H  = 96
  const SEP_H     = 1
  const LABEL_H   = 32
  const ROW_H     = 30
  const TOTAL_H   = 44
  const FOOTER_H  = 52
  const H = HEADER_H + SEP_H + LABEL_H + holes * ROW_H + SEP_H + TOTAL_H + FOOTER_H + PAD

  const canvas = document.createElement('canvas')
  canvas.width  = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  // ── Background ──────────────────────────────────────────────
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, W, H)

  // ── Header ──────────────────────────────────────────────────
  ctx.fillStyle = COLORS.text
  ctx.font = 'italic 26px "Cormorant Garamond", Georgia, serif'
  ctx.textAlign = 'left'
  ctx.fillText('Scorecard', PAD, 46)

  ctx.fillStyle = COLORS.muted
  ctx.font = '10px Inter, system-ui, sans-serif'
  ctx.fillText('BRUNTSFIELD LINKS · EDINBURGH', PAD, 66)

  // accent bar under header
  ctx.fillStyle = COLORS.accent
  ctx.fillRect(PAD, 80, 24, 2)

  // ── Divider ──────────────────────────────────────────────────
  ctx.fillStyle = COLORS.border
  ctx.fillRect(PAD, HEADER_H, W - PAD * 2, 1)

  // ── Column headers ───────────────────────────────────────────
  const labelY = HEADER_H + SEP_H + LABEL_H - 10
  ctx.font = '10px Inter, system-ui, sans-serif'
  ctx.fillStyle = COLORS.muted
  ctx.textAlign = 'left'
  ctx.fillText('HOLE', PAD + 4, labelY)

  players.forEach((player, i) => {
    const cx = PAD + HOLE_COL + i * playerColW + playerColW / 2
    ctx.textAlign = 'center'
    ctx.fillStyle = player === winner ? COLORS.accent : COLORS.muted
    ctx.font = player === winner
      ? 'bold 10px Inter, system-ui, sans-serif'
      : '10px Inter, system-ui, sans-serif'
    // truncate name
    const maxW = playerColW - 8
    let name = player.toUpperCase()
    while (ctx.measureText(name).width > maxW && name.length > 1) {
      name = name.slice(0, -1)
    }
    if (name !== player.toUpperCase()) name += '…'
    ctx.fillText(name, cx, labelY)
  })

  // ── Rows ─────────────────────────────────────────────────────
  const rowsTop = HEADER_H + SEP_H + LABEL_H

  for (let h = 0; h < holes; h++) {
    const y = rowsTop + h * ROW_H
    const midY = y + ROW_H / 2 + 5

    if (h % 2 === 0) {
      ctx.fillStyle = COLORS.card
      ctx.fillRect(PAD, y, W - PAD * 2, ROW_H)
    }

    ctx.fillStyle = COLORS.muted
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(String(h + 1), PAD + 4, midY)

    players.forEach((player, i) => {
      const score = game.scores?.[player]?.[h] ?? null
      const cx    = PAD + HOLE_COL + i * playerColW + playerColW / 2
      ctx.textAlign = 'center'
      ctx.fillStyle = player === winner ? COLORS.accent : COLORS.text
      ctx.font = '12px Inter, system-ui, sans-serif'
      ctx.fillText(score != null ? String(score) : '—', cx, midY)
    })
  }

  // ── Divider before totals ────────────────────────────────────
  const totalDivY = rowsTop + holes * ROW_H
  ctx.fillStyle = COLORS.border
  ctx.fillRect(PAD, totalDivY, W - PAD * 2, 1)

  // ── Totals row ───────────────────────────────────────────────
  const totalY    = totalDivY + SEP_H
  const totalMidY = totalY + TOTAL_H / 2 + 5

  ctx.fillStyle = COLORS.card
  ctx.fillRect(PAD, totalY, W - PAD * 2, TOTAL_H)

  ctx.fillStyle = COLORS.muted
  ctx.font = '10px Inter, system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('TOTAL', PAD + 4, totalMidY)

  players.forEach((player, i) => {
    const total = playerTotal(game.scores, player)
    const cx    = PAD + HOLE_COL + i * playerColW + playerColW / 2
    ctx.textAlign = 'center'
    ctx.fillStyle = player === winner ? COLORS.accent : COLORS.text
    ctx.font = `bold 14px Inter, system-ui, sans-serif`
    ctx.fillText(String(total || '—'), cx, totalMidY)
  })

  // ── Footer ───────────────────────────────────────────────────
  const footerY = totalY + TOTAL_H + 20
  ctx.fillStyle = COLORS.muted
  ctx.font = '10px Inter, system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('Scorecard by Outbuild', W - PAD, footerY)

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
          await navigator.share({
            files: [file],
            title: 'Scorecard — Bruntsfield Links',
          })
          resolve('shared')
        } catch (e) {
          if (e.name === 'AbortError') resolve('cancelled')
          else reject(e)
        }
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'scorecard.png'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        resolve('downloaded')
      }
    }, 'image/png')
  })
}
