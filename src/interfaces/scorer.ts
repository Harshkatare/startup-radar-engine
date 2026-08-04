import type { ProcessingContext } from '../processing/processing-context'

export interface Scorer {
  score(context: ProcessingContext): Promise<ProcessingContext>
}
