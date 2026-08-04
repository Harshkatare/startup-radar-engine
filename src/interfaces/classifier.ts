import type { ProcessingContext } from '../processing/processing-context'

export interface Classifier {
  classify(context: ProcessingContext): Promise<ProcessingContext>
}
