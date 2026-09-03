import type { EventSource } from '../../types'

export interface TopicEvidence {
  eventId: string
  source: EventSource
}

export interface Topic {
  id: string
  name: string
  categories: string[]
  technologies: string[]
  keywords: string[]
  evidence: TopicEvidence[]
}

export interface TopicResult {
  topics: Topic[]
}

export function createTopicResult(): TopicResult {
  return {
    topics: [],
  }
}