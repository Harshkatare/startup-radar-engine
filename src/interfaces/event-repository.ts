import type { Event } from '../types'

export interface EventRepository {
  save(event: Event): Promise<void>
  saveMany(events: Event[]): Promise<void>
  findById(id: string): Promise<Event | null>
  findBySource(source: string): Promise<Event[]>
  findAll(): Promise<Event[]>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}
