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
import { TopicPersistenceService } from '../../src/services/topic-persistence-service'
import { createProcessingStatistics } from '../../src/processing/processing-statistics'
import { createClassificationResult } from '../../src/processing/classification/classification-result'
import { createAggregationResult } from '../../src/processing/aggregation/aggregation-result'
import { createScoreResult } from '../../src/processing/scoring/score-result'
import { createTopicResult } from '../../src/processing/topics/topic-result'
import { EventSource } from '../../src/types'
import type { Event, Topic } from '../../src/types'
import type { Topic as ProcessingTopic } from '../../src/processing/topics/topic-result'
import type { ProcessingContext } from '../../src/processing/processing-context'
import sampleData from '../fixtures/sample-events.json'

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

function makeContext(events: Event[], topics: ProcessingTopic[]): ProcessingContext {
  return {
    events,
    source: EventSource.GITHUB,
    startedAt: new Date(),
    statistics: createProcessingStatistics(),
    classification: createClassificationResult(),
    aggregation: createAggregationResult(),
    score: createScoreResult(),
    topics: { topics },
  }
}

function insertStubEvent(id: string): void {
  client.execute(
    `INSERT OR IGNORE INTO events (id, source, external_id, title, content, metadata, created_at)
     VALUES (?, 'github', ?, 'Stub Event', '', '{}', datetime('now'))`,
    [id, id],
  )
}

let client: SQLiteClient

