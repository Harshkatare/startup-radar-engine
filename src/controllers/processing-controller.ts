import type { Request, Response, NextFunction } from 'express'
import { ProcessingService } from '../services/processing-service'
import { ProcessingLock } from '../scheduler/processing-lock'
import { SchedulerService } from '../scheduler/scheduler-service'

export class ProcessingController {
  constructor(
    private readonly processingService: ProcessingService,
    private readonly lock: ProcessingLock,
    private readonly schedulerService: SchedulerService,
  ) {}

  async process(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!this.lock.acquire()) {
        res.status(409).json({ error: 'Processing already in progress' })
        return
      }

      try {
        const result = await this.processingService.run()

        res.json({
          status: 'completed',
          statistics: {
            eventsProcessed: result.events.length,
            duplicatesRemoved: result.statistics.duplicatesRemoved,
            whitespaceTrimmed: result.statistics.whitespaceTrimmed,
            urlsNormalized: result.statistics.urlsNormalized,
            categoriesFound: result.classification.categories.length,
            technologiesFound: result.classification.technologies.length,
            keywordsExtracted: result.classification.keywords.length,
          },
        })
      } finally {
        this.lock.release()
      }
    } catch (err) {
      next(err)
    }
  }

  async status(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({
        running: this.schedulerService.running,
        lastRun: this.schedulerService.lastRun,
        lastDurationMs: this.schedulerService.lastDurationMs,
        lastStatus: this.schedulerService.lastStatus,
      })
    } catch (err) {
      next(err)
    }
  }
}
