import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { SQLiteClient } from '../../src/storage/sqlite/sqlite-client'
import { SQLiteStorage } from '../../src/storage/sqlite/sqlite-storage'
import { SQLiteTopicRepository } from '../../src/storage/sqlite/sqlite-topic-repository'
import { ProcessingPipeline } from '../../src/processing/processing-pipeline'
import { CleaningProcessor } from '../../src/processing/cleaning-processor'
import { ClassificationProcessor } from '../../src/processing/classification-processor'
import { AggregationProcessor } from '../../src/processing/aggregation-processor'
import { ScoringProcessor } from '../../src/processing/scoring/scoring-processor'
import { TopicBuilderProcessor } from '../../src/processing/topic-builder-processor'
import { TrendProcessor } from '../../src/processing/trend-processor'
import { TopicPersistenceService } from '../../src/services/topic-persistence-service'
import { createProcessingStatistics } from '../../src/processing/processing-statistics'
import { createClassificationResult } from '../../src/processing/classification/classification-result'
import { createAggregationResult } from '../../src/processing/aggregation/aggregation-result'
import { createScoreResult } from '../../src/processing/scoring/score-result'
import { createTopicResult } from '../../src/processing/topics/topic-result'
import { createTrendResult } from '../../src/processing/trends/trend-result'
import { EventSource } from '../../src/types'
import type { Event } from '../../src/types'
import type { ProcessingContext } from '../../src/processing/processing-context'

const NOW = new Date('2026-06-15T00:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

const TEXT_A = 'AI python agents build tool'
const TEXT_B = 'devops docker kubernetes deploy platform'
const TEXT_NOISE = 'the of for with'

interface TopicRow {
  id: string
  name: string
  score: number
  growth_rate: number
  confidence: number
  updated_at: string
}

interface EvidenceRow {
  topic_id: string
  event_id: string
  source: string
}

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY)
}

function makeEvent(id: string, source: EventSource, createdAt: Date, text: string): Event {
  return {
    id,
    source,
    externalId: id,
    title: text,
    content: '',
    metadata: {},
    createdAt,
  }
}

function makeContext(events: Event[]): ProcessingContext {
  return {
    events,
    source: EventSource.GITHUB,
    startedAt: NOW,
    statistics: createProcessingStatistics(),
    classification: createClassificationResult(),
    aggregation: createAggregationResult(),
    score: createScoreResult(),
    topics: createTopicResult(),
    trends: createTrendResult(),
  }
}

let client: SQLiteClient

