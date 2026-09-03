import type { EventSource } from '../types'
import type { QueryResult } from './query-service'

export interface TopicQuery {
  limit?: number
  offset?: number
  minScore?: number
}

export interface TopicSummary {
  id: string
  name: string
  score: number
  growthRate: number
  confidence: number
  rank: number | null
  updatedAt: Date
}

export interface TopicDetailTrend {
  activity: number
  recentActivity: number
  previousActivity: number
  sourceDiversity: number
  freshness: number
}

export interface TopicDetail {
  id: string
  name: string
  score: number
  growthRate: number
  confidence: number
  rank: number | null
  updatedAt: Date
  evidence: TopicEvidence[]
  trend: TopicDetailTrend
}

export interface TopicEvidence {
  eventId: string
  source: EventSource
}

export interface TopicQueryService {
  findAll(query?: TopicQuery): Promise<QueryResult<TopicSummary>>
  findById(id: string): Promise<TopicDetail | null>
  findTrending(limit?: number): Promise<TopicSummary[]>
}