import type { TopicRanker as TopicRankerInterface } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'
import type { RankedTopic } from './ranking-result'

export class TopicRanker implements TopicRankerInterface {
  async rank(context: ProcessingContext): Promise<ProcessingContext> {
    return {
      ...context,
      ranking: { rankedTopics: this.computeRanking(context) },
    }
  }

  private computeRanking(context: ProcessingContext): RankedTopic[] {
    const trends = Object.values(context.trends.trends)

    const sorted = [...trends].sort(
      (a, b) =>
        b.score - a.score ||
        b.growthRate - a.growthRate ||
        b.confidence - a.confidence ||
        a.topicId.localeCompare(b.topicId),
    )

    return sorted.map((trend, index) => ({
      rank: index + 1,
      topicId: trend.topicId,
      score: trend.score,
      growthRate: trend.growthRate,
      confidence: trend.confidence,
    }))
  }
}
