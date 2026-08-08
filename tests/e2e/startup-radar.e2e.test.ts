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

describe('Startup Radar E2E', () => {
  let app: express.Application
  let deps: Dependencies
  let client: SQLiteClient

  beforeAll(async () => {
    client = new SQLiteClient(':memory:')
    client.open()

    deps = createDependencies(client)

    const events = sampleData.map(mapFixtureEvent)

    const pipeline = new ProcessingPipeline(deps.storage)
    pipeline.register(new CleaningProcessor())
    pipeline.register(new ClassificationProcessor())
    pipeline.register(new AggregationProcessor())
    pipeline.register(new ScoringProcessor())

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

  describe('Scenario 1 — Complete Processing Workflow', () => {
    it('POST /process returns 200 with processing summary', async () => {
      const res = await request(app).post('/process').expect('Content-Type', /json/)

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('completed')
      expect(res.body.statistics).toBeDefined()
      expect(res.body.statistics).toHaveProperty('eventsProcessed')
      expect(res.body.statistics).toHaveProperty('duplicatesRemoved')
      expect(res.body.statistics).toHaveProperty('whitespaceTrimmed')
      expect(res.body.statistics).toHaveProperty('urlsNormalized')
      expect(res.body.statistics).toHaveProperty('categoriesFound')
      expect(res.body.statistics).toHaveProperty('technologiesFound')
      expect(res.body.statistics).toHaveProperty('keywordsExtracted')
    })
  })

  describe('Scenario 2 — Query Workflow', () => {
    it('GET /events returns events with pagination metadata', async () => {
      const res = await request(app).get('/events')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.items)).toBe(true)
      expect(res.body.items.length).toBeGreaterThan(0)
      expect(res.body).toHaveProperty('total')
      expect(res.body).toHaveProperty('limit')
      expect(res.body).toHaveProperty('offset')
      expect(res.body).toHaveProperty('hasNext')
      expect(res.body).toHaveProperty('hasPrevious')
    })

    it('returns expected seeded events', async () => {
      const res = await request(app).get('/events/evt-001')

      expect(res.status).toBe(200)
      expect(res.body.id).toBe('evt-001')
      expect(res.body.source).toBe('github')
      expect(res.body.title).toBe('New AI-powered code assistant launched')
    })

    it('supports source filtering', async () => {
      const res = await request(app).get('/events?source=hackernews')

      expect(res.status).toBe(200)
      expect(res.body.total).toBeGreaterThan(0)
      for (const item of res.body.items) {
        expect(item.source).toBe('hackernews')
      }
    })

    it('supports date range filtering', async () => {
      const res = await request(app).get('/events?fromDate=2026-07-27T00:00:00.000Z&toDate=2026-07-28T23:59:59.999Z')

      expect(res.status).toBe(200)
      expect(res.body.total).toBeGreaterThan(0)
    })

    it('supports pagination', async () => {
      const page1 = await request(app).get('/events?limit=3&offset=0')
      expect(page1.status).toBe(200)
      expect(page1.body.items.length).toBe(3)
      expect(page1.body.hasNext).toBe(true)

      const page4 = await request(app).get('/events?limit=3&offset=9')
      expect(page4.status).toBe(200)
      expect(page4.body.items.length).toBe(0)
      expect(page4.body.hasNext).toBe(false)
    })

    it('supports sorting', async () => {
      const res = await request(app).get('/events?sortBy=createdAt&sortOrder=asc')

      expect(res.status).toBe(200)
      expect(res.body.items.length).toBeGreaterThan(1)
      for (let i = 1; i < res.body.items.length; i++) {
        expect(new Date(res.body.items[i].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(res.body.items[i - 1].createdAt).getTime(),
        )
      }
    })
  })

  describe('Scenario 3 — Dashboard Workflow', () => {
    it('GET /dashboard/summary returns summary statistics', async () => {
      const res = await request(app).get('/dashboard/summary')

      expect(res.status).toBe(200)
      expect(res.body.totalEvents).toBeGreaterThan(0)
      expect(res.body.totalSources).toBeGreaterThan(0)
      expect(res.body).toHaveProperty('totalCategories')
      expect(res.body).toHaveProperty('totalTechnologies')
      expect(res.body).toHaveProperty('averageScore')
    })

    it('GET /dashboard/categories returns category distribution', async () => {
      const res = await request(app).get('/dashboard/categories')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      for (const item of res.body) {
        expect(item).toHaveProperty('name')
        expect(item).toHaveProperty('count')
      }
    })

    it('GET /dashboard/technologies returns technology distribution', async () => {
      const res = await request(app).get('/dashboard/technologies')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      for (const item of res.body) {
        expect(item).toHaveProperty('name')
        expect(item).toHaveProperty('count')
      }
    })

    it('GET /dashboard/top-startups returns startup list', async () => {
      const res = await request(app).get('/dashboard/top-startups')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
      for (const item of res.body) {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('source')
        expect(item).toHaveProperty('title')
        expect(item).toHaveProperty('createdAt')
        expect(Array.isArray(item.categories))
        expect(Array.isArray(item.technologies))
      }
    })
  })

  describe('Scenario 4 — Scheduler Status', () => {
    it('GET /process/status returns status object', async () => {
      const res = await request(app).get('/process/status')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('running')
      expect(res.body).toHaveProperty('lastRun')
      expect(res.body).toHaveProperty('lastDurationMs')
      expect(res.body).toHaveProperty('lastStatus')
    })
  })

  describe('Scenario 5 — Failure Path', () => {
    it('unknown route returns 404', async () => {
      const res = await request(app).get('/nonexistent-route')

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Not Found')
    })

    it('invalid query parameter returns 400', async () => {
      const res = await request(app).get('/events?sortBy=invalid')

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid sortBy: invalid')
    })

    it('missing event returns 404', async () => {
      const res = await request(app).get('/events/does-not-exist')

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Not Found')
    })
  })
})
