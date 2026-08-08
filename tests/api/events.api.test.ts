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

describe('Events API', () => {
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
    }

    await pipeline.run(context)

    app = createApp(deps)
  })

  afterAll(() => {
    client.close()
  })

  it('GET /events returns 200 with paginated results', async () => {
    const res = await request(app).get('/events').expect('Content-Type', /json/)

    expect(res.status).toBe(200)
    expect(res.body.items).toBeDefined()
    expect(Array.isArray(res.body.items)).toBe(true)
    expect(res.body.total).toBe(9)
    expect(res.body.limit).toBe(50)
    expect(res.body.offset).toBe(0)
  })

  it('GET /events supports pagination', async () => {
    const res = await request(app).get('/events?limit=3&offset=0')

    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(3)
    expect(res.body.limit).toBe(3)
    expect(res.body.offset).toBe(0)
    expect(res.body.hasNext).toBe(true)
    expect(res.body.hasPrevious).toBe(false)

    const res2 = await request(app).get('/events?limit=3&offset=6')
    expect(res2.status).toBe(200)
    expect(res2.body.items.length).toBe(3)
    expect(res2.body.hasNext).toBe(false)
    expect(res2.body.hasPrevious).toBe(true)
  })

  it('GET /events filters by source', async () => {
    const res = await request(app).get('/events?source=github')

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(3)
    for (const item of res.body.items) {
      expect(item.source).toBe('github')
    }
  })

  it('GET /events filters by date range', async () => {
    const res = await request(app).get('/events?fromDate=2026-07-27T00:00:00.000Z&toDate=2026-07-27T23:59:59.999Z')

    expect(res.status).toBe(200)
    for (const item of res.body.items) {
      const t = new Date(item.createdAt).getTime()
      expect(t).toBeGreaterThanOrEqual(new Date('2026-07-27T00:00:00.000Z').getTime())
      expect(t).toBeLessThanOrEqual(new Date('2026-07-27T23:59:59.999Z').getTime())
    }
  })

  it('GET /events sorts by createdAt ascending', async () => {
    const res = await request(app).get('/events?sortBy=createdAt&sortOrder=asc')

    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(9)
    for (let i = 1; i < res.body.items.length; i++) {
      expect(new Date(res.body.items[i].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(res.body.items[i - 1].createdAt).getTime(),
      )
    }
  })

  it('GET /events sorts by createdAt descending (default)', async () => {
    const res = await request(app).get('/events?sortBy=createdAt&sortOrder=desc')

    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(9)
    for (let i = 1; i < res.body.items.length; i++) {
      expect(new Date(res.body.items[i].createdAt).getTime()).toBeLessThanOrEqual(
        new Date(res.body.items[i - 1].createdAt).getTime(),
      )
    }
  })

  it('GET /events returns empty result set for non-matching filter', async () => {
    const res = await request(app).get('/events?source=nonexistent')

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(0)
    expect(res.body.items.length).toBe(0)
    expect(res.body.hasNext).toBe(false)
    expect(res.body.hasPrevious).toBe(false)
  })

  it('GET /events/:id returns 200 for existing event', async () => {
    const res = await request(app).get('/events/evt-001')

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('evt-001')
    expect(res.body.title).toBe('New AI-powered code assistant launched')
  })

  it('GET /events/:id returns 404 for missing event', async () => {
    const res = await request(app).get('/events/non-existent')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Not Found')
  })

  it('GET /events validates invalid limit returns 400', async () => {
    const res = await request(app).get('/events?limit=-1')

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid pagination parameters')
  })

  it('GET /events validates invalid offset returns 400', async () => {
    const res = await request(app).get('/events?offset=-1')

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid pagination parameters')
  })

  it('GET /events validates invalid sortBy returns 400', async () => {
    const res = await request(app).get('/events?sortBy=invalid')

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Invalid sortBy')
  })

  it('GET /events validates invalid sortOrder returns 400', async () => {
    const res = await request(app).get('/events?sortOrder=invalid')

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Invalid sortOrder')
  })

  it('GET /events validates invalid fromDate returns 400', async () => {
    const res = await request(app).get('/events?fromDate=not-a-date')

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid fromDate')
  })

  it('GET /events validates invalid toDate returns 400', async () => {
    const res = await request(app).get('/events?toDate=not-a-date')

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid toDate')
  })

  it('unknown route returns 404', async () => {
    const res = await request(app).get('/unknown-route')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Not Found')
  })
})
