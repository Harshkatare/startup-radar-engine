import type { Request, Response, NextFunction } from 'express'
import type { ProcessingService } from '../services/processing-service'

export class ProcessingController {
  constructor(private readonly processingService: ProcessingService) {}

  async process(_req: Request, res: Response, next: NextFunction): Promise<void> {
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
    } catch (err) {
      next(err)
    }
  }
}
