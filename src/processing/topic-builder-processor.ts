import type { Processor } from '../interfaces'
import type { ProcessingContext } from './processing-context'
import { TopicBuilderPipeline } from './topics/topic-builder-pipeline'
import { DeterministicTopicBuilder } from './topics/deterministic-topic-builder'

export class TopicBuilderProcessor implements Processor {
  private readonly pipeline = new TopicBuilderPipeline()

  constructor() {
    this.pipeline.register(new DeterministicTopicBuilder())
  }

  async process(context: ProcessingContext): Promise<ProcessingContext> {
    return this.pipeline.run(context)
  }
}