import type { Processor } from '../interfaces'
import type { ProcessingContext } from './processing-context'
import { AggregationPipeline } from './aggregation/aggregation-pipeline'
import { PassthroughAggregator } from './aggregation/aggregator'

export class AggregationProcessor implements Processor {
  private readonly pipeline = new AggregationPipeline()

  constructor() {
    this.pipeline.register(new PassthroughAggregator())
  }

  async process(context: ProcessingContext): Promise<ProcessingContext> {
    return this.pipeline.run(context)
  }
}
