import type { ProcessedSignal } from '../types'

export interface ProcessedSignalRepository {
  save(signal: ProcessedSignal): Promise<void>
  saveMany(signals: ProcessedSignal[]): Promise<void>
  findByTopicId(topicId: string): Promise<ProcessedSignal[]>
  findAll(): Promise<ProcessedSignal[]>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}
