import type { Collector } from '../interfaces'
import type { EventRepository } from '../interfaces'
import type { Event } from '../types'

export class CollectorPipeline {
  constructor(private readonly repository: EventRepository) {}

  async run(collector: Collector): Promise<Event[]> {
    const raw = await collector.collect()
    const validated = await collector.validate(raw)
    const normalized = await collector.normalize(validated)
    await this.repository.saveMany(normalized)
    return normalized
  }
}
