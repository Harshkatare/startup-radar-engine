import type {
  TopicQuery,
  TopicSummary,
  TopicDetail,
  TopicDetailTrend,
  TopicEvidence,
  TopicQueryService,
} from '../interfaces/topic-query-service'
import type { QueryResult } from '../interfaces/query-service'
import { EventSource } from '../types'
import { SQLiteClient } from '../storage/sqlite/sqlite-client'

const DEFAULT_LIMIT = 50
const TRENDING_DEFAULT_LIMIT = 10
const TRENDING_MAX_LIMIT = 100
const DAY_MS = 24 * 60 * 60 * 1000

interface TopicRow {
  id: string
  name: string
  score: number
  growth_rate: number
  confidence: number
  updated_at: string
}

interface EvidenceWithEventRow {
  event_id: string
  source: string
  created_at: string | null
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

    const evidenceRows = this.client.query<EvidenceWithEventRow>(
      `SELECT te.event_id, te.source, e.created_at
       FROM topic_evidence te
       LEFT JOIN events e ON te.event_id = e.id
       WHERE te.topic_id = ?`,
      [id],
    )

    const updatedAtTime = new Date(row.updated_at).getTime()
    const trend = computeTopicDetailTrend(evidenceRows, updatedAtTime)

    return {
      ...mapTopicSummary(row),
      evidence: evidenceRows.map(mapEvidenceRow),
      trend,
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

function mapEvidenceRow(row: EvidenceWithEventRow): TopicEvidence {
  return {
    eventId: row.event_id,
    source: row.source as EventSource,
  }
}

function computeTopicDetailTrend(
  evidenceRows: EvidenceWithEventRow[],
  updatedAtTime: number,
): TopicDetailTrend {
  const activity = evidenceRows.length
  let recentActivity = 0
  let previousActivity = 0
  const sources = new Set<string>()

  for (const row of evidenceRows) {
    sources.add(row.source)
    if (row.created_at) {
      const time = new Date(row.created_at).getTime()
      if (!isNaN(time)) {
        if (time >= updatedAtTime - 7 * DAY_MS && time <= updatedAtTime) {
          recentActivity++
        } else if (time >= updatedAtTime - 14 * DAY_MS && time < updatedAtTime - 7 * DAY_MS) {
          previousActivity++
        }
      }
    }
  }

  const supportedSources = Object.values(EventSource).length
  const sourceDiversity = supportedSources > 0 ? sources.size / supportedSources : 0
  const freshness = activity > 0 ? recentActivity / activity : 0

  return {
    activity,
    recentActivity,
    previousActivity,
    sourceDiversity,
    freshness,
  }
}