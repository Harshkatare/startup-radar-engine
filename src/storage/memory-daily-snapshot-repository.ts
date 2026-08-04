import type { DailySnapshot } from '../types'
import type { DailySnapshotRepository } from '../interfaces'

export class MemoryDailySnapshotRepository implements DailySnapshotRepository {
  private snapshots: Map<string, DailySnapshot> = new Map()

  async save(snapshot: DailySnapshot): Promise<void> {
    this.snapshots.set(snapshot.id, snapshot)
  }

  async saveMany(snapshots: DailySnapshot[]): Promise<void> {
    for (const snapshot of snapshots) {
      this.snapshots.set(snapshot.id, snapshot)
    }
  }

  async findByTopicId(topicId: string): Promise<DailySnapshot[]> {
    return Array.from(this.snapshots.values()).filter(
      (s) => s.topicId === topicId,
    )
  }

  async findByDate(date: string): Promise<DailySnapshot[]> {
    return Array.from(this.snapshots.values()).filter(
      (s) => s.date === date,
    )
  }

  async findAll(): Promise<DailySnapshot[]> {
    return Array.from(this.snapshots.values())
  }

  async delete(id: string): Promise<void> {
    this.snapshots.delete(id)
  }

  async clear(): Promise<void> {
    this.snapshots.clear()
  }
}
