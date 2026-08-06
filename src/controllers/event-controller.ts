import type { Request, Response, NextFunction } from 'express'
import type { QueryService, SortBy, SortOrder } from '../interfaces/query-service'

const VALID_SORT_BY = new Set(['publishedAt', 'createdAt'])
const VALID_SORT_ORDER = new Set(['asc', 'desc'])
const DEFAULT_LIMIT = 50

export class EventController {
  constructor(private readonly queryService: QueryService) {}

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT
      const offset = parseInt(req.query.offset as string, 10) || 0

      if (limit <= 0 || offset < 0) {
        res.status(400).json({ error: 'Invalid pagination parameters' })
        return
      }

      const sortBy = req.query.sortBy as string | undefined
      const sortOrder = req.query.sortOrder as string | undefined

      if (sortBy && !VALID_SORT_BY.has(sortBy)) {
        res.status(400).json({ error: `Invalid sortBy: ${sortBy}` })
        return
      }

      if (sortOrder && !VALID_SORT_ORDER.has(sortOrder)) {
        res.status(400).json({ error: `Invalid sortOrder: ${sortOrder}` })
        return
      }

      const minScore = req.query.minScore ? parseInt(req.query.minScore as string, 10) : undefined
      const maxScore = req.query.maxScore ? parseInt(req.query.maxScore as string, 10) : undefined

      if (minScore !== undefined && isNaN(minScore)) {
        res.status(400).json({ error: 'Invalid minScore' })
        return
      }
      if (maxScore !== undefined && isNaN(maxScore)) {
        res.status(400).json({ error: 'Invalid maxScore' })
        return
      }

      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined

      if (fromDate !== undefined && isNaN(fromDate.getTime())) {
        res.status(400).json({ error: 'Invalid fromDate' })
        return
      }
      if (toDate !== undefined && isNaN(toDate.getTime())) {
        res.status(400).json({ error: 'Invalid toDate' })
        return
      }

      const result = await this.queryService.findEvents({
        source: req.query.source as string | undefined,
        categories: toArray(req.query.category, true),
        technologies: toArray(req.query.technology, true),
        keywords: toArray(req.query.keyword, true),
        minScore,
        maxScore,
        fromDate,
        toDate,
        sortBy: sortBy as SortBy | undefined,
        sortOrder: sortOrder as SortOrder | undefined,
        limit,
        offset,
      })

      res.json(result)
    } catch (err) {
      next(err)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await this.queryService.findById(req.params.id as string)

      if (!event) {
        res.status(404).json({ error: 'Not Found' })
        return
      }

      res.json(event)
    } catch (err) {
      next(err)
    }
  }
}

function toArray(value: unknown, splitComma = false): string[] | undefined {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') {
    if (splitComma && value.includes(',')) return value.split(',').map((s) => s.trim()).filter(Boolean)
    return [value]
  }
  return undefined
}
