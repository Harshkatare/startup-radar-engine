import type { Processor } from '../interfaces'
import type { ProcessingContext } from './processing-context'
import { TopicBuilderPipeline } from './topics/topic-builder-pipeline'

export class TopicBuilderProcessor implements Processor {
  private readonly pipeline = new TopicBuilderPipeline()

  async process(context: ProcessingContext): Promise<ProcessingContext> {
    return this.pipeline.run(context)
  }
}