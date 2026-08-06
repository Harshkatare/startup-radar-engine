import type { Event } from '../types'
import type { StartupQuery, QueryResult, QueryService } from '../interfaces/query-service'
import { SQLiteClient } from '../storage/sqlite/sqlite-client'

interface EventRow {
  id: string
  source: string
  external_id: string
  title: string
  content: string
  metadata: string
  created_at: string
}

export class SQLiteQueryService implements QueryService {
  constructor(private readonly client: SQLiteClient) {}

  async findEvents(query: StartupQuery): Promise<QueryResult<Event>> {
    const limit = query.limit ?? 50
    const offset = query.offset ?? 0

    const { clauses, params } = buildWhereClauses(query)
    const joins = buildJoins(query)

    const countSql = `SELECT COUNT(DISTINCT e.id) AS total FROM events e${joins}${clauses}`
    const countRow = this.client.queryOne<{ total: number }>(countSql, params)

    const dataSql = `SELECT DISTINCT e.id, e.source, e.external_id, e.title, e.content, e.metadata, e.created_at FROM events e${joins}${clauses} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`
    const rows = this.client.query<EventRow>(dataSql, [...params, limit, offset])

    return {
      items: rows.map(mapEventRow),
      total: countRow?.total ?? 0,
      limit,
      offset,
    }
  }
}

function buildJoins(query: StartupQuery): string {
  const parts: string[] = []

  if (query.categories && query.categories.length > 0) {
    parts.push('INNER JOIN categories c ON c.event_id = e.id')
  }
  if (query.technologies && query.technologies.length > 0) {
    parts.push('INNER JOIN technologies t ON t.event_id = e.id')
  }
  if (query.keywords && query.keywords.length > 0) {
    parts.push('INNER JOIN keywords k ON k.event_id = e.id')
  }

  return parts.length > 0 ? ' ' + parts.join(' ') : ''
}

function buildWhereClauses(query: StartupQuery): { clauses: string; params: unknown[] } {
  const conditions: string[] = []
  const params: unknown[] = []

  if (query.source) {
    conditions.push('e.source = ?')
    params.push(query.source)
  }

  if (query.categories && query.categories.length > 0) {
    const placeholders = query.categories.map(() => '?').join(', ')
    conditions.push(`c.category IN (${placeholders})`)
    params.push(...query.categories)
  }

  if (query.technologies && query.technologies.length > 0) {
    const placeholders = query.technologies.map(() => '?').join(', ')
    conditions.push(`t.technology IN (${placeholders})`)
    params.push(...query.technologies)
  }

  if (query.keywords && query.keywords.length > 0) {
    const placeholders = query.keywords.map(() => '?').join(', ')
    conditions.push(`k.keyword IN (${placeholders})`)
    params.push(...query.keywords)
  }

  return {
    clauses: conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '',
    params,
  }
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
