import type { Event } from '../types'

export interface Collector {
  collect(): Promise<Event[]>
  validate(events: Event[]): Promise<Event[]>
  normalize(events: Event[]): Promise<Event[]>
}
