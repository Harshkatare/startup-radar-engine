import type { ProcessingContext } from '../processing/processing-context'

export interface TrendAnalyzer {
  analyze(context: ProcessingContext): Promise<ProcessingContext>
}
