import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SQLiteClient } from '../../src/storage/sqlite/sqlite-client'
import { SQLiteStorage } from '../../src/storage/sqlite/sqlite-storage'
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
import type { Event } from '../../src/types'
import type { ProcessingContext } from '../../src/processing/processing-context'
import sampleData from '../fixtures/sample-events.json'

interface EventRow {
  id: string
  source: string
  external_id: string
  title: string
  content: string
  metadata: string
  created_at: string
}

interface CategoryRow {
  id: number
  event_id: string
  category: string
}

interface TechnologyRow {
  id: number
  event_id: string
  technology: string
}

interface KeywordRow {
  id: number
  event_id: string
  keyword: string
}

interface ProcessingResultRow {
  id: string
  type: string
  data: string
  created_at: string
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

describe('Processing Integration', () => {
  let client: SQLiteClient
  let storage: SQLiteStorage
  let pipeline: ProcessingPipeline

  beforeAll(() => {
    client = new SQLiteClient(':memory:')
    client.open()

    storage = new SQLiteStorage(client)
    storage.runMigrations()

    pipeline = new ProcessingPipeline(storage)
    pipeline.register(new CleaningProcessor())
    pipeline.register(new ClassificationProcessor())
    pipeline.register(new AggregationProcessor())
    pipeline.register(new ScoringProcessor())
  })

  afterAll(() => {
    client.close()
  })

  it('completes the full processing workflow', async () => {
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

    const result = await pipeline.run(context)

    expect(result.statistics.whitespaceTrimmed).toBeGreaterThanOrEqual(0)
    expect(result.statistics.duplicatesRemoved).toBeGreaterThanOrEqual(0)
    expect(result.statistics.urlsNormalized).toBeGreaterThanOrEqual(0)
    expect(result.statistics.metadataEntriesRemoved).toBeGreaterThanOrEqual(0)
  })

  it('persists events to the database', async () => {
    const row = client.queryOne<EventRow>('SELECT * FROM events WHERE id = ?', ['evt-001'])
    expect(row).not.toBeNull()
    expect(row!.source).toBe('github')
    expect(row!.external_id).toBe('repo-123')
    expect(row!.title).toBe('New AI-powered code assistant launched')
  })

  it('persists all sample events', async () => {
    const rows = client.query<EventRow>('SELECT COUNT(*) AS cnt FROM events')
    expect(rows[0].cnt).toBe(9)
  })

  it('populates categories table', async () => {
    const rows = client.query<CategoryRow>('SELECT DISTINCT category FROM categories')
    expect(rows.length).toBeGreaterThan(0)
  })

  it('populates technologies table', async () => {
    const rows = client.query<TechnologyRow>('SELECT DISTINCT technology FROM technologies')
    expect(rows.length).toBeGreaterThan(0)
  })

  it('populates keywords table', async () => {
    const rows = client.query<KeywordRow>('SELECT DISTINCT keyword FROM keywords')
    expect(rows.length).toBeGreaterThan(0)
  })

  it('persists aggregation results', async () => {
    const row = client.queryOne<ProcessingResultRow>(
      "SELECT * FROM processing_results WHERE id = 'aggregation'",
    )
    expect(row).not.toBeNull()
    expect(row!.type).toBe('aggregation')

    const data = JSON.parse(row!.data)
    expect(data).toHaveProperty('categoryCounts')
    expect(data).toHaveProperty('technologyCounts')
    expect(data).toHaveProperty('keywordCounts')
  })

  it('persists score results', async () => {
    const row = client.queryOne<ProcessingResultRow>(
      "SELECT * FROM processing_results WHERE id = 'score'",
    )
    expect(row).not.toBeNull()
    expect(row!.type).toBe('score')

    const data = JSON.parse(row!.data)
    expect(data).toHaveProperty('categoryScores')
    expect(data).toHaveProperty('technologyScores')
    expect(data).toHaveProperty('keywordScores')
  })

  describe('saveClassification regression', () => {
    beforeAll(() => {
      client.execute("INSERT OR IGNORE INTO events (id,source,external_id,title,content,metadata,created_at) VALUES ('reg-test','system','reg-test','Regression Test','','{}',datetime('now'))")
      storage.saveClassification('reg-test', {
        categories: ['AI', 'Cloud'],
        technologies: ['Rust', 'TypeScript'],
        keywords: ['test', 'regression'],
      })
      storage.saveAggregation({
        categoryCounts: { AI: 1, Cloud: 2 },
        technologyCounts: { Rust: 1, TypeScript: 2 },
        keywordCounts: { test: 1, regression: 2 },
      })
      storage.saveScore({
        categoryScores: { AI: 0.9, Cloud: 0.8 },
        technologyScores: { Rust: 0.7, TypeScript: 0.6 },
        keywordScores: { test: 0.5, regression: 0.4 },
      })
    })

    it('persists categories for the given event_id', () => {
      const rows = client.query<CategoryRow>(
        "SELECT category FROM categories WHERE event_id = 'reg-test'",
      )
      expect(rows.length).toBe(2)
      const cats = rows.map((r) => r.category).sort()
      expect(cats).toEqual(['AI', 'Cloud'])
    })

    it('persists technologies for the given event_id', () => {
      const rows = client.query<TechnologyRow>(
        "SELECT technology FROM technologies WHERE event_id = 'reg-test'",
      )
      expect(rows.length).toBe(2)
      const techs = rows.map((r) => r.technology).sort()
      expect(techs).toEqual(['Rust', 'TypeScript'])
    })

    it('persists keywords for the given event_id', () => {
      const rows = client.query<KeywordRow>(
        "SELECT keyword FROM keywords WHERE event_id = 'reg-test'",
      )
      expect(rows.length).toBe(2)
      const kws = rows.map((r) => r.keyword).sort()
      expect(kws).toEqual(['regression', 'test'])
    })

    it('replaces previous classification on second call', () => {
      client.execute("INSERT OR IGNORE INTO events (id,source,external_id,title,content,metadata,created_at) VALUES ('reg-test-2','system','reg-test-2','Second','','{}',datetime('now'))")

      storage.saveClassification('reg-test', {
        categories: ['Security'],
        technologies: ['Go'],
        keywords: ['vuln'],
      })

      const cats = client.query<CategoryRow>(
        "SELECT category FROM categories WHERE event_id = 'reg-test'",
      )
      expect(cats.length).toBe(1)
      expect(cats[0].category).toBe('Security')

      const techs = client.query<TechnologyRow>(
        "SELECT technology FROM technologies WHERE event_id = 'reg-test'",
      )
      expect(techs.length).toBe(1)
      expect(techs[0].technology).toBe('Go')

      const kws = client.query<KeywordRow>(
        "SELECT keyword FROM keywords WHERE event_id = 'reg-test'",
      )
      expect(kws.length).toBe(1)
      expect(kws[0].keyword).toBe('vuln')
    })

    it('persists aggregation data via saveAggregation', () => {
      const row = client.queryOne<ProcessingResultRow>(
        "SELECT * FROM processing_results WHERE id = 'aggregation'",
      )
      expect(row).not.toBeNull()
      const data = JSON.parse(row!.data)
      expect(data.categoryCounts).toEqual({ AI: 1, Cloud: 2 })
    })

    it('persists score data via saveScore', () => {
      const row = client.queryOne<ProcessingResultRow>(
        "SELECT * FROM processing_results WHERE id = 'score'",
      )
      expect(row).not.toBeNull()
      const data = JSON.parse(row!.data)
      expect(data.categoryScores).toEqual({ AI: 0.9, Cloud: 0.8 })
    })
  })
})
