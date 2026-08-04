import type { Processor } from '../interfaces'
import type { ProcessingContext } from './processing-context'
import { CleaningPipeline } from './cleaning/cleaning-pipeline'

export class CleaningProcessor implements Processor {
  private readonly pipeline = new CleaningPipeline()

  async process(context: ProcessingContext): Promise<ProcessingContext> {
    return this.pipeline.run(context)
  }
}
