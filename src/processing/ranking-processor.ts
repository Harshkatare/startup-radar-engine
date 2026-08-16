import type { Processor } from '../interfaces'
import type { ProcessingContext } from './processing-context'
import { RankingPipeline } from './ranking/ranking-pipeline'
import { TopicRanker } from './ranking/topic-ranker'

export class RankingProcessor implements Processor {
  private readonly pipeline = new RankingPipeline()

  constructor() {
    this.pipeline.register(new TopicRanker())
  }

  async process(context: ProcessingContext): Promise<ProcessingContext> {
    return this.pipeline.run(context)
  }
}
