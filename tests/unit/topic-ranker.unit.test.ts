import { describe, it, expect } from 'vitest'
import { TopicRanker } from '../../src/processing/ranking/topic-ranker'
import { createProcessingStatistics } from '../../src/processing/processing-statistics'
import { createClassificationResult } from '../../src/processing/classification/classification-result'
import { createAggregationResult } from '../../src/processing/aggregation/aggregation-result'
import { createScoreResult } from '../../src/processing/scoring/score-result'
import { createTopicResult } from '../../src/processing/topics/topic-result'
import { createTrendResult } from '../../src/processing/trends/trend-result'
import { createRankingResult } from '../../src/processing/ranking/ranking-result'
import { EventSource } from '../../src/types'
import type { ProcessingContext } from '../../src/processing/processing-context'
import type { TopicTrend } from '../../src/processing/trends/trend-result'

const NOW = new Date('2026-06-15T00:00:00.000Z')

function makeTrend(
  topicId: string,
  score: number,
  growthRate: number,
  confidence: number,
): TopicTrend {
  return {
    topicId,
    activity: 1,
    recentActivity: 1,
    previousActivity: 0,
    growthRate,
    sourceDiversity: 1,
    freshness: 1,
    evidenceStrength: 1,
    normalizedActivity: 1,
    normalizedGrowth: 1,
    score,
    confidence,
  }
}

function makeContext(trends: TopicTrend[]): ProcessingContext {
  const trendMap: Record<string, TopicTrend> = {}
  for (const trend of trends) {
    trendMap[trend.topicId] = trend
  }
  return {
    events: [],
    source: EventSource.GITHUB,
    startedAt: NOW,
    statistics: createProcessingStatistics(),
    classification: createClassificationResult(),
    aggregation: createAggregationResult(),
    score: createScoreResult(),
    topics: createTopicResult(),
    trends: { trends: trendMap },
    ranking: createRankingResult(),
  }
}

describe('TopicRanker', () => {
  it('assigns rank 1 to the topic with the highest score', async () => {
    const context = makeContext([
      makeTrend('topic-b', 0.5, 0.5, 0.5),
      makeTrend('topic-a', 0.95, 0.5, 0.5),
    ])

    const result = await new TopicRanker().rank(context)

    expect(result.ranking.rankedTopics[0]).toMatchObject({ rank: 1, topicId: 'topic-a' })
  })

  it('orders topics by score descending', async () => {
    const context = makeContext([
      makeTrend('topic-a', 0.3, 0.5, 0.5),
      makeTrend('topic-b', 0.82, 0.5, 0.5),
      makeTrend('topic-c', 0.6, 0.5, 0.5),
    ])

    const result = await new TopicRanker().rank(context)

    expect(result.ranking.rankedTopics.map((topic) => topic.topicId)).toEqual([
      'topic-b',
      'topic-c',
      'topic-a',
    ])
  })

  it('uses growth rate as tie-breaker when scores are equal', async () => {
    const context = makeContext([
      makeTrend('topic-a', 0.8, 0.4, 0.5),
      makeTrend('topic-b', 0.8, 1.2, 0.5),
    ])

    const result = await new TopicRanker().rank(context)

    expect(result.ranking.rankedTopics.map((topic) => topic.topicId)).toEqual([
      'topic-b',
      'topic-a',
    ])
  })

  it('uses confidence as tie-breaker when score and growth rate are equal', async () => {
    const context = makeContext([
      makeTrend('topic-a', 0.8, 1.2, 0.85),
      makeTrend('topic-b', 0.8, 1.2, 0.9),
    ])

    const result = await new TopicRanker().rank(context)

    expect(result.ranking.rankedTopics.map((topic) => topic.topicId)).toEqual([
      'topic-b',
      'topic-a',
    ])
  })

  it('uses topic id ascending as the final tie-breaker', async () => {
    const context = makeContext([
      makeTrend('topic-b', 0.8, 1.2, 0.9),
      makeTrend('topic-a', 0.8, 1.2, 0.9),
    ])

    const result = await new TopicRanker().rank(context)

    expect(result.ranking.rankedTopics.map((topic) => topic.topicId)).toEqual([
      'topic-a',
      'topic-b',
    ])
  })

  it('assigns sequential ranks starting at 1', async () => {
    const context = makeContext([
      makeTrend('topic-a', 0.95, 1.2, 0.9),
      makeTrend('topic-b', 0.82, 0.8, 0.85),
      makeTrend('topic-c', 0.7, 0.6, 0.7),
    ])

    const result = await new TopicRanker().rank(context)

    expect(result.ranking.rankedTopics.map((topic) => topic.rank)).toEqual([1, 2, 3])
  })

  it('returns an empty ranking for an empty topic set', async () => {
    const context = makeContext([])

    const result = await new TopicRanker().rank(context)

    expect(result.ranking.rankedTopics).toEqual([])
  })

  it('ranks a single topic at rank 1', async () => {
    const context = makeContext([makeTrend('topic-a', 0.9, 1.0, 0.8)])

    const result = await new TopicRanker().rank(context)

    expect(result.ranking.rankedTopics).toEqual([
      {
        rank: 1,
        topicId: 'topic-a',
        score: 0.9,
        growthRate: 1.0,
        confidence: 0.8,
      },
    ])
  })

  it('includes every topic exactly once for multiple topics', async () => {
    const context = makeContext([
      makeTrend('topic-a', 0.9, 1.0, 0.8),
      makeTrend('topic-b', 0.7, 0.5, 0.6),
      makeTrend('topic-c', 0.8, 0.9, 0.7),
    ])

    const result = await new TopicRanker().rank(context)

    expect(result.ranking.rankedTopics).toHaveLength(3)
    expect(result.ranking.rankedTopics.map((topic) => topic.topicId)).toEqual([
      'topic-a',
      'topic-c',
      'topic-b',
    ])
  })

  it('is deterministic across repeated executions', async () => {
    const context = makeContext([
      makeTrend('topic-a', 0.5, 1.0, 0.8),
      makeTrend('topic-b', 0.9, 0.3, 0.9),
      makeTrend('topic-c', 0.5, 1.0, 0.8),
    ])
    const ranker = new TopicRanker()

    const first = await ranker.rank(context)
    const second = await ranker.rank(context)

    expect(second.ranking.rankedTopics).toEqual(first.ranking.rankedTopics)
  })

  it('leaves the existing context unchanged', async () => {
    const context = makeContext([
      makeTrend('topic-a', 0.9, 1.0, 0.8),
      makeTrend('topic-b', 0.7, 0.5, 0.6),
    ])
    const snapshot = JSON.parse(JSON.stringify(context))

    await new TopicRanker().rank(context)

    expect(JSON.parse(JSON.stringify(context))).toEqual(snapshot)
    expect(context.ranking).toEqual(createRankingResult())
  })

  it('does not modify the underlying trend values', async () => {
    const context = makeContext([
      makeTrend('topic-a', 0.9, 1.0, 0.8),
      makeTrend('topic-b', 0.7, 0.5, 0.6),
    ])

    const result = await new TopicRanker().rank(context)

    expect(result.trends.trends).toEqual(context.trends.trends)
    expect(result.ranking.rankedTopics[0]).toMatchObject({
      topicId: 'topic-a',
      score: 0.9,
      growthRate: 1.0,
      confidence: 0.8,
    })
    expect(result.ranking.rankedTopics[1]).toMatchObject({
      topicId: 'topic-b',
      score: 0.7,
      growthRate: 0.5,
      confidence: 0.6,
    })
  })
})