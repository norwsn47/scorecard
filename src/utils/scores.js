export function playerTotal(scores, player) {
  return (scores?.[player] ?? [])
    .filter(s => s !== null)
    .reduce((sum, s) => sum + s, 0)
}

export function playerAverage(scores, player) {
  const scored = (scores?.[player] ?? []).filter(s => s !== null)
  if (scored.length === 0) return null
  return (scored.reduce((sum, s) => sum + s, 0) / scored.length).toFixed(1)
}
