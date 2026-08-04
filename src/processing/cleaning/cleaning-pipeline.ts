import type { Cleaner } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

export class CleaningPipeline {
  private cleaners: Cleaner[] = []

  register(cleaner: Cleaner): void {
    this.cleaners.push(cleaner)
  }

  async run(context: ProcessingContext): Promise<ProcessingContext> {
    let result = context
    for (const cleaner of this.cleaners) {
      result = await cleaner.clean(result)
    }
    return result
  }

  clear(): void {
    this.cleaners = []
  }
}
