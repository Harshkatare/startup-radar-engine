import type { AnalystInput } from './analyst-input'
import type { AnalystResult } from './analyst-result'

export interface AnalystProvider {
  analyze(input: AnalystInput): Promise<AnalystResult>
}
