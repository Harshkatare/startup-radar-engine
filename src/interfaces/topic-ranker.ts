import type { ProcessingContext } from '../processing/processing-context'

export interface TopicRanker {
  rank(context: ProcessingContext): Promise<ProcessingContext>
}
