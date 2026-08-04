import type { Event } from '../types'

export interface DuplicateDetector {
  isDuplicate(event: Event, existingEvents: Event[]): Promise<boolean>
}
