import type { Topic } from '../types'
import type { TopicRepository } from '../interfaces'

export class MemoryTopicRepository implements TopicRepository {
  private topics: Map<string, Topic> = new Map()

  async save(topic: Topic): Promise<void> {
    this.topics.set(topic.id, topic)
  }

  async saveMany(topics: Topic[]): Promise<void> {
    for (const topic of topics) {
      this.topics.set(topic.id, topic)
    }
  }

  async findById(id: string): Promise<Topic | null> {
    return this.topics.get(id) ?? null
  }

  async findAll(): Promise<Topic[]> {
    return Array.from(this.topics.values())
  }

  async delete(id: string): Promise<void> {
    this.topics.delete(id)
  }

  async clear(): Promise<void> {
    this.topics.clear()
  }
}
