import type { Cleaner, DuplicateDetector } from '../../../interfaces'
import type { ProcessingContext } from '../../processing-context'

export class DuplicateCleaner implements Cleaner {
  constructor(private readonly detector: DuplicateDetector) {}

  async clean(context: ProcessingContext): Promise<ProcessingContext> {
    const events = context.events
    const seen: typeof events = []
    let removed = 0

    for (const event of events) {
      const isDup = await this.detector.isDuplicate(event, seen)
      if (!isDup) {
        seen.push(event)
      } else {
        removed++
      }
    }

    return {
      ...context,
      events: seen,
      statistics: {
        ...context.statistics,
        duplicatesRemoved: context.statistics.duplicatesRemoved + removed,
      },
    }
  }
}
