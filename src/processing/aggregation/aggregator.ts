import type { Aggregator } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

export class PassthroughAggregator implements Aggregator {
  async aggregate(context: ProcessingContext): Promise<ProcessingContext> {
    return context
  }
}
