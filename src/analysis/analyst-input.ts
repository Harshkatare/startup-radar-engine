import type { TopicEvidence } from '../interfaces'

export interface AnalystInput {
  topic: {
    id: string
    name: string
    score: number
    growthRate: number
    confidence: number
  }

  rank: number | null

  evidence: TopicEvidence[]

  trend: {
    activity: number
    recentActivity: number
    previousActivity: number
    sourceDiversity: number
    freshness: number
  }
}
