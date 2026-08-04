import type { Processor } from '../interfaces'
import type { ProcessingContext } from './processing-context'
import { ClassificationPipeline } from './classification/classification-pipeline'
import { CategoryClassifier } from './classification/category-classifier'
import { TechnologyClassifier } from './classification/technology-classifier'
import { KeywordExtractor } from './classification/keyword-extractor'

export class ClassificationProcessor implements Processor {
  private readonly pipeline = new ClassificationPipeline()

  constructor() {
    this.pipeline.register(new CategoryClassifier())
    this.pipeline.register(new TechnologyClassifier())
    this.pipeline.register(new KeywordExtractor())
  }

  async process(context: ProcessingContext): Promise<ProcessingContext> {
    return this.pipeline.run(context)
  }
}
