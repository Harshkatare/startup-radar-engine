import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SQLiteClient } from '../../src/storage/sqlite/sqlite-client'
import { SQLiteStorage } from '../../src/storage/sqlite/sqlite-storage'
import { SQLiteQueryService } from '../../src/query/query-service'
import { ProcessingPipeline } from '../../src/processing/processing-pipeline'
import { CleaningProcessor } from '../../src/processing/cleaning-processor'
import { ClassificationProcessor } from '../../src/processing/classification-processor'
import { AggregationProcessor } from '../../src/processing/aggregation-processor'
import { ScoringProcessor } from '../../src/processing/scoring/scoring-processor'
import { createProcessingStatistics } from '../../src/processing/processing-statistics'
import { createClassificationResult } from '../../src/processing/classification/classification-result'
import { createAggregationResult } from '../../src/processing/aggregation/aggregation-result'
import { createScoreResult } from '../../src/processing/scoring/score-result'
import { createTopicResult } from '../../src/processing/topics/topic-result'
import { createTrendResult } from '../../src/processing/trends/trend-result'
import { EventSource } from '../../src/types'
import type { Event } from '../../src/types'
import type { ProcessingContext } from '../../src/processing/processing-context'
import sampleData from '../fixtures/sample-events.json'

function mapFixtureEvent(f: typeof sampleData[number]): Event {
  return {
    id: f.id,
    source: f.source,
    externalId: f.externalId,
    title: f.title,
    content: f.content,
    metadata: f.metadata,
    createdAt: new Date(f.createdAt),
  }
}

describe('Query Integration', () => {
  let client: SQLiteClient
  let storage: SQLiteStorage
  let queryService: SQLiteQueryService

  beforeAll(async () => {
    client = new SQLiteClient(':memory:')
    client.open()

    storage = new SQLiteStorage(client)
    storage.runMigrations()

    const pipeline = new ProcessingPipeline(storage)
    pipeline.register(new CleaningProcessor())
    pipeline.register(new ClassificationProcessor())
    pipeline.register(new AggregationProcessor())
    pipeline.register(new ScoringProcessor())

    const events = sampleData.map(mapFixtureEvent)
    const context: ProcessingContext = {
      events,
      source: EventSource.GITHUB,
      startedAt: new Date(),
      statistics: createProcessingStatistics(),
      classification: createClassificationResult(),
      aggregation: createAggregationResult(),
      score: createScoreResult(),
      topics: createTopicResult(),
      trends: createTrendResult(),
    }

    await pipeline.run(context)

    queryService = new SQLiteQueryService(client)
  })

  afterAll(() => {
    client.close()
  })

  it('retrieves an event by id', async () => {
    const event = await queryService.findById('evt-001')
    expect(event).not.toBeNull()
    expect(event!.id).toBe('evt-001')
    expect(event!.title).toBe('New AI-powered code assistant launched')
  })

  it('returns null for non-existent id', async () => {
    const event = await queryService.findById('non-existent')
    expect(event).toBeNull()
  })

  it('returns all events with default query', async () => {
    const result = await queryService.findEvents({})
    expect(result.items.length).toBe(9)
    expect(result.total).toBe(9)
    expect(result.limit).toBe(50)
    expect(result.offset).toBe(0)
  })

  it('filters by source', async () => {
    const result = await queryService.findEvents({ source: 'github' })
    expect(result.items.every((e) => e.source === 'github')).toBe(true)
    expect(result.total).toBe(3)
  })

  it('filters by fromDate', async () => {
    const fromDate = new Date('2026-07-27T00:00:00.000Z')
    const result = await queryService.findEvents({ fromDate })
    expect(result.items.length).toBeGreaterThan(0)
    result.items.forEach((e) => {
      expect(e.createdAt.getTime()).toBeGreaterThanOrEqual(fromDate.getTime())
    })
  })

  it('filters by toDate', async () => {
    const toDate = new Date('2026-07-27T00:00:00.000Z')
    const result = await queryService.findEvents({ toDate })
    expect(result.items.length).toBeGreaterThan(0)
    result.items.forEach((e) => {
      expect(e.createdAt.getTime()).toBeLessThanOrEqual(toDate.getTime())
    })
  })

  it('filters by date range', async () => {
    const fromDate = new Date('2026-07-26T00:00:00.000Z')
    const toDate = new Date('2026-07-27T23:59:59.999Z')
    const result = await queryService.findEvents({ fromDate, toDate })
    result.items.forEach((e) => {
      const t = e.createdAt.getTime()
      expect(t).toBeGreaterThanOrEqual(fromDate.getTime())
      expect(t).toBeLessThanOrEqual(toDate.getTime())
    })
  })

  it('supports pagination', async () => {
    const page1 = await queryService.findEvents({ limit: 3, offset: 0 })
    expect(page1.items.length).toBe(3)
    expect(page1.hasNext).toBe(true)
    expect(page1.hasPrevious).toBe(false)

    const page2 = await queryService.findEvents({ limit: 3, offset: 3 })
    expect(page2.items.length).toBe(3)
    expect(page2.hasNext).toBe(true)
    expect(page2.hasPrevious).toBe(true)

    const page3 = await queryService.findEvents({ limit: 3, offset: 6 })
    expect(page3.items.length).toBe(3)
    expect(page3.hasNext).toBe(false)
    expect(page3.hasPrevious).toBe(true)
    expect(page3.hasNext).toBe(false)
    expect(page3.hasPrevious).toBe(true)
  })

  it('sorts by createdAt ascending', async () => {
    const result = await queryService.findEvents({ sortBy: 'createdAt', sortOrder: 'asc' })
    expect(result.items.length).toBe(9)
    for (let i = 1; i < result.items.length; i++) {
      expect(result.items[i].createdAt.getTime()).toBeGreaterThanOrEqual(
        result.items[i - 1].createdAt.getTime(),
      )
    }
  })

  it('sorts by createdAt descending (default)', async () => {
    const result = await queryService.findEvents({ sortBy: 'createdAt', sortOrder: 'desc' })
    expect(result.items.length).toBe(9)
    for (let i = 1; i < result.items.length; i++) {
      expect(result.items[i].createdAt.getTime()).toBeLessThanOrEqual(
        result.items[i - 1].createdAt.getTime(),
      )
    }
  })

  it('handles empty result set', async () => {
    const result = await queryService.findEvents({
      categories: ['non_existent_category_xyz'],
    })
    expect(result.items.length).toBe(0)
    expect(result.total).toBe(0)
    expect(result.hasNext).toBe(false)
    expect(result.hasPrevious).toBe(false)
  })
})
