import { playerAverage, playerTotal } from './scores.js'

const C = {
  bg:     '#FAF7F0',
  card:   '#F5EFE3',
  text:   '#1A1A18',
  muted:  '#6B6560',
  accent: '#2d5a4a',
  border: '#D9D0C4',
}

function findWinners(game) {
  const players  = game.players ?? []
  const dnf      = game.dnf ?? []
  const finishers = players.filter(p => !dnf.includes(p))
  if (finishers.length === 0) return []
  const totals = finishers.map(p => ({ name: p, total: playerTotal(game.scores, p) }))
  const min    = Math.min(...totals.map(t => t.total))
  return totals.filter(t => t.total === min)
}

function winnerLabel(winners) {
  if (winners.length === 0) return 'No winner - all players DNF'
  const strokes = `${winners[0].total} strokes`
  if (winners.length === 1) return `Winner: ${winners[0].name} - ${strokes}`
  const names = winners.length === 2
    ? `${winners[0].name} and ${winners[1].name}`
    : `${winners.slice(0, -1).map(w => w.name).join(', ')}, and ${winners.at(-1).name}`
  return `Tied: ${names} - ${strokes}`
}

async function buildCanvas(game) {
  await document.fonts.ready

  const players = game.players ?? []
  const holes   = game.holesPlayed ?? game.holes
  const winners = findWinners(game)
  const isDnf   = p => (game.dnf ?? []).includes(p)
  const isWin   = p => winners.some(w => w.name === p)

  const SCALE       = 2
  const W           = 390
  const PAD         = 20
  const HOLE_COL    = 38
  const playerColW  = (W - PAD * 2 - HOLE_COL) / players.length

  // Section heights
  const TOP_PAD   = 20
  const TITLE_H   = 36   // "Bruntsfield Links"
  const BRAND_H   = 24   // "Outbuild"
  const NAME_H    = game.name ? 22 : 0
  const GAP1      = 12   // before winner callout
  const WIN_H     = 44   // winner callout box
  const GAP2      = 12   // after winner callout
  const DIV_H     = 1
  const COL_H     = 30   // column headers
  const ROW_H     = 32
  const TOTAL_H   = 54   // totals + avg
  const BOT_PAD   = 20

  const H = TOP_PAD + TITLE_H + BRAND_H + NAME_H + GAP1 + WIN_H + GAP2 + DIV_H + COL_H + holes * ROW_H + DIV_H + TOTAL_H + BOT_PAD

  const canvas  = document.createElement('canvas')
  canvas.width  = W * SCALE
  canvas.height = H * SCALE
  const ctx     = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  // Background
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  let y = TOP_PAD

  // "Bruntsfield Links" — main bold heading
  ctx.fillStyle = C.accent
  ctx.font      = 'bold 26px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Bruntsfield Links', W / 2, y + 24)
  y += TITLE_H

  // "Outbuild" — text lockup
  ctx.fillStyle = C.muted
  ctx.font      = 'italic 17px "Cormorant Garamond", Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText('Outbuild', W / 2, y + 16)
  y += BRAND_H

  // Game name (if set)
  if (game.name) {
    ctx.fillStyle = C.text
    ctx.font      = '13px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(game.name, W / 2, y + 15)
    y += NAME_H
  }

  y += GAP1

  // Winner callout box
  ctx.fillStyle = C.card
  ctx.fillRect(PAD, y, W - PAD * 2, WIN_H)

  const label   = winnerLabel(winners)
  const noWin   = winners.length === 0
  ctx.fillStyle = noWin ? C.muted : C.accent
  ctx.font      = noWin
    ? '13px Inter, system-ui, sans-serif'
    : 'bold 15px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label, W / 2, y + WIN_H / 2 + 5, W - PAD * 2 - 16)
  y += WIN_H + GAP2

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
    ctx.fillStyle = C.muted
    ctx.font      = '10px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(String(h + 1), PAD + 4, rowY + ROW_H / 2 + 4)

    players.forEach((p, i) => {
      const score = game.scores?.[p]?.[h] ?? null
      const cx    = PAD + HOLE_COL + i * playerColW + playerColW / 2
      ctx.textAlign = 'center'
      ctx.fillStyle = isWin(p) ? C.accent : C.text
      ctx.font      = '13px Inter, system-ui, sans-serif'
      ctx.fillText(score != null ? String(score) : '-', cx, rowY + ROW_H / 2 + 5)
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

    ctx.textAlign = 'center'
    ctx.fillStyle = isWin(p) ? C.accent : C.text
    ctx.font      = 'bold 15px Inter, system-ui, sans-serif'
    ctx.fillText(dnf ? 'DNF' : String(total || '-'), cx, y + 22)

    if (!dnf && avg !== null) {
      ctx.fillStyle = C.muted
      ctx.font      = '11px Inter, system-ui, sans-serif'
      ctx.fillText(`Av. ${avg}`, cx, y + 40)
    }
  })

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
          await navigator.share({ files: [file], title: 'Scorecard - Bruntsfield Links' })
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
