import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SQLiteClient } from '../../src/storage/sqlite/sqlite-client'
import { SQLiteStorage } from '../../src/storage/sqlite/sqlite-storage'
import { DashboardService } from '../../src/services/dashboard-service'
import { ProcessingPipeline } from '../../src/processing/processing-pipeline'
import { CleaningProcessor } from '../../src/processing/cleaning-processor'
import { ClassificationProcessor } from '../../src/processing/classification-processor'
import { AggregationProcessor } from '../../src/processing/aggregation-processor'
import { ScoringProcessor } from '../../src/processing/scoring/scoring-processor'
import { createProcessingStatistics } from '../../src/processing/processing-statistics'
import { createClassificationResult } from '../../src/processing/classification/classification-result'
import { createAggregationResult } from '../../src/processing/aggregation/aggregation-result'
import { createScoreResult } from '../../src/processing/scoring/score-result'
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

describe('Dashboard Integration', () => {
  let client: SQLiteClient
  let storage: SQLiteStorage
  let dashboardService: DashboardService

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
    }

    await pipeline.run(context)

    dashboardService = new DashboardService(client)
  })

  afterAll(() => {
    client.close()
  })

  it('returns summary statistics', () => {
    const summary = dashboardService.getSummary()
    expect(summary.totalEvents).toBe(9)
    expect(summary.totalSources).toBe(4)
    expect(summary.totalCategories).toBeGreaterThan(0)
    expect(summary.totalTechnologies).toBeGreaterThan(0)
    expect(summary.averageScore).toBeGreaterThanOrEqual(0)
  })

  it('returns category distribution', () => {
    const dist = dashboardService.getCategoryDistribution()
    expect(dist.length).toBeGreaterThan(0)
    for (const item of dist) {
      expect(item.name).toBeTruthy()
      expect(item.count).toBeGreaterThan(0)
    }
  })

  it('returns technology distribution', () => {
    const dist = dashboardService.getTechnologyDistribution()
    expect(dist.length).toBeGreaterThan(0)
    for (const item of dist) {
      expect(item.name).toBeTruthy()
      expect(item.count).toBeGreaterThan(0)
    }
  })

  it('returns top startups with default limit', () => {
    const top = dashboardService.getTopStartups(5)
    expect(top.length).toBe(5)
    for (const item of top) {
      expect(item.id).toBeTruthy()
      expect(item.source).toBeTruthy()
      expect(item.title).toBeTruthy()
      expect(item.createdAt).toBeTruthy()
    }
  })

  it('returns all startups when limit exceeds dataset', () => {
    const top = dashboardService.getTopStartups(100)
    expect(top.length).toBe(9)
  })

  it('clamps limit to minimum of 1', () => {
    const top = dashboardService.getTopStartups(0)
    expect(top.length).toBe(1)
  })

  it('includes categories and technologies in top startups', () => {
    const top = dashboardService.getTopStartups(8)
    for (const item of top) {
      expect(Array.isArray(item.categories)).toBe(true)
      expect(Array.isArray(item.technologies)).toBe(true)
    }
  })
})
