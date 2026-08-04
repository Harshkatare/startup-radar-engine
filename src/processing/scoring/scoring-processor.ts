import type { Processor } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'
import { ScoringPipeline } from './scoring-pipeline'
import { CategoryScorer } from './category-scorer'
import { TechnologyScorer } from './technology-scorer'
import { KeywordScorer } from './keyword-scorer'

export class ScoringProcessor implements Processor {
  private readonly pipeline = new ScoringPipeline()

  constructor() {
    this.pipeline.register(new CategoryScorer())
    this.pipeline.register(new TechnologyScorer())
    this.pipeline.register(new KeywordScorer())
  }

  async process(context: ProcessingContext): Promise<ProcessingContext> {
    return this.pipeline.run(context)
  }
}
