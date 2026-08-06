import type { Event } from '../../types'
import type { ClassificationResult } from '../../processing/classification/classification-result'
import type { AggregationResult } from '../../processing/aggregation/aggregation-result'
import type { ScoreResult } from '../../processing/scoring/score-result'
import type { EventRepository, Persister } from '../../interfaces'
import type { ProcessingContext } from '../../processing/processing-context'
import { SQLiteClient } from './sqlite-client'

export class SQLiteStorage implements EventRepository, Persister {
  constructor(private readonly client: SQLiteClient) {}

  runMigrations(): void {
    const statements = [
      `CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        external_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        UNIQUE(source, external_id)
      )`,
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL REFERENCES events(id),
        category TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS technologies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL REFERENCES events(id),
        technology TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS keywords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL REFERENCES events(id),
        keyword TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS processing_results (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
    ]

    for (const sql of statements) {
      this.client.execute(sql)
    }
  }

  async persist(context: ProcessingContext): Promise<void> {
    this.client.transaction(() => {
      for (const event of context.events) {
        this.client.execute(
          `INSERT OR REPLACE INTO events (id, source, external_id, title, content, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            event.id,
            event.source,
            event.externalId,
            event.title,
            event.content,
            JSON.stringify(event.metadata),
            event.createdAt.toISOString(),
          ],
        )
      }

      this.client.execute(
        `INSERT OR IGNORE INTO events (id, source, external_id, title, content, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['__global__', 'system', '__global__', 'Global Classification', '', '{}', new Date().toISOString()],
      )

      this.saveClassification('__global__', context.classification)
      this.saveAggregation(context.aggregation)
      this.saveScore(context.score)
    })
  }

  async save(event: Event): Promise<void> {
    this.client.execute(
      `INSERT OR REPLACE INTO events (id, source, external_id, title, content, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.source,
        event.externalId,
        event.title,
        event.content,
        JSON.stringify(event.metadata),
        event.createdAt.toISOString(),
      ],
    )
  }

  async saveMany(events: Event[]): Promise<void> {
    for (const event of events) {
      await this.save(event)
    }
  }

  async findById(id: string): Promise<Event | null> {
    const row = this.client.queryOne<EventRow>('SELECT * FROM events WHERE id = ?', [id])
    if (!row) return null
    return mapEventRow(row)
  }

  async findBySource(source: string): Promise<Event[]> {
    const rows = this.client.query<EventRow>('SELECT * FROM events WHERE source = ?', [source])
    return rows.map(mapEventRow)
  }

  async findAll(): Promise<Event[]> {
    const rows = this.client.query<EventRow>('SELECT * FROM events')
    return rows.map(mapEventRow)
  }

  async delete(id: string): Promise<void> {
    this.client.execute('DELETE FROM categories WHERE event_id = ?', [id])
    this.client.execute('DELETE FROM technologies WHERE event_id = ?', [id])
    this.client.execute('DELETE FROM keywords WHERE event_id = ?', [id])
    this.client.execute('DELETE FROM events WHERE id = ?', [id])
  }

  async clear(): Promise<void> {
    this.client.execute('DELETE FROM keywords')
    this.client.execute('DELETE FROM technologies')
    this.client.execute('DELETE FROM categories')
    this.client.execute('DELETE FROM processing_results')
    this.client.execute('DELETE FROM events')
  }

  saveClassification(eventId: string, classification: ClassificationResult): void {
    this.client.execute('DELETE FROM categories WHERE event_id = ?', [eventId])
    for (const cat of classification.categories) {
      this.client.execute('INSERT INTO categories (event_id, category) VALUES (?, ?)', [eventId, cat])
    }

    this.client.execute('DELETE FROM technologies WHERE event_id = ?', [eventId])
    for (const tech of classification.technologies) {
      this.client.execute('INSERT INTO technologies (event_id, technology) VALUES (?, ?)', [eventId, tech])
    }

    this.client.execute('DELETE FROM keywords WHERE event_id = ?', [eventId])
    for (const kw of classification.keywords) {
      this.client.execute('INSERT INTO keywords (event_id, keyword) VALUES (?, ?)', [eventId, kw])
    }
  }

  saveAggregation(aggregation: AggregationResult): void {
    this.client.execute(
      `INSERT OR REPLACE INTO processing_results (id, type, data, created_at)
       VALUES ('aggregation', 'aggregation', ?, ?)`,
      [JSON.stringify(aggregation), new Date().toISOString()],
    )
  }

  saveScore(score: ScoreResult): void {
    this.client.execute(
      `INSERT OR REPLACE INTO processing_results (id, type, data, created_at)
       VALUES ('score', 'score', ?, ?)`,
      [JSON.stringify(score), new Date().toISOString()],
    )
  }
}

interface EventRow {
  id: string
  source: string
  external_id: string
  title: string
  content: string
  metadata: string
  created_at: string
}

function mapEventRow(row: EventRow): Event {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    title: row.title,
    content: row.content,
    metadata: JSON.parse(row.metadata),
    createdAt: new Date(row.created_at),
  }
}
