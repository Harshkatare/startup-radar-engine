import type { Cleaner } from '../../../interfaces'
import type { ProcessingContext } from '../../processing-context'

export class MetadataCleaner implements Cleaner {
  async clean(context: ProcessingContext): Promise<ProcessingContext> {
    let removed = 0

    const events = context.events.map((event) => {
      const meta = event.metadata as Record<string, unknown>
      const cleaned: Record<string, unknown> = {}
      for (const key of Object.keys(meta)) {
        const value = meta[key]
        if (value === null || value === undefined) {
          removed++
          continue
        }
        if (typeof value === 'string') {
          const trimmed = value.trim()
          if (trimmed === '') {
            removed++
            continue
          }
          cleaned[key] = trimmed
        } else {
          cleaned[key] = value
        }
      }
      return { ...event, metadata: cleaned }
    })

    return {
      ...context,
      events,
      statistics: {
        ...context.statistics,
        metadataEntriesRemoved: context.statistics.metadataEntriesRemoved + removed,
      },
    }
  }
}
