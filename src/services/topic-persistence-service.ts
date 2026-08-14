import type { Persister } from '../interfaces'
import type { ProcessingContext } from '../processing/processing-context'
import type { Topic as ProcessingTopic } from '../processing/topics/topic-result'
import type { TopicTrend } from '../processing/trends/trend-result'
import type { Topic as PersistedTopic } from '../types'
import type { SQLiteTopicRepository } from '../storage/sqlite/sqlite-topic-repository'

export class TopicPersistenceService implements Persister {
  constructor(private readonly topicRepository: SQLiteTopicRepository) {}

  async persist(context: ProcessingContext): Promise<void> {
    const topics = context.topics.topics
    if (topics.length === 0) {
      return
    }

    const now = new Date()
    const trends = context.trends.trends
    const persisted: PersistedTopic[] = topics.map((topic) =>
      mapToPersistedTopic(topic, trends[topic.id], now),
    )

    await this.topicRepository.saveMany(persisted)

    for (const topic of topics) {
      this.topicRepository.saveTopicEvidence(topic.id, topic.evidence)
    }
  }
}

function mapToPersistedTopic(
  topic: ProcessingTopic,
  trend: TopicTrend | undefined,
  updatedAt: Date,
): PersistedTopic {
  return {
    id: topic.id,
    name: topic.name,
    score: trend?.score ?? 0,
    growthRate: trend?.growthRate ?? 0,
    confidence: trend?.confidence ?? 0,
    updatedAt,
  }
}
