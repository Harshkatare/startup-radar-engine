import type { Processor } from '../interfaces'
import type { ProcessingContext } from './processing-context'

export class ClassificationProcessor implements Processor {
  async process(context: ProcessingContext): Promise<ProcessingContext> {
    return context
  }
}
