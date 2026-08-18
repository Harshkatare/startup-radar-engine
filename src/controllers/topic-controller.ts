import type { Request, Response, NextFunction } from 'express'
import type { TopicQueryService } from '../interfaces/topic-query-service'

const DEFAULT_LIMIT = 50

export class TopicController {
  constructor(private readonly topicQueryService: TopicQueryService) {}

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseNumber(req.query.limit)
      const offset = parseNumber(req.query.offset)
      const minScore = parseNumber(req.query.minScore)

      if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
        res.status(400).json({ error: 'Invalid limit' })
        return
      }
      if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) {
        res.status(400).json({ error: 'Invalid offset' })
        return
      }
      if (minScore !== undefined && isNaN(minScore)) {
        res.status(400).json({ error: 'Invalid minScore' })
        return
      }

      const result = await this.topicQueryService.findAll({
        limit: limit ?? DEFAULT_LIMIT,
        offset: offset ?? 0,
        minScore,
      })

      res.json(result)
    } catch (err) {
      next(err)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const topic = await this.topicQueryService.findById(req.params.id as string)

      if (!topic) {
        res.status(404).json({ error: 'Not Found' })
        return
      }

      res.json(topic)
    } catch (err) {
      next(err)
    }
  }

  async trending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseNumber(req.query.limit)

      if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
        res.status(400).json({ error: 'Invalid limit' })
        return
      }

      res.json(await this.topicQueryService.findTrending(limit))
    } catch (err) {
      next(err)
    }
  }
}

function parseNumber(value: unknown): number | undefined {
  if (value === undefined) return undefined
  return Number(value)
}