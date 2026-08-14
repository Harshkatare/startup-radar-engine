import type { Event } from '../types'
import type { EventSource } from '../types'
import type { ProcessingStatistics } from './processing-statistics'
import type { ClassificationResult } from './classification/classification-result'
import type { AggregationResult } from './aggregation/aggregation-result'
import type { ScoreResult } from './scoring/score-result'
import type { TopicResult } from './topics/topic-result'
import type { TrendResult } from './trends/trend-result'

export interface ProcessingContext {
  events: Event[]
  source: EventSource
  startedAt: Date
  statistics: ProcessingStatistics
  classification: ClassificationResult
  aggregation: AggregationResult
  score: ScoreResult
  topics: TopicResult
  trends: TrendResult
}
