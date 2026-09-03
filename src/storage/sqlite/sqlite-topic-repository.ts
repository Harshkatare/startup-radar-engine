import type { Topic } from '../../types'
import type { TopicEvidence } from '../../processing/topics/topic-result'
import type { TopicRepository } from '../../interfaces'
import { SQLiteClient } from './sqlite-client'

export class SQLiteTopicRepository implements TopicRepository {
  constructor(private readonly client: SQLiteClient) {}

  async save(topic: Topic): Promise<void> {
    this.client.execute(
      `INSERT OR REPLACE INTO topics (id, name, score, growth_rate, confidence, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        topic.id,
        topic.name,
        topic.score,
        topic.growthRate,
        topic.confidence,
        topic.updatedAt.toISOString(),
      ],
    )
  }

  async saveMany(topics: Topic[]): Promise<void> {
    for (const topic of topics) {
      await this.save(topic)
    }
  }

  async findById(id: string): Promise<Topic | null> {
    const row = this.client.queryOne<TopicRow>('SELECT * FROM topics WHERE id = ?', [id])
    if (!row) return null
    return mapTopicRow(row)
  }

  async findAll(): Promise<Topic[]> {
    const rows = this.client.query<TopicRow>('SELECT * FROM topics')
    return rows.map(mapTopicRow)
  }

  async delete(id: string): Promise<void> {
    this.client.execute('DELETE FROM topic_evidence WHERE topic_id = ?', [id])
    this.client.execute('DELETE FROM topics WHERE id = ?', [id])
  }

  async clear(): Promise<void> {
    this.client.execute('DELETE FROM topic_evidence')
    this.client.execute('DELETE FROM topics')
  }

  saveTopicEvidence(topicId: string, evidence: TopicEvidence[]): void {
    this.client.execute('DELETE FROM topic_evidence WHERE topic_id = ?', [topicId])
    for (const item of evidence) {
      this.client.execute(
        `INSERT OR IGNORE INTO topic_evidence (topic_id, event_id, source) VALUES (?, ?, ?)`,
        [topicId, item.eventId, item.source],
      )
    }
  }
}

interface TopicRow {
  id: string
  name: string
  score: number
  growth_rate: number
  confidence: number
  updated_at: string
}

function mapTopicRow(row: TopicRow): Topic {
  return {
    id: row.id,
    name: row.name,
    score: row.score,
    growthRate: row.growth_rate,
    confidence: row.confidence,
    updatedAt: new Date(row.updated_at),
  }
}