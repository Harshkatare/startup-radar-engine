import { SQLiteClient } from '../storage/sqlite/sqlite-client'

interface CountRow {
  count: number
}

interface SourceRow {
  source: string
}

interface DistributionRow {
  name: string
  count: number
}

interface ScoreData {
  categoryScores: Record<string, number>
  technologyScores: Record<string, number>
  keywordScores: Record<string, number>
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

export interface DashboardSummary {
  totalEvents: number
  totalSources: number
  totalCategories: number
  totalTechnologies: number
  averageScore: number
}

export interface DashboardDistribution {
  name: string
  count: number
}

export interface DashboardTopStartup {
  id: string
  source: string
  title: string
  createdAt: string
  categories: string[]
  technologies: string[]
}

export class DashboardService {
  constructor(private readonly client: SQLiteClient) {}

  getSummary(): DashboardSummary {
    const totalEvents = this.getCount('SELECT COUNT(*) AS count FROM events')
    const totalSources = this.getCount('SELECT COUNT(DISTINCT source) AS count FROM events')
    const totalCategories = this.getCount('SELECT COUNT(DISTINCT category) AS count FROM categories')
    const totalTechnologies = this.getCount('SELECT COUNT(DISTINCT technology) AS count FROM technologies')

    const avg = this.computeAverageScore()

    return { totalEvents, totalSources, totalCategories, totalTechnologies, averageScore: avg }
  }

  getCategoryDistribution(): DashboardDistribution[] {
    return this.getDistribution(
      'SELECT category AS name, COUNT(*) AS count FROM categories GROUP BY category ORDER BY count DESC',
    )
  }

  getTechnologyDistribution(): DashboardDistribution[] {
    return this.getDistribution(
      'SELECT technology AS name, COUNT(*) AS count FROM technologies GROUP BY technology ORDER BY count DESC',
    )
  }

  getTopStartups(limit: number): DashboardTopStartup[] {
    const clamped = Math.max(1, Math.min(limit, 100))

    const rows = this.client.query<EventRow>(
      'SELECT * FROM events ORDER BY created_at DESC LIMIT ?',
      [clamped],
    )

    return rows.map((row) => {
      const cats = this.client.query<{ category: string }>(
        'SELECT category FROM categories WHERE event_id = ?', [row.id],
      )
      const techs = this.client.query<{ technology: string }>(
        'SELECT technology FROM technologies WHERE event_id = ?', [row.id],
      )

      return {
        id: row.id,
        source: row.source,
        title: row.title,
        createdAt: row.created_at,
        categories: cats.map((c) => c.category),
        technologies: techs.map((t) => t.technology),
      }
    })
  }

  private getCount(sql: string): number {
    const row = this.client.queryOne<CountRow>(sql)
    return row?.count ?? 0
  }

  private getDistribution(sql: string): DashboardDistribution[] {
    return this.client.query<DistributionRow>(sql)
  }

  private computeAverageScore(): number {
    const rows = this.client.query<{ data: string }>(
      "SELECT data FROM processing_results WHERE type = 'score'",
    )

    if (rows.length === 0) return 0

    const allScores: number[] = []

    for (const row of rows) {
      try {
        const parsed: ScoreData = JSON.parse(row.data)
        for (const map of [parsed.categoryScores, parsed.technologyScores, parsed.keywordScores]) {
          if (map) {
            for (const value of Object.values(map)) {
              if (typeof value === 'number') allScores.push(value)
            }
          }
        }
      } catch {
        continue
      }
    }

    if (allScores.length === 0) return 0

    const sum = allScores.reduce((a, b) => a + b, 0)
    return Math.round((sum / allScores.length) * 10) / 10
  }
}
