import type { Processor } from '../interfaces'
import type { Persister } from '../interfaces'
import type { ProcessingContext } from './processing-context'

export class ProcessingPipeline {
  private processors: Processor[] = []

  constructor(persister?: Persister | Persister[]) {
    this.persisters = persister ? (Array.isArray(persister) ? persister : [persister]) : []
  }

  private readonly persisters: Persister[]

  register(processor: Processor): void {
    this.processors.push(processor)
  }

  async run(context: ProcessingContext): Promise<ProcessingContext> {
    let result = context

    for (const processor of this.processors) {
      result = await processor.process(result)
    }

    for (const persister of this.persisters) {
      await persister.persist(result)
    }

    return result
  }

  clear(): void {
    this.processors = []
  }
}
