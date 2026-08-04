import type { Processor } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'
import { AggregationPipeline } from './aggregation-pipeline'
import { CategoryAggregator } from './category-aggregator'
import { TechnologyAggregator } from './technology-aggregator'
import { KeywordAggregator } from './keyword-aggregator'

export class AggregationProcessor implements Processor {
  private readonly pipeline = new AggregationPipeline()

  constructor() {
    this.pipeline.register(new CategoryAggregator())
    this.pipeline.register(new TechnologyAggregator())
    this.pipeline.register(new KeywordAggregator())
  }

  async process(context: ProcessingContext): Promise<ProcessingContext> {
    return this.pipeline.run(context)
  }
}
