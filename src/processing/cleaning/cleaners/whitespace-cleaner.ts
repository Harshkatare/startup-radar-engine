import type { Cleaner } from '../../../interfaces'
import type { ProcessingContext } from '../../processing-context'

export class WhitespaceCleaner implements Cleaner {
  async clean(context: ProcessingContext): Promise<ProcessingContext> {
    let count = 0

    const events = context.events.map((event) => {
      const title = event.title.trim()
      const content = event.content.trim()
      if (title !== event.title) count++
      if (content !== event.content) count++
      return { ...event, title, content }
    })

    return {
      ...context,
      events,
      statistics: {
        ...context.statistics,
        whitespaceTrimmed: context.statistics.whitespaceTrimmed + count,
      },
    }
  }
}