describe('Trend Persistence Integration', () => {
  let storage: SQLiteStorage
  let topicRepository: SQLiteTopicRepository
  let pipeline: ProcessingPipeline

  beforeAll(() => {
    client = new SQLiteClient(':memory:')
    client.open()

    storage = new SQLiteStorage(client)
    storage.runMigrations()

    topicRepository = new SQLiteTopicRepository(client)

    pipeline = new ProcessingPipeline([storage, new TopicPersistenceService(topicRepository)])
    pipeline.register(new CleaningProcessor())
    pipeline.register(new ClassificationProcessor())
    pipeline.register(new AggregationProcessor())
    pipeline.register(new ScoringProcessor())
    pipeline.register(new TopicBuilderProcessor())
    pipeline.register(new TrendProcessor())
  })

  beforeEach(() => {
    storage.clear()
  })

  afterAll(() => {
    client.close()
  })

  it('persists trend-derived score, growth rate and confidence after a full run', async () => {
    const events = [
      makeEvent('e1', EventSource.GITHUB, daysAgo(1), TEXT_A),
      makeEvent('e2', EventSource.REDDIT, daysAgo(2), TEXT_A),
      makeEvent('e3', EventSource.HACKER_NEWS, daysAgo(10), TEXT_A),
      makeEvent('e4', EventSource.GITHUB, daysAgo(30), TEXT_A),
    ]

    const result = await pipeline.run(makeContext(events))

    expect(result.trends.trends).toHaveProperty(result.topics.topics[0].id)
    const trend = result.trends.trends[result.topics.topics[0].id]
    expect(trend.activity).toBe(4)
    expect(trend.recentActivity).toBe(2)
    expect(trend.previousActivity).toBe(1)
    expect(trend.growthRate).toBe(1)
    expect(trend.sourceDiversity).toBe(1)
    expect(trend.freshness).toBe(0.5)
    expect(trend.score).toBeCloseTo(0.95, 8)
    expect(trend.confidence).toBeCloseTo(0.73, 8)

    const persisted = await topicRepository.findAll()
    expect(persisted).toHaveLength(1)
    expect(persisted[0].id).toBe(result.topics.topics[0].id)
    expect(persisted[0].score).toBeCloseTo(0.95, 8)
    expect(persisted[0].growthRate).toBe(1)
    expect(persisted[0].confidence).toBeCloseTo(0.73, 8)
    expect(persisted[0].updatedAt).toBeInstanceOf(Date)
  })

  it('does not duplicate topics or evidence when the pipeline runs twice', async () => {
    const events = [
      makeEvent('e1', EventSource.GITHUB, daysAgo(1), TEXT_A),
      makeEvent('e2', EventSource.REDDIT, daysAgo(2), TEXT_A),
      makeEvent('e3', EventSource.HACKER_NEWS, daysAgo(10), TEXT_A),
    ]

    const first = await pipeline.run(makeContext(events))
    const second = await pipeline.run(makeContext(events))

    expect(second.topics.topics).toEqual(first.topics.topics)
    expect(second.trends).toEqual(first.trends)

    const rows = client.query<TopicRow>('SELECT COUNT(*) AS cnt FROM topics')
    expect(rows[0].cnt).toBe(1)

    const evidence = client.query<EvidenceRow>('SELECT * FROM topic_evidence')
    expect(evidence).toHaveLength(3)
  })

  it('persists distinct trend values for multiple topics', async () => {
    const events = [
      makeEvent('a1', EventSource.GITHUB, daysAgo(1), TEXT_A),
      makeEvent('a2', EventSource.REDDIT, daysAgo(2), TEXT_A),
      makeEvent('b1', EventSource.HACKER_NEWS, daysAgo(1), TEXT_B),
    ]

    const result = await pipeline.run(makeContext(events))

    expect(result.topics.topics).toHaveLength(2)
    expect(Object.keys(result.trends.trends)).toHaveLength(2)

    const persisted = await topicRepository.findAll()
    expect(persisted).toHaveLength(2)

    for (const topic of persisted) {
      const trend = result.trends.trends[topic.id]
      expect(topic.score).toBeCloseTo(trend.score, 10)
      expect(topic.growthRate).toBeCloseTo(trend.growthRate, 10)
      expect(topic.confidence).toBeCloseTo(trend.confidence, 10)
    }

    const scores = persisted.map((topic) => topic.score).sort((a, b) => b - a)
    expect(scores[0]).toBeGreaterThan(scores[1])
  })

  it('persists zero growth for topics with only stale evidence', async () => {
    const events = [
      makeEvent('e1', EventSource.GITHUB, daysAgo(30), TEXT_A),
      makeEvent('e2', EventSource.REDDIT, daysAgo(31), TEXT_A),
    ]

    const result = await pipeline.run(makeContext(events))

    const trend = result.trends.trends[result.topics.topics[0].id]
    expect(trend.growthRate).toBe(0)
    expect(trend.score).toBeGreaterThan(0)

    const persisted = await topicRepository.findAll()
    expect(persisted[0].growthRate).toBe(0)
    expect(persisted[0].score).toBeCloseTo(trend.score, 10)
  })

  it('persists nothing when no topics are generated', async () => {
    const events = [
      makeEvent('e1', EventSource.GITHUB, daysAgo(1), TEXT_NOISE),
    ]

    const result = await pipeline.run(makeContext(events))

    expect(result.topics.topics).toHaveLength(0)
    expect(result.trends.trends).toEqual({})

    const rows = client.query<TopicRow>('SELECT COUNT(*) AS cnt FROM topics')
    expect(rows[0].cnt).toBe(0)
  })
})
