import type { ProcessingContext } from '../processing/processing-context'

export interface TopicBuilder {
  build(context: ProcessingContext): Promise<ProcessingContext>
}