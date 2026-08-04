import type { ProcessingContext } from '../processing/processing-context'

export interface Processor {
  process(context: ProcessingContext): Promise<ProcessingContext>
}
