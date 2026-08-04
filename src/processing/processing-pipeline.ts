import type { Processor } from '../interfaces'
import type { ProcessingContext } from './processing-context'

export class ProcessingPipeline {
  private processors: Processor[] = []

  register(processor: Processor): void {
    this.processors.push(processor)
  }

  async run(context: ProcessingContext): Promise<ProcessingContext> {
    let result = context
    for (const processor of this.processors) {
      result = await processor.process(result)
    }
    return result
  }

  clear(): void {
    this.processors = []
  }
}
