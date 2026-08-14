import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/api/app'
import { createDependencies } from '../../src/bootstrap/dependencies'
import { SQLiteClient } from '../../src/storage/sqlite/sqlite-client'
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
import type { Dependencies } from '../../src/bootstrap/dependencies'
import type { ProcessingContext } from '../../src/processing/processing-context'
import type { Event } from '../../src/types'
import type express from 'express'
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

describe('Dashboard API', () => {
  let app: express.Application
  let deps: Dependencies
  let client: SQLiteClient

  beforeAll(async () => {
    client = new SQLiteClient(':memory:')
    client.open()

    deps = createDependencies(client)

    const pipeline = new ProcessingPipeline(deps.storage)
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

    app = createApp(deps)
  })

  afterAll(() => {
    client.close()
  })

  it('GET /dashboard/summary returns 200 with summary object', async () => {
    const res = await request(app).get('/dashboard/summary').expect('Content-Type', /json/)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('totalEvents')
    expect(res.body).toHaveProperty('totalSources')
    expect(res.body).toHaveProperty('totalCategories')
    expect(res.body).toHaveProperty('totalTechnologies')
    expect(res.body).toHaveProperty('averageScore')
  })

  it('GET /dashboard/categories returns 200 with distribution array', async () => {
    const res = await request(app).get('/dashboard/categories').expect('Content-Type', /json/)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    for (const item of res.body) {
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('count')
    }
  })

  it('GET /dashboard/technologies returns 200 with distribution array', async () => {
    const res = await request(app).get('/dashboard/technologies').expect('Content-Type', /json/)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    for (const item of res.body) {
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('count')
    }
  })

  it('GET /dashboard/top-startups returns 200 with startup array', async () => {
    const res = await request(app).get('/dashboard/top-startups').expect('Content-Type', /json/)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(9)
    for (const item of res.body) {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('source')
      expect(item).toHaveProperty('title')
      expect(item).toHaveProperty('createdAt')
      expect(item).toHaveProperty('categories')
      expect(item).toHaveProperty('technologies')
    }
  })

  it('GET /dashboard/top-startups respects limit parameter', async () => {
    const res = await request(app).get('/dashboard/top-startups?limit=3')

    expect(res.status).toBe(200)
    expect(res.body.length).toBe(3)
  })
})
