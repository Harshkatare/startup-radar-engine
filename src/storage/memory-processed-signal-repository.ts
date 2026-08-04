import type { ProcessedSignal } from '../types'
import type { ProcessedSignalRepository } from '../interfaces'

export class MemoryProcessedSignalRepository implements ProcessedSignalRepository {
  private signals: Map<string, ProcessedSignal> = new Map()

  async save(signal: ProcessedSignal): Promise<void> {
    this.signals.set(signal.id, signal)
  }

  async saveMany(signals: ProcessedSignal[]): Promise<void> {
    for (const signal of signals) {
      this.signals.set(signal.id, signal)
    }
  }

  async findByTopicId(topicId: string): Promise<ProcessedSignal[]> {
    return Array.from(this.signals.values()).filter(
      (s) => s.topicId === topicId,
    )
  }

  async findAll(): Promise<ProcessedSignal[]> {
    return Array.from(this.signals.values())
  }

  async delete(id: string): Promise<void> {
    this.signals.delete(id)
  }

  async clear(): Promise<void> {
    this.signals.clear()
  }
}
