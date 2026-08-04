import type { ProcessingContext } from '../processing/processing-context'

export interface Aggregator {
  aggregate(context: ProcessingContext): Promise<ProcessingContext>
}
