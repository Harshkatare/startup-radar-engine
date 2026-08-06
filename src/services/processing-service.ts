import type { Collector } from '../interfaces'
import type { Event } from '../types'
import type { ProcessingContext } from '../processing/processing-context'
import { ProcessingPipeline } from '../processing/processing-pipeline'
import { createProcessingStatistics } from '../processing/processing-statistics'
import { createClassificationResult } from '../processing/classification/classification-result'
import { createAggregationResult } from '../processing/aggregation/aggregation-result'
import { createScoreResult } from '../processing/scoring/score-result'
import { EventSource } from '../types'

export class ProcessingService {
  constructor(
    private readonly collectors: Collector[],
    private readonly pipeline: ProcessingPipeline,
  ) {}

  async run(): Promise<ProcessingContext> {
    const allEvents: Event[] = await this.collectAll()

    const context: ProcessingContext = {
      events: allEvents,
      source: EventSource.GITHUB,
      startedAt: new Date(),
      statistics: createProcessingStatistics(),
      classification: createClassificationResult(),
      aggregation: createAggregationResult(),
      score: createScoreResult(),
    }

    return this.pipeline.run(context)
  }

  private async collectAll(): Promise<Event[]> {
    const all: Event[] = []

    for (const collector of this.collectors) {
      const raw = await collector.collect()
      const validated = await collector.validate(raw)
      const normalized = await collector.normalize(validated)
      all.push(...normalized)
    }

    return all
  }
}