describe('Topic Persistence Integration', () => {
  let storage: SQLiteStorage
  let topicRepository: SQLiteTopicRepository
  let service: TopicPersistenceService

  beforeAll(() => {
    client = new SQLiteClient(':memory:')
    client.open()

    storage = new SQLiteStorage(client)
    storage.runMigrations()

    topicRepository = new SQLiteTopicRepository(client)
    service = new TopicPersistenceService(topicRepository)
  })

  beforeEach(() => {
    storage.clear()
  })

  afterAll(() => {
    client.close()
  })

  describe('SQLite TopicRepository', () => {
    it('saves a topic and finds it by id', async () => {
      const topic: Topic = {
        id: 'topic-abc',
        name: 'AI / Python',
        score: 0,
        growthRate: 0,
        confidence: 0,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }

      await topicRepository.save(topic)

      expect(await topicRepository.findById('topic-abc')).toEqual(topic)
    })

    it('saves many topics and finds them all', async () => {
      const topics: Topic[] = [
        {
          id: 'topic-1',
          name: 'AI / Python',
          score: 0,
          growthRate: 0,
          confidence: 0,
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          id: 'topic-2',
          name: 'Rust / Quantum',
          score: 0,
          growthRate: 0,
          confidence: 0,
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]

      await topicRepository.saveMany(topics)

      expect(await topicRepository.findAll()).toHaveLength(2)
      expect(await topicRepository.findById('topic-2')).toEqual(topics[1])
    })

    it('replaces an existing topic on second save (no duplicate records)', async () => {
      await topicRepository.save({
        id: 'topic-repeat',
        name: 'Old Name',
        score: 0,
        growthRate: 0,
        confidence: 0,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })
      await topicRepository.save({
        id: 'topic-repeat',
        name: 'New Name',
        score: 0.5,
        growthRate: 0.2,
        confidence: 0.8,
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
      })

      const topic = await topicRepository.findById('topic-repeat')
      expect(topic).not.toBeNull()
      expect(topic!.name).toBe('New Name')
      expect(topic!.score).toBe(0.5)
      expect(topic!.growthRate).toBe(0.2)
      expect(topic!.confidence).toBe(0.8)

      const rows = client.query<TopicRow>('SELECT * FROM topics WHERE id = ?', ['topic-repeat'])
      expect(rows).toHaveLength(1)
    })

    it('deletes a topic', async () => {
      await topicRepository.save(createStubTopic('topic-del'))

      await topicRepository.delete('topic-del')

      expect(await topicRepository.findById('topic-del')).toBeNull()
    })

    it('clears all topics', async () => {
      await topicRepository.saveMany([createStubTopic('topic-clear-1'), createStubTopic('topic-clear-2')])

      await topicRepository.clear()

      expect(await topicRepository.findAll()).toHaveLength(0)
    })
  })

  describe('Evidence persistence', () => {
    it('persists evidence rows for a topic', () => {
      insertStubEvent('evt-a')
      insertStubEvent('evt-b')
      const topicId = 'topic-evidence'
      topicRepository.save(createStubTopic(topicId))
      topicRepository.saveTopicEvidence(topicId, [
        { eventId: 'evt-a', source: EventSource.GITHUB },
        { eventId: 'evt-b', source: EventSource.REDDIT },
      ])

      const rows = client.query<EvidenceRow>(
        'SELECT * FROM topic_evidence WHERE topic_id = ?',
        [topicId],
      )
      expect(rows).toHaveLength(2)
      expect(rows.map((r) => r.event_id).sort()).toEqual(['evt-a', 'evt-b'])
    })

    it('prevents duplicate evidence for the same topic + event', () => {
      insertStubEvent('evt-a')
      const topicId = 'topic-dedupe'
      topicRepository.save(createStubTopic(topicId))
      topicRepository.saveTopicEvidence(topicId, [{ eventId: 'evt-a', source: EventSource.GITHUB }])
      topicRepository.saveTopicEvidence(topicId, [{ eventId: 'evt-a', source: EventSource.GITHUB }])

      const rows = client.query<EvidenceRow>(
        'SELECT * FROM topic_evidence WHERE topic_id = ?',
        [topicId],
      )
      expect(rows).toHaveLength(1)
    })

    it('replaces evidence on refresh (idempotent update)', () => {
      insertStubEvent('evt-a')
      insertStubEvent('evt-b')
      insertStubEvent('evt-c')
      const topicId = 'topic-refresh'
      topicRepository.save(createStubTopic(topicId))
      topicRepository.saveTopicEvidence(topicId, [
        { eventId: 'evt-a', source: EventSource.GITHUB },
        { eventId: 'evt-b', source: EventSource.GITHUB },
      ])
      topicRepository.saveTopicEvidence(topicId, [{ eventId: 'evt-c', source: EventSource.REDDIT }])

      const rows = client.query<EvidenceRow>(
        'SELECT * FROM topic_evidence WHERE topic_id = ?',
        [topicId],
      )
      expect(rows).toHaveLength(1)
      expect(rows[0].event_id).toBe('evt-c')
      expect(rows[0].source).toBe(EventSource.REDDIT)
    })

    it('deleting a topic removes its evidence', () => {
      insertStubEvent('evt-a')
      const topicId = 'topic-cascade'
      topicRepository.save(createStubTopic(topicId))
      topicRepository.saveTopicEvidence(topicId, [{ eventId: 'evt-a', source: EventSource.GITHUB }])

      topicRepository.delete(topicId)

      const rows = client.query<EvidenceRow>(
        'SELECT * FROM topic_evidence WHERE topic_id = ?',
        [topicId],
      )
      expect(rows).toHaveLength(0)
    })
  })

  describe('TopicPersistenceService', () => {
    it('maps processing topics to persisted placeholders', async () => {
      insertStubEvent('evt-a')
      const processingTopics: ProcessingTopic[] = [
        {
          id: 'topic-svc-1',
          name: 'AI / Python / agents',
          categories: ['AI'],
          technologies: ['Python'],
          keywords: ['agents'],
          evidence: [{ eventId: 'evt-a', source: EventSource.GITHUB }],
        },
      ]

      await service.persist(makeContext([], processingTopics))

      const topic = await topicRepository.findById('topic-svc-1')
      expect(topic).not.toBeNull()
      expect(topic!.name).toBe('AI / Python / agents')
      expect(topic!.score).toBe(0)
      expect(topic!.growthRate).toBe(0)
      expect(topic!.confidence).toBe(0)
      expect(topic!.updatedAt).toBeInstanceOf(Date)

      const evidence = client.query<EvidenceRow>(
        'SELECT * FROM topic_evidence WHERE topic_id = ?',
        ['topic-svc-1'],
      )
      expect(evidence).toHaveLength(1)
      expect(evidence[0].event_id).toBe('evt-a')
      expect(evidence[0].source).toBe(EventSource.GITHUB)
    })

    it('is a no-op when no topics were generated', async () => {
      await service.persist(makeContext([], []))

      const rows = client.query<TopicRow>('SELECT * FROM topics')
      expect(rows).toHaveLength(0)
    })

    it('is idempotent across runs (same topic persisted twice → one record)', async () => {
      insertStubEvent('evt-b')
      const processingTopics: ProcessingTopic[] = [
        {
          id: 'topic-idem',
          name: 'Rust / Simulator',
          categories: [],
          technologies: ['Rust'],
          keywords: ['simulator'],
          evidence: [{ eventId: 'evt-b', source: EventSource.HACKER_NEWS }],
        },
      ]

      await service.persist(makeContext([], processingTopics))
      await service.persist(makeContext([], processingTopics))

      const rows = client.query<TopicRow>('SELECT * FROM topics WHERE id = ?', ['topic-idem'])
      expect(rows).toHaveLength(1)

      const evidence = client.query<EvidenceRow>(
        'SELECT * FROM topic_evidence WHERE topic_id = ?',
        ['topic-idem'],
      )
      expect(evidence).toHaveLength(1)
    })
  })

  describe('Full pipeline integration', () => {
    it('persists generated topics after a complete processing run', async () => {
      const pipeline = new ProcessingPipeline([storage, new TopicPersistenceService(topicRepository)])
      pipeline.register(new CleaningProcessor())
      pipeline.register(new ClassificationProcessor())
      pipeline.register(new AggregationProcessor())
      pipeline.register(new ScoringProcessor())
      pipeline.register(new TopicBuilderProcessor())

      const events = sampleData.map(mapFixtureEvent)
      const result = await pipeline.run(makeContext(events, []))

      expect(result.topics.topics.length).toBeGreaterThan(0)

      const persistedTopics = await topicRepository.findAll()
      expect(persistedTopics.length).toBe(result.topics.topics.length)
      for (const topic of persistedTopics) {
        expect(topic.score).toBe(0)
        expect(topic.growthRate).toBe(0)
        expect(topic.confidence).toBe(0)
      }

      const evidence = client.query<EvidenceRow>('SELECT * FROM topic_evidence')
      const evidenceCount = result.topics.topics.reduce((sum, t) => sum + t.evidence.length, 0)
      expect(evidence.length).toBe(evidenceCount)

      const persistedEvents = client.query('SELECT COUNT(*) AS cnt FROM events')
      expect(persistedEvents[0].cnt).toBeGreaterThan(0)
    })

    it('does not duplicate topics when the pipeline runs twice', async () => {
      const pipeline = new ProcessingPipeline([storage, new TopicPersistenceService(topicRepository)])
      pipeline.register(new CleaningProcessor())
      pipeline.register(new ClassificationProcessor())
      pipeline.register(new AggregationProcessor())
      pipeline.register(new ScoringProcessor())
      pipeline.register(new TopicBuilderProcessor())

      const events = sampleData.map(mapFixtureEvent)
      const first = await pipeline.run(makeContext(events, []))
      const second = await pipeline.run(makeContext(events, []))

      expect(first.topics.topics).toEqual(second.topics.topics)

      const rows = client.query<TopicRow>('SELECT COUNT(*) AS cnt FROM topics')
      expect(rows[0].cnt).toBe(first.topics.topics.length)
    })
  })
})

function createStubTopic(id: string): Topic {
  return {
    id,
    name: id,
    score: 0,
    growthRate: 0,
    confidence: 0,
    updatedAt: new Date(),
  }
}