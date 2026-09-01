import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createApp } from '../../src/api/app'
import { createDependencies } from '../../src/bootstrap/dependencies'
import { SQLiteClient } from '../../src/storage/sqlite/sqlite-client'
import { SQLiteTopicRepository } from '../../src/storage/sqlite/sqlite-topic-repository'
import { TopicController } from '../../src/controllers/topic-controller'
import { createTopicRoutes } from '../../src/routes/topic-routes'
import { EventSource } from '../../src/types'
import type { Dependencies } from '../../src/bootstrap/dependencies'
import type { Topic } from '../../src/types'
import type { TopicEvidence } from '../../src/interfaces/topic-query-service'
import type { TopicQueryService } from '../../src/interfaces/topic-query-service'
import type { AIAnalyst } from '../../src/interfaces/ai-analyst'
import { GroqAnalystProvider } from '../../src/analysis/groq-analyst-provider'

function makeTopic(id: string, score: number, growthRate: number, confidence: number): Topic {
  return {
    id,
    name: `Topic ${id}`,
    score,
    growthRate,
    confidence,
    updatedAt: new Date('2026-06-15T00:00:00.000Z'),
  }
}

describe('Topics API', () => {
  let deps: Dependencies
  let client: SQLiteClient
  let repository: SQLiteTopicRepository

  beforeAll(() => {
    client = new SQLiteClient(':memory:')
    client.open()

    deps = createDependencies(client)
    repository = new SQLiteTopicRepository(client)
  })

  beforeEach(() => {
    repository.clear()
  })

  afterAll(() => {
    client.close()
  })

  function insertStubEvent(id: string, source: EventSource): void {
    client.execute(
      `INSERT OR IGNORE INTO events (id, source, external_id, title, content, metadata, created_at)
       VALUES (?, ?, ?, 'Stub Event', '', '{}', datetime('now'))`,
      [id, source, id],
    )
  }

  async function seed(topics: Topic[], evidence: Record<string, TopicEvidence[]> = {}): Promise<void> {
    for (const items of Object.values(evidence)) {
      for (const item of items) {
        insertStubEvent(item.eventId, item.source)
      }
    }
    await repository.saveMany(topics)
    for (const [topicId, items] of Object.entries(evidence)) {
      repository.saveTopicEvidence(topicId, items)
    }
  }

  describe('GET /topics', () => {
    it('returns 200 with the default listing', async () => {
      await seed([
        makeTopic('topic-a', 0.9, 0.5, 0.5),
        makeTopic('topic-b', 0.8, 0.5, 0.5),
      ])

      const res = await request(createApp(deps)).get('/topics')

      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(2)
      expect(res.body.total).toBe(2)
      expect(res.body.limit).toBe(50)
      expect(res.body.offset).toBe(0)
      expect(res.body.hasNext).toBe(false)
      expect(res.body.hasPrevious).toBe(false)
    })

    it('supports the limit parameter', async () => {
      await seed([
        makeTopic('topic-a', 0.9, 0.5, 0.5),
        makeTopic('topic-b', 0.8, 0.5, 0.5),
        makeTopic('topic-c', 0.7, 0.5, 0.5),
      ])

      const res = await request(createApp(deps)).get('/topics?limit=2')

      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(2)
      expect(res.body.limit).toBe(2)
      expect(res.body.hasNext).toBe(true)
    })

    it('supports the offset parameter', async () => {
      await seed([
        makeTopic('topic-a', 0.9, 0.5, 0.5),
        makeTopic('topic-b', 0.8, 0.5, 0.5),
        makeTopic('topic-c', 0.7, 0.5, 0.5),
      ])

      const res = await request(createApp(deps)).get('/topics?limit=2&offset=2')

      expect(res.status).toBe(200)
      expect(res.body.items.map((item: { id: string }) => item.id)).toEqual(['topic-c'])
      expect(res.body.offset).toBe(2)
      expect(res.body.hasPrevious).toBe(true)
      expect(res.body.hasNext).toBe(false)
    })

    it('supports the minScore parameter', async () => {
      await seed([
        makeTopic('topic-a', 0.9, 0.5, 0.5),
        makeTopic('topic-b', 0.6, 0.5, 0.5),
        makeTopic('topic-c', 0.4, 0.5, 0.5),
      ])

      const res = await request(createApp(deps)).get('/topics?minScore=0.6')

      expect(res.status).toBe(200)
      expect(res.body.items.map((item: { id: string }) => item.id)).toEqual(['topic-a', 'topic-b'])
      expect(res.body.total).toBe(2)
    })

    it('returns pagination metadata', async () => {
      await seed([
        makeTopic('topic-a', 0.9, 0.5, 0.5),
        makeTopic('topic-b', 0.8, 0.5, 0.5),
        makeTopic('topic-c', 0.7, 0.5, 0.5),
        makeTopic('topic-d', 0.6, 0.5, 0.5),
      ])

      const res = await request(createApp(deps)).get('/topics?limit=2&offset=1')

      expect(res.status).toBe(200)
      expect(res.body.total).toBe(4)
      expect(res.body.limit).toBe(2)
      expect(res.body.offset).toBe(1)
      expect(res.body.hasNext).toBe(true)
      expect(res.body.hasPrevious).toBe(true)
    })

    it('orders deterministically: score desc, growth desc, confidence desc, id asc', async () => {
      await seed([
        makeTopic('topic-b', 0.8, 0.4, 0.5),
        makeTopic('topic-a', 0.8, 1.2, 0.5),
        makeTopic('topic-d', 0.8, 1.2, 0.9),
        makeTopic('topic-c', 0.8, 1.2, 0.9),
      ])

      const res = await request(createApp(deps)).get('/topics')

      expect(res.status).toBe(200)
      expect(res.body.items.map((item: { id: string }) => item.id)).toEqual([
        'topic-c',
        'topic-d',
        'topic-a',
        'topic-b',
      ])
    })

    it('returns rank null since ranking is not persisted', async () => {
      await seed([makeTopic('topic-a', 0.9, 0.5, 0.5)])

      const res = await request(createApp(deps)).get('/topics')

      expect(res.status).toBe(200)
      expect(res.body.items[0].rank).toBeNull()
    })

    it('rejects an invalid limit with 400', async () => {
      const res = await request(createApp(deps)).get('/topics?limit=-1')

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid limit')
    })

    it('rejects a non-numeric limit with 400', async () => {
      const res = await request(createApp(deps)).get('/topics?limit=abc')

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid limit')
    })

    it('rejects an invalid offset with 400', async () => {
      const res = await request(createApp(deps)).get('/topics?offset=-1')

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid offset')
    })

    it('rejects an invalid minScore with 400', async () => {
      const res = await request(createApp(deps)).get('/topics?minScore=abc')

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid minScore')
    })

    it('returns an empty result when no topics exist', async () => {
      const res = await request(createApp(deps)).get('/topics')

      expect(res.status).toBe(200)
      expect(res.body.items).toEqual([])
      expect(res.body.total).toBe(0)
      expect(res.body.hasNext).toBe(false)
      expect(res.body.hasPrevious).toBe(false)
    })
  })

  describe('GET /topics/:id', () => {
    it('returns 200 with the topic detail including evidence', async () => {
      await seed(
        [makeTopic('topic-1', 1, 0.5, 0.5)],
        {
          'topic-1': [
            { eventId: 'event-1', source: EventSource.GITHUB },
            { eventId: 'event-2', source: EventSource.REDDIT },
          ],
        },
      )

      const res = await request(createApp(deps)).get('/topics/topic-1')

      expect(res.status).toBe(200)
      expect(res.body.id).toBe('topic-1')
      expect(res.body.name).toBe('Topic topic-1')
      expect(res.body.score).toBe(1)
      expect(res.body.rank).toBeNull()
      expect(new Date(res.body.updatedAt).toISOString()).toBe('2026-06-15T00:00:00.000Z')
      expect(res.body.evidence).toEqual([
        { eventId: 'event-1', source: EventSource.GITHUB },
        { eventId: 'event-2', source: EventSource.REDDIT },
      ])
    })

    it('returns 404 for a missing topic', async () => {
      const res = await request(createApp(deps)).get('/topics/does-not-exist')

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Not Found')
    })

    it('does not treat "trending" as a topic id', async () => {
      const res = await request(createApp(deps)).get('/topics/trending')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('GET /topics/trending', () => {
    it('returns the default limit of 10', async () => {
      const topics = Array.from({ length: 12 }, (_, index) =>
        makeTopic(`topic-${String(index).padStart(2, '0')}`, 1 - index / 20, 0.5, 0.5),
      )
      await seed(topics)

      const res = await request(createApp(deps)).get('/topics/trending')

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(10)
      expect(res.body.map((item: { id: string }) => item.id)).toEqual(
        topics.map((t) => t.id).slice(0, 10),
      )
    })

    it('supports a custom limit', async () => {
      await seed([
        makeTopic('topic-a', 0.9, 0.5, 0.5),
        makeTopic('topic-b', 0.8, 0.5, 0.5),
        makeTopic('topic-c', 0.7, 0.5, 0.5),
      ])

      const res = await request(createApp(deps)).get('/topics/trending?limit=2')

      expect(res.status).toBe(200)
      expect(res.body.map((item: { id: string }) => item.id)).toEqual(['topic-a', 'topic-b'])
    })

    it('rejects an invalid limit with 400', async () => {
      const res = await request(createApp(deps)).get('/topics/trending?limit=0')

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid limit')
    })

    it('returns an empty array when no topics exist', async () => {
      const res = await request(createApp(deps)).get('/topics/trending')

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })
  })

  describe('GET /topics/:id/analysis', () => {
    it('returns 200 with AnalystResult for an existing topic', async () => {
      await seed(
        [makeTopic('topic-1', 0.85, 0.5, 0.75)],
        {
          'topic-1': [
            { eventId: 'event-1', source: EventSource.GITHUB },
            { eventId: 'event-2', source: EventSource.REDDIT },
          ],
        },
      )

      const res = await request(createApp(deps)).get('/topics/topic-1/analysis')

      expect(res.status).toBe(200)
      expect(res.body.topicId).toBe('topic-1')
      expect(typeof res.body.summary).toBe('string')
      expect(res.body.summary).toContain('topic-1')
      expect(typeof res.body.whyItMatters).toBe('string')
      expect(res.body.whyItMatters.length).toBeGreaterThan(0)
      expect(typeof res.body.evidenceSummary).toBe('string')
      expect(res.body.evidenceSummary).toContain('2 evidence items')
    })

    it('produces deterministic repeatable results across multiple calls', async () => {
      await seed(
        [makeTopic('topic-repeat', 0.9, 0.2, 0.8)],
        {
          'topic-repeat': [{ eventId: 'event-1', source: EventSource.GITHUB }],
        },
      )

      const res1 = await request(createApp(deps)).get('/topics/topic-repeat/analysis')
      const res2 = await request(createApp(deps)).get('/topics/topic-repeat/analysis')

      expect(res1.status).toBe(200)
      expect(res2.status).toBe(200)
      expect(res1.body).toEqual(res2.body)
    })

    it('returns 404 for an unknown topic', async () => {
      const res = await request(createApp(deps)).get('/topics/unknown-topic/analysis')

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ error: 'Not Found' })
    })

    it('forwards provider/service errors to the centralized error handler', async () => {
      await seed([makeTopic('topic-err', 0.5, 0.5, 0.5)])

      const failingAnalyst: AIAnalyst = {
        analyze: vi.fn().mockRejectedValue(new Error('AI provider explosion')),
      }

      const customDeps: Dependencies = {
        ...deps,
        topicController: new TopicController(deps.topicController['topicQueryService'], failingAnalyst),
      }

      const res = await request(createApp(customDeps)).get('/topics/topic-err/analysis')

      expect(res.status).toBe(500)
      expect(res.body).toEqual({ error: 'Internal Server Error' })
    })
  })

  describe('delegation', () => {
    it('delegates to TopicQueryService rather than accessing storage directly', async () => {
      const findAll = vi.fn().mockResolvedValue({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
        hasNext: false,
        hasPrevious: false,
      })
      const findById = vi.fn().mockResolvedValue(null)
      const findTrending = vi.fn().mockResolvedValue([])
      const service: TopicQueryService = { findAll, findById, findTrending }
      const stubAnalyst: AIAnalyst = {
        analyze: vi.fn().mockResolvedValue({
          topicId: 'stub-id',
          summary: 'Stub summary',
          whyItMatters: 'Stub why',
          evidenceSummary: 'Stub evidence',
        }),
      }

      const app = express()
      app.use(createTopicRoutes(new TopicController(service, stubAnalyst)))

      await request(app).get('/topics?limit=5&offset=2&minScore=0.5')
      expect(findAll).toHaveBeenCalledWith({ limit: 5, offset: 2, minScore: 0.5 })

      await request(app).get('/topics/topic-1')
      expect(findById).toHaveBeenCalledWith('topic-1')

      await request(app).get('/topics/trending?limit=7')
      expect(findTrending).toHaveBeenCalledWith(7)
    })

    it('delegates analysis to AIAnalyst with explicit AnalystInput without accessing storage directly', async () => {
      const mockDetail = {
        id: 'topic-alpha',
        name: 'AI / TypeScript',
        score: 0.88,
        growthRate: 0.45,
        confidence: 0.92,
        rank: null,
        updatedAt: new Date('2026-06-15T00:00:00.000Z'),
        evidence: [{ eventId: 'ev-1', source: EventSource.GITHUB }],
        trend: {
          activity: 1,
          recentActivity: 1,
          previousActivity: 0,
          sourceDiversity: 1 / 3,
          freshness: 1,
        },
      }

      const findById = vi.fn().mockResolvedValue(mockDetail)
      const service: TopicQueryService = {
        findAll: vi.fn(),
        findById,
        findTrending: vi.fn(),
      }

      const mockResult = {
        topicId: 'topic-alpha',
        summary: 'Topic AI / TypeScript has score 0.88 and growth rate 0.45.',
        whyItMatters: 'Activity level 1',
        evidenceSummary: 'Backed by 1 evidence items',
      }
      const analyze = vi.fn().mockResolvedValue(mockResult)
      const mockAnalyst: AIAnalyst = { analyze }

      const app = express()
      app.use(createTopicRoutes(new TopicController(service, mockAnalyst)))

      const res = await request(app).get('/topics/topic-alpha/analysis')

      expect(res.status).toBe(200)
      expect(res.body).toEqual(mockResult)
      expect(findById).toHaveBeenCalledWith('topic-alpha')
      expect(analyze).toHaveBeenCalledWith({
        topic: {
          id: 'topic-alpha',
          name: 'AI / TypeScript',
          score: 0.88,
          growthRate: 0.45,
          confidence: 0.92,
        },
        rank: null,
        evidence: [{ eventId: 'ev-1', source: EventSource.GITHUB }],
        trend: {
          activity: 1,
          recentActivity: 1,
          previousActivity: 0,
          sourceDiversity: 1 / 3,
          freshness: 1,
        },
      })
    })

    it('executes full topic analysis through GroqAnalystProvider without real network requests', async () => {
      await seed([
        {
          id: 'topic-groq-test',
          name: 'vector-dbs',
          score: 0.95,
          growthRate: 0.8,
          confidence: 0.85,
          updatedAt: new Date('2026-06-15T00:00:00.000Z'),
        },
      ])

      const mockGroqClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      summary: 'Vector databases are surging in developer adoption.',
                      whyItMatters: 'Critical vector retrieval infrastructure for LLMs.',
                      evidenceSummary: 'Demonstrated momentum across GitHub and Reddit.',
                    }),
                  },
                },
              ],
            }),
          },
        },
      } as any

      const groqProvider = new GroqAnalystProvider({
        client: mockGroqClient,
        model: 'llama-3.3-70b-versatile',
      })

      const customDeps = createDependencies({
        client,
        analystProvider: groqProvider,
      })
      const customApp = createApp(customDeps)

      const res = await request(customApp).get('/topics/topic-groq-test/analysis')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        topicId: 'topic-groq-test',
        summary: 'Vector databases are surging in developer adoption.',
        whyItMatters: 'Critical vector retrieval infrastructure for LLMs.',
        evidenceSummary: 'Demonstrated momentum across GitHub and Reddit.',
      })
      expect(mockGroqClient.chat.completions.create).toHaveBeenCalledTimes(1)
    })
  })
})