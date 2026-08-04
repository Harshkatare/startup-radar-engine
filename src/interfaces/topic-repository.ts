import type { Topic } from '../types'

export interface TopicRepository {
  save(topic: Topic): Promise<void>
  saveMany(topics: Topic[]): Promise<void>
  findById(id: string): Promise<Topic | null>
  findByName(name: string): Promise<Topic | null>
  findAll(): Promise<Topic[]>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}
