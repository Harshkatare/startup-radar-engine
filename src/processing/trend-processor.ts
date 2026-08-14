import type { Processor } from '../interfaces'
import type { ProcessingContext } from './processing-context'
import { TrendPipeline } from './trends/trend-pipeline'
import { DeterministicTrendAnalyzer } from './trends/trend-analyzer'

export class TrendProcessor implements Processor {
  private readonly pipeline = new TrendPipeline()

  constructor() {
    this.pipeline.register(new DeterministicTrendAnalyzer())
  }

  async process(context: ProcessingContext): Promise<ProcessingContext> {
    return this.pipeline.run(context)
  }
}
