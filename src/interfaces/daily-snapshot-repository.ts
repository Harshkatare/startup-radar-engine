import type { DailySnapshot } from '../types'

export interface DailySnapshotRepository {
  save(snapshot: DailySnapshot): Promise<void>
  saveMany(snapshots: DailySnapshot[]): Promise<void>
  findByTopicId(topicId: string): Promise<DailySnapshot[]>
  findByDate(date: string): Promise<DailySnapshot[]>
  findAll(): Promise<DailySnapshot[]>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}
