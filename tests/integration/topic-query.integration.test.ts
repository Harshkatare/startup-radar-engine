import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { SQLiteClient } from '../../src/storage/sqlite/sqlite-client'
import { SQLiteStorage } from '../../src/storage/sqlite/sqlite-storage'
import { SQLiteTopicRepository } from '../../src/storage/sqlite/sqlite-topic-repository'
import { SQLiteTopicQueryService } from '../../src/query/topic-query-service'
import { EventSource } from '../../src/types'
import type { Topic } from '../../src/types'
import type { TopicEvidence } from '../../src/interfaces/topic-query-service'

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

let client: SQLiteClient
let repository: SQLiteTopicRepository
let queryService: SQLiteTopicQueryService

describe('Topic Query Integration', () => {
  beforeAll(() => {
    client = new SQLiteClient(':memory:')
    client.open()

    const storage = new SQLiteStorage(client)
    storage.runMigrations()

    repository = new SQLiteTopicRepository(client)
    queryService = new SQLiteTopicQueryService(client)
  })

  beforeEach(() => {
    repository.clear()
  })

  afterAll(() => {
    client.close()
  })

  function insertStubEvent(id: string, source: EventSource, createdAt?: string): void {
    client.execute(
      `INSERT OR IGNORE INTO events (id, source, external_id, title, content, metadata, created_at)
       VALUES (?, ?, ?, 'Stub Event', '', '{}', ?)`,
      [id, source, id, createdAt ?? new Date().toISOString()],
    )
  }

  async function seed(
    topics: Topic[],
    evidence: Record<string, TopicEvidence[]>,
    eventDates: Record<string, string> = {},
  ): Promise<void> {
    for (const items of Object.values(evidence)) {
      for (const item of items) {
        insertStubEvent(item.eventId, item.source, eventDates[item.eventId])
      }
    }
    await repository.saveMany(topics)
    for (const [topicId, items] of Object.entries(evidence)) {
      repository.saveTopicEvidence(topicId, items)
    }
  }

  describe('findAll', () => {
    it('returns all topics ordered by score descending', async () => {
      await repository.saveMany([
        makeTopic('topic-a', 0.5, 0.4, 0.3),
        makeTopic('topic-b', 0.9, 0.2, 0.8),
        makeTopic('topic-c', 0.7, 0.6, 0.5),
      ])

      const result = await queryService.findAll()

      expect(result.items.map((item) => item.id)).toEqual(['topic-b', 'topic-c', 'topic-a'])
      expect(result.total).toBe(3)
    })

    it('breaks score ties deterministically: growth rate, then confidence, then id', async () => {
      await repository.saveMany([
        makeTopic('topic-b', 0.8, 0.4, 0.5),
        makeTopic('topic-a', 0.8, 1.2, 0.5),
        makeTopic('topic-d', 0.8, 1.2, 0.9),
        makeTopic('topic-c', 0.8, 1.2, 0.9),
      ])

      const result = await queryService.findAll()

      expect(result.items.map((item) => item.id)).toEqual([
        'topic-c',
        'topic-d',
        'topic-a',
        'topic-b',
      ])
    })

    it('respects the limit', async () => {
      await repository.saveMany([
        makeTopic('topic-a', 0.9, 0.5, 0.5),
        makeTopic('topic-b', 0.8, 0.5, 0.5),
        makeTopic('topic-c', 0.7, 0.5, 0.5),
      ])

      const result = await queryService.findAll({ limit: 2 })

      expect(result.items).toHaveLength(2)
      expect(result.items.map((item) => item.id)).toEqual(['topic-a', 'topic-b'])
      expect(result.hasNext).toBe(true)
    })

    it('respects the offset', async () => {
      await repository.saveMany([
        makeTopic('topic-a', 0.9, 0.5, 0.5),
        makeTopic('topic-b', 0.8, 0.5, 0.5),
        makeTopic('topic-c', 0.7, 0.5, 0.5),
      ])

      const result = await queryService.findAll({ limit: 2, offset: 2 })

      expect(result.items.map((item) => item.id)).toEqual(['topic-c'])
      expect(result.hasPrevious).toBe(true)
      expect(result.hasNext).toBe(false)
    })

    it('returns an empty result when no topics exist', async () => {
      const result = await queryService.findAll()

      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
      expect(result.hasNext).toBe(false)
      expect(result.hasPrevious).toBe(false)
    })

    it('filters by minimum score', async () => {
      await repository.saveMany([
        makeTopic('topic-a', 0.9, 0.5, 0.5),
        makeTopic('topic-b', 0.6, 0.5, 0.5),
        makeTopic('topic-c', 0.4, 0.5, 0.5),
      ])

      const result = await queryService.findAll({ minScore: 0.6 })

      expect(result.items.map((item) => item.id)).toEqual(['topic-a', 'topic-b'])
      expect(result.total).toBe(2)
    })

    it('returns rank null since ranking is not persisted', async () => {
      await repository.saveMany([makeTopic('topic-a', 0.9, 0.5, 0.5)])

      const result = await queryService.findAll()

      expect(result.items[0].rank).toBeNull()
    })
  })

  describe('findById', () => {
    it('returns the persisted topic with evidence and trend metrics', async () => {
      await seed(
        [makeTopic('topic-1', 1, 0.5, 0.5)],
        {
          'topic-1': [
            { eventId: 'event-1', source: EventSource.GITHUB },
            { eventId: 'event-2', source: EventSource.REDDIT },
          ],
        },
        {
          'event-1': '2026-06-12T00:00:00.000Z', // 3 days before updatedAt -> recent
          'event-2': '2026-06-05T00:00:00.000Z', // 10 days before updatedAt -> previous
        },
      )

      const detail = await queryService.findById('topic-1')

      expect(detail).not.toBeNull()
      expect(detail?.id).toBe('topic-1')
      expect(detail?.name).toBe('Topic topic-1')
      expect(detail?.score).toBe(1)
      expect(detail?.rank).toBeNull()
      expect(detail?.evidence).toEqual([
        { eventId: 'event-1', source: EventSource.GITHUB },
        { eventId: 'event-2', source: EventSource.REDDIT },
      ])
      expect(detail?.trend).toEqual({
        activity: 2,
        recentActivity: 1,
        previousActivity: 1,
        sourceDiversity: 2 / 3,
        freshness: 0.5,
      })
    })

    it('returns null for a missing topic', async () => {
      expect(await queryService.findById('does-not-exist')).toBeNull()
    })

    it('returns empty evidence and zeroed trend for a topic without evidence', async () => {
      await repository.saveMany([makeTopic('topic-1', 1, 0.5, 0.5)])

      const detail = await queryService.findById('topic-1')

      expect(detail?.evidence).toEqual([])
      expect(detail?.trend).toEqual({
        activity: 0,
        recentActivity: 0,
        previousActivity: 0,
        sourceDiversity: 0,
        freshness: 0,
      })
    })
  })

  describe('findTrending', () => {
    it('returns topics ordered by persisted score with a default limit of 10', async () => {
      const topics = Array.from({ length: 12 }, (_, index) =>
        makeTopic(`topic-${String(index).padStart(2, '0')}`, 1 - index / 20, 0.5, 0.5),
      )
      await repository.saveMany(topics)

      const trending = await queryService.findTrending()

      expect(trending).toHaveLength(10)
      expect(trending.map((item) => item.id)).toEqual(topics.map((t) => t.id).slice(0, 10))
    })

    it('respects the requested limit and caps it at 100', async () => {
      const topics = Array.from({ length: 3 }, (_, index) =>
        makeTopic(`topic-${index}`, 1 - index / 10, 0.5, 0.5),
      )
      await repository.saveMany(topics)

      expect(await queryService.findTrending(2)).toHaveLength(2)
      expect(await queryService.findTrending(1000)).toHaveLength(3)
    })

    it('returns an empty array when no topics exist', async () => {
      expect(await queryService.findTrending()).toEqual([])
    })
  })
})