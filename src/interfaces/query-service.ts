import type { Event } from '../types'

export interface StartupQuery {
  source?: string
  categories?: string[]
  technologies?: string[]
  keywords?: string[]
  limit?: number
  offset?: number
}

export interface QueryResult<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface QueryService {
  findEvents(query: StartupQuery): Promise<QueryResult<Event>>
  findById(id: string): Promise<Event | null>
}
