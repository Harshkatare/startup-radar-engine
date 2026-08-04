export function normalizeCounts(counts: Record<string, number>): Record<string, number> {
  const keys = Object.keys(counts)
  if (keys.length === 0) return {}

  const maxCount = Math.max(...Object.values(counts))
  if (maxCount === 0) return {}

  const result: Record<string, number> = {}
  for (const key of keys) {
    result[key] = counts[key] / maxCount
  }
  return result
}
