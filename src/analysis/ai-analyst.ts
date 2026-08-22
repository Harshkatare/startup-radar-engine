import type { AIAnalyst } from '../interfaces/ai-analyst'
import type { AnalystInput } from './analyst-input'
import type { AnalystResult } from './analyst-result'
import type { AnalystProvider } from './analyst-provider'

export class AIAnalystService implements AIAnalyst {
  constructor(private readonly provider: AnalystProvider) {}

  async analyze(input: AnalystInput): Promise<AnalystResult> {
    return this.provider.analyze(input)
  }
}
