import type { ProcessingContext } from '../processing/processing-context'

export interface Cleaner {
  clean(context: ProcessingContext): Promise<ProcessingContext>
}
