import type { Scorer } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

export class ScoringPipeline {
  private scorers: Scorer[] = []

  register(scorer: Scorer): void {
    this.scorers.push(scorer)
  }

  async run(context: ProcessingContext): Promise<ProcessingContext> {
    let result = context
    for (const scorer of this.scorers) {
      result = await scorer.score(result)
    }
    return result
  }

  clear(): void {
    this.scorers = []
  }
}
