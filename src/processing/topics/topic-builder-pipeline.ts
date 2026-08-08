import type { TopicBuilder } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

export class TopicBuilderPipeline {
  private builders: TopicBuilder[] = []

  register(builder: TopicBuilder): void {
    this.builders.push(builder)
  }

  async run(context: ProcessingContext): Promise<ProcessingContext> {
    let result = context
    for (const builder of this.builders) {
      result = await builder.build(result)
    }
    return result
  }

  clear(): void {
    this.builders = []
  }
}