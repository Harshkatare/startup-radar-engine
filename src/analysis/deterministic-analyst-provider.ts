import type { AnalystProvider } from './analyst-provider'
import type { AnalystInput } from './analyst-input'
import type { AnalystResult } from './analyst-result'

export class DeterministicAnalystProvider implements AnalystProvider {
  async analyze(input: AnalystInput): Promise<AnalystResult> {
    const rankText = input.rank !== null ? ` Ranked #${input.rank}.` : ''
    const summary = `Topic "${input.topic.name}" has score ${input.topic.score} and growth rate ${input.topic.growthRate}.${rankText}`
    const whyItMatters = `Topic shows activity level of ${input.trend.activity} with freshness ${input.trend.freshness} and source diversity ${input.trend.sourceDiversity}.`
    const evidenceSummary = `Backed by ${input.evidence.length} evidence items across sources.`

    return {
      topicId: input.topic.id,
      summary,
      whyItMatters,
      evidenceSummary,
    }
  }
}
