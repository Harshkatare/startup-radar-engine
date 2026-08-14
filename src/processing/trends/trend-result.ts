export interface TopicTrend {
  topicId: string
  activity: number
  recentActivity: number
  previousActivity: number
  growthRate: number
  sourceDiversity: number
  freshness: number
  evidenceStrength: number
  normalizedActivity: number
  normalizedGrowth: number
  score: number
  confidence: number
}

export interface TrendResult {
  trends: Record<string, TopicTrend>
}

export function createTrendResult(): TrendResult {
  return {
    trends: {},
  }
}
