import type { Scorer } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'
import { normalizeCounts } from './normalize'

export class TechnologyScorer implements Scorer {
  async score(context: ProcessingContext): Promise<ProcessingContext> {
    return {
      ...context,
      score: {
        ...context.score,
        technologyScores: normalizeCounts(context.aggregation.technologyCounts),
      },
    }
  }
}
