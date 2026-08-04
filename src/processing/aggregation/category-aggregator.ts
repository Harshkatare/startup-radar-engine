import type { Aggregator } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

export class CategoryAggregator implements Aggregator {
  async aggregate(context: ProcessingContext): Promise<ProcessingContext> {
    const counts: Record<string, number> = {}

    for (const cat of context.classification.categories) {
      if (cat.trim() === '') continue
      counts[cat] = (counts[cat] ?? 0) + 1
    }

    return {
      ...context,
      aggregation: {
        ...context.aggregation,
        categoryCounts: counts,
      },
    }
  }
}
