import { BaseCollector } from '../base/base-collector'
import type { Event } from '../../types'

export class RedditCollector extends BaseCollector {
  async collect(): Promise<Event[]> {
    return []
  }
}
