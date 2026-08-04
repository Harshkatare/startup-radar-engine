import type { Aggregator } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

export class KeywordAggregator implements Aggregator {
  async aggregate(context: ProcessingContext): Promise<ProcessingContext> {
    const counts: Record<string, number> = {}

    for (const kw of context.classification.keywords) {
      if (kw.trim() === '') continue
      counts[kw] = (counts[kw] ?? 0) + 1
    }

    return {
      ...context,
      aggregation: {
        ...context.aggregation,
        keywordCounts: counts,
      },
    }
  }
}
