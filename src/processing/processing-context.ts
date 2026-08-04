import type { Event } from '../types'
import type { EventSource } from '../types'
import type { ProcessingStatistics } from './processing-statistics'

export interface ProcessingContext {
  events: Event[]
  source: EventSource
  startedAt: Date
  statistics: ProcessingStatistics
}
