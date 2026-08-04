import type { Classifier } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

export class ClassificationPipeline {
  private classifiers: Classifier[] = []

  register(classifier: Classifier): void {
    this.classifiers.push(classifier)
  }

  async run(context: ProcessingContext): Promise<ProcessingContext> {
    let result = context
    for (const classifier of this.classifiers) {
      result = await classifier.classify(result)
    }
    return result
  }

  clear(): void {
    this.classifiers = []
  }
}
