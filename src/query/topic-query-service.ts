import type {
  TopicQuery,
  TopicSummary,
  TopicDetail,
  TopicEvidence,
  TopicQueryService,
} from '../interfaces/topic-query-service'
import type { QueryResult } from '../interfaces/query-service'
import type { EventSource } from '../types'
import { SQLiteClient } from '../storage/sqlite/sqlite-client'

const DEFAULT_LIMIT = 50
const TRENDING_DEFAULT_LIMIT = 10
const TRENDING_MAX_LIMIT = 100

interface TopicRow {
  id: string
  name: string
  score: number
  growth_rate: number
  confidence: number
  updated_at: string
}

interface EvidenceRow {
  event_id: string
  source: string
}

export class SQLiteTopicQueryService implements TopicQueryService {
  constructor(private readonly client: SQLiteClient) {}

  async findAll(query?: TopicQuery): Promise<QueryResult<TopicSummary>> {
    const limit = query?.limit ?? DEFAULT_LIMIT
    const offset = query?.offset ?? 0

    const { where, params } = buildWhere(query)

    const countRow = this.client.queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM topics${where}`,
      params,
    )

    const rows = this.client.query<TopicRow>(
      `SELECT id, name, score, growth_rate, confidence, updated_at FROM topics${where}
       ORDER BY score DESC, growth_rate DESC, confidence DESC, id ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )

    return {
      items: rows.map(mapTopicSummary),
      total: countRow?.total ?? 0,
      limit,
      offset,
      hasNext: countRow !== undefined && countRow.total > offset + limit,
      hasPrevious: offset > 0,
    }
  }

  async findById(id: string): Promise<TopicDetail | null> {
    const row = this.client.queryOne<TopicRow>('SELECT * FROM topics WHERE id = ?', [id])
    if (!row) return null

    const evidenceRows = this.client.query<EvidenceRow>(
      'SELECT event_id, source FROM topic_evidence WHERE topic_id = ?',
      [id],
    )

    return {
      ...mapTopicSummary(row),
      evidence: evidenceRows.map(mapEvidenceRow),
    }
  }

  async findTrending(limit?: number): Promise<TopicSummary[]> {
    const bounded = Math.min(Math.max(limit ?? TRENDING_DEFAULT_LIMIT, 1), TRENDING_MAX_LIMIT)

    const rows = this.client.query<TopicRow>(
      `SELECT id, name, score, growth_rate, confidence, updated_at FROM topics
       ORDER BY score DESC, growth_rate DESC, confidence DESC, id ASC
       LIMIT ?`,
      [bounded],
    )

    return rows.map(mapTopicSummary)
  }
}

function buildWhere(query?: TopicQuery): { where: string; params: unknown[] } {
  const conditions: string[] = []
  const params: unknown[] = []

  if (query?.minScore !== undefined) {
    conditions.push('score >= ?')
    params.push(query.minScore)
  }

  return {
    where: conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '',
    params,
  }
}

function mapTopicSummary(row: TopicRow): TopicSummary {
  return {
    id: row.id,
    name: row.name,
    score: row.score,
    growthRate: row.growth_rate,
    confidence: row.confidence,
    rank: null,
    updatedAt: new Date(row.updated_at),
  }
}

function mapEvidenceRow(row: EvidenceRow): TopicEvidence {
  return {
    eventId: row.event_id,
    source: row.source as EventSource,
  }
}