import type { TrendAnalyzer } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

export class TrendPipeline {
  private analyzers: TrendAnalyzer[] = []

  register(analyzer: TrendAnalyzer): void {
    this.analyzers.push(analyzer)
  }

  async run(context: ProcessingContext): Promise<ProcessingContext> {
    let result = context
    for (const analyzer of this.analyzers) {
      result = await analyzer.analyze(result)
    }
    return result
  }

  clear(): void {
    this.analyzers = []
  }
}
