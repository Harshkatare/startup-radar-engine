export interface AggregationResult {
  categoryCounts: Record<string, number>
  technologyCounts: Record<string, number>
  keywordCounts: Record<string, number>
}

export function createAggregationResult(): AggregationResult {
  return {
    categoryCounts: {},
    technologyCounts: {},
    keywordCounts: {},
  }
}
