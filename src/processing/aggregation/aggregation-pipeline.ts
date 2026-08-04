import type { Aggregator } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

export class AggregationPipeline {
  private aggregators: Aggregator[] = []

  register(aggregator: Aggregator): void {
    this.aggregators.push(aggregator)
  }

  async run(context: ProcessingContext): Promise<ProcessingContext> {
    let result = context
    for (const aggregator of this.aggregators) {
      result = await aggregator.aggregate(result)
    }
    return result
  }

  clear(): void {
    this.aggregators = []
  }
}
