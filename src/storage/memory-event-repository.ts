import type { Event } from '../types'
import type { EventRepository } from '../interfaces'

export class MemoryEventRepository implements EventRepository {
  private events: Map<string, Event> = new Map()

  async save(event: Event): Promise<void> {
    this.events.set(event.id, event)
  }

  async saveMany(events: Event[]): Promise<void> {
    for (const event of events) {
      this.events.set(event.id, event)
    }
  }

  async findById(id: string): Promise<Event | null> {
    return this.events.get(id) ?? null
  }

  async findBySource(source: string): Promise<Event[]> {
    return Array.from(this.events.values()).filter(
      (e) => e.source === source,
    )
  }

  async findAll(): Promise<Event[]> {
    return Array.from(this.events.values())
  }

  async delete(id: string): Promise<void> {
    this.events.delete(id)
  }

  async clear(): Promise<void> {
    this.events.clear()
  }
}
