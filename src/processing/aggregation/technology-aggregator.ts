import type { Aggregator } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

export class TechnologyAggregator implements Aggregator {
  async aggregate(context: ProcessingContext): Promise<ProcessingContext> {
    const counts: Record<string, number> = {}

    for (const tech of context.classification.technologies) {
      if (tech.trim() === '') continue
      counts[tech] = (counts[tech] ?? 0) + 1
    }

    return {
      ...context,
      aggregation: {
        ...context.aggregation,
        technologyCounts: counts,
      },
    }
  }
}
