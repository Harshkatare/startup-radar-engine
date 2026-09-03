import type { AnalystInput, AnalystResult } from '../analysis'

export interface AIAnalyst {
  analyze(input: AnalystInput): Promise<AnalystResult>
}
