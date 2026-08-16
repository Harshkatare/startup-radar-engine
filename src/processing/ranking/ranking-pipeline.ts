import type { TopicRanker } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

export class RankingPipeline {
  private rankers: TopicRanker[] = []

  register(ranker: TopicRanker): void {
    this.rankers.push(ranker)
  }

  async run(context: ProcessingContext): Promise<ProcessingContext> {
    let result = context
    for (const ranker of this.rankers) {
      result = await ranker.rank(result)
    }
    return result
  }

  clear(): void {
    this.rankers = []
  }
}
