import type { Event } from '../../types'
import type { Collector } from '../../interfaces'

export abstract class BaseCollector implements Collector {
  abstract collect(): Promise<Event[]>

  async validate(events: Event[]): Promise<Event[]> {
    return events.filter((event) => {
      if (!event.id) return false
      if (!event.source) return false
      if (!event.title || event.title.trim() === '') return false
      return true
    })
  }

  async normalize(events: Event[]): Promise<Event[]> {
    return events.map((event) => ({
      ...event,
      title: event.title.trim(),
      content: event.content.trim(),
      source: event.source.toLowerCase(),
    }))
  }
}
