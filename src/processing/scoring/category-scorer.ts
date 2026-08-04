import type { Scorer } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'
import { normalizeCounts } from './normalize'

export class CategoryScorer implements Scorer {
  async score(context: ProcessingContext): Promise<ProcessingContext> {
    return {
      ...context,
      score: {
        ...context.score,
        categoryScores: normalizeCounts(context.aggregation.categoryCounts),
      },
    }
  }
}
