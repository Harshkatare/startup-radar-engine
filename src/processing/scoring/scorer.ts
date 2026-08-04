import type { Scorer } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

export class PassthroughScorer implements Scorer {
  async score(context: ProcessingContext): Promise<ProcessingContext> {
    return context
  }
}
