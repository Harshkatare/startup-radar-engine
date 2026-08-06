import type { Event } from '../types'

export type SortBy = 'publishedAt' | 'createdAt'
export type SortOrder = 'asc' | 'desc'

export interface StartupQuery {
  source?: string
  categories?: string[]
  technologies?: string[]
  keywords?: string[]
  fromDate?: Date
  toDate?: Date
  sortBy?: SortBy
  sortOrder?: SortOrder
  limit?: number
  offset?: number
}

export interface QueryResult<T> {
  items: T[]
  total: number
  limit: number
  offset: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface QueryService {
  findEvents(query: StartupQuery): Promise<QueryResult<Event>>
  findById(id: string): Promise<Event | null>
}
