import type { Request, Response, NextFunction } from 'express'
import type { QueryService } from '../interfaces/query-service'

export class EventController {
  constructor(private readonly queryService: QueryService) {}

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50
      const offset = parseInt(req.query.offset as string, 10) || 0

      if (limit <= 0 || offset < 0) {
        res.status(400).json({ error: 'Invalid pagination parameters' })
        return
      }

      const result = await this.queryService.findEvents({
        source: req.query.source as string | undefined,
        categories: toArray(req.query.category),
        technologies: toArray(req.query.technology),
        keywords: toArray(req.query.keyword),
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

function toArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return [value]
  return undefined
}
