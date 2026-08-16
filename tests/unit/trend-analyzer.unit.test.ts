import { describe, it, expect } from 'vitest'
import { DeterministicTrendAnalyzer } from '../../src/processing/trends/trend-analyzer'
import { createProcessingStatistics } from '../../src/processing/processing-statistics'
import { createClassificationResult } from '../../src/processing/classification/classification-result'
import { createAggregationResult } from '../../src/processing/aggregation/aggregation-result'
import { createScoreResult } from '../../src/processing/scoring/score-result'
import { createTopicResult } from '../../src/processing/topics/topic-result'
import { createTrendResult } from '../../src/processing/trends/trend-result'
import { createRankingResult } from '../../src/processing/ranking/ranking-result'
import { EventSource } from '../../src/types'
import type { Event } from '../../src/types'
import type { TopicEvidence } from '../../src/processing/topics/topic-result'
import type { Topic as ProcessingTopic } from '../../src/processing/topics/topic-result'
import type { ProcessingContext } from '../../src/processing/processing-context'

const NOW = new Date('2026-06-15T00:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY)
}

function makeEvent(id: string, source: EventSource, createdAt: Date): Event {
  return {
    id,
    source,
    externalId: id,
    title: '',
    content: '',
    metadata: {},
    createdAt,
  }
}

function makeEvidence(id: string, source: EventSource = EventSource.GITHUB): TopicEvidence {
  return { eventId: id, source }
}

function makeTopic(id: string, evidence: TopicEvidence[]): ProcessingTopic {
  return {
    id,
    name: id,
    categories: [],
    technologies: [],
    keywords: [],
    evidence,
  }
}

function makeContext(events: Event[], topics: ProcessingTopic[]): ProcessingContext {
  return {
    events,
    source: EventSource.GITHUB,
    startedAt: NOW,
    statistics: createProcessingStatistics(),
    classification: createClassificationResult(),
    aggregation: createAggregationResult(),
    score: createScoreResult(),
    topics: { topics },
    trends: createTrendResult(),
    ranking: createRankingResult(),
  }
}

describe('DeterministicTrendAnalyzer', () => {
  it('counts recent activity from events within the last 7 days', async () => {
    const events = [
      makeEvent('a', EventSource.GITHUB, daysAgo(1)),
      makeEvent('b', EventSource.GITHUB, daysAgo(6)),
    ]
    const context = makeContext(events, [makeTopic('t1', events.map((e) => makeEvidence(e.id)))])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    const trend = result.trends.trends['t1']
    expect(trend.activity).toBe(2)
    expect(trend.recentActivity).toBe(2)
    expect(trend.previousActivity).toBe(0)
  })

  it('counts previous-period activity from events 7 to 14 days old', async () => {
    const events = [
      makeEvent('a', EventSource.GITHUB, daysAgo(8)),
      makeEvent('b', EventSource.GITHUB, daysAgo(13)),
    ]
    const context = makeContext(events, [makeTopic('t1', events.map((e) => makeEvidence(e.id)))])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    const trend = result.trends.trends['t1']
    expect(trend.recentActivity).toBe(0)
    expect(trend.previousActivity).toBe(2)
  })

  it('excludes events older than 14 days from both windows', async () => {
    const event = makeEvent('a', EventSource.GITHUB, daysAgo(20))
    const context = makeContext([event], [makeTopic('t1', [makeEvidence(event.id)])])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    const trend = result.trends.trends['t1']
    expect(trend.activity).toBe(1)
    expect(trend.recentActivity).toBe(0)
    expect(trend.previousActivity).toBe(0)
  })

  it('applies window boundaries deterministically (7d → recent, 14d → previous)', async () => {
    const events = [
      makeEvent('a', EventSource.GITHUB, daysAgo(7)),
      makeEvent('b', EventSource.GITHUB, daysAgo(14)),
    ]
    const context = makeContext(events, [makeTopic('t1', events.map((e) => makeEvidence(e.id)))])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    const trend = result.trends.trends['t1']
    expect(trend.recentActivity).toBe(1)
    expect(trend.previousActivity).toBe(1)
  })

  it('calculates growth rate as (recent - previous) / previous', async () => {
    const events = [
      makeEvent('a', EventSource.GITHUB, daysAgo(1)),
      makeEvent('b', EventSource.GITHUB, daysAgo(2)),
      makeEvent('c', EventSource.GITHUB, daysAgo(10)),
    ]
    const context = makeContext(events, [makeTopic('t1', events.map((e) => makeEvidence(e.id)))])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    expect(result.trends.trends['t1'].growthRate).toBe(1)
  })

  it('allows negative growth when recent activity falls below previous activity', async () => {
    const events = [
      makeEvent('a', EventSource.GITHUB, daysAgo(2)),
      makeEvent('b', EventSource.GITHUB, daysAgo(10)),
      makeEvent('c', EventSource.GITHUB, daysAgo(11)),
      makeEvent('d', EventSource.GITHUB, daysAgo(12)),
    ]
    const context = makeContext(events, [makeTopic('t1', events.map((e) => makeEvidence(e.id)))])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    expect(result.trends.trends['t1'].growthRate).toBeCloseTo(-2 / 3, 10)
  })

  it('uses growth rate 1 when previous activity is zero but recent activity exists', async () => {
    const events = [
      makeEvent('a', EventSource.GITHUB, daysAgo(1)),
      makeEvent('b', EventSource.GITHUB, daysAgo(2)),
    ]
    const context = makeContext(events, [makeTopic('t1', events.map((e) => makeEvidence(e.id)))])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    expect(result.trends.trends['t1'].growthRate).toBe(1)
  })

  it('uses growth rate 0 when neither window has activity', async () => {
    const event = makeEvent('a', EventSource.GITHUB, daysAgo(20))
    const context = makeContext([event], [makeTopic('t1', [makeEvidence(event.id)])])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    expect(result.trends.trends['t1'].growthRate).toBe(0)
  })

  it('computes source diversity against the total supported sources', async () => {
    const events = [
      makeEvent('a', EventSource.GITHUB, daysAgo(1)),
      makeEvent('b', EventSource.GITHUB, daysAgo(2)),
      makeEvent('c', EventSource.GITHUB, daysAgo(3)),
    ]
    const context = makeContext(events, [makeTopic('t1', events.map((e) => makeEvidence(e.id)))])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    expect(result.trends.trends['t1'].sourceDiversity).toBeCloseTo(1 / 3, 10)
  })

  it('reaches diversity 1 when evidence spans all supported sources', async () => {
    const evidence = [
      makeEvidence('a', EventSource.GITHUB),
      makeEvidence('b', EventSource.REDDIT),
      makeEvidence('c', EventSource.HACKER_NEWS),
    ]
    const context = makeContext([], [makeTopic('t1', evidence)])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    expect(result.trends.trends['t1'].sourceDiversity).toBe(1)
  })

  it('computes freshness as recent events over total events', async () => {
    const events = [
      makeEvent('a', EventSource.GITHUB, daysAgo(1)),
      makeEvent('b', EventSource.GITHUB, daysAgo(2)),
      makeEvent('c', EventSource.GITHUB, daysAgo(10)),
      makeEvent('d', EventSource.GITHUB, daysAgo(20)),
    ]
    const context = makeContext(events, [makeTopic('t1', events.map((e) => makeEvidence(e.id)))])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    expect(result.trends.trends['t1'].freshness).toBe(0.5)
  })

  it('normalizes activity across the current topic set', async () => {
    const topicA = makeTopic('t1', [
      makeEvidence('a', EventSource.GITHUB),
      makeEvidence('b', EventSource.GITHUB),
    ])
    const topicB = makeTopic('t2', [makeEvidence('c', EventSource.GITHUB)])
    const context = makeContext([], [topicA, topicB])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    expect(result.trends.trends['t1'].activity).toBe(2)
    expect(result.trends.trends['t1'].normalizedActivity).toBe(1)
    expect(result.trends.trends['t2'].activity).toBe(1)
    expect(result.trends.trends['t2'].normalizedActivity).toBe(0.5)
  })

  it('normalizes growth across the current topic set', async () => {
    const context = makeContext(
      [
        makeEvent('a', EventSource.GITHUB, daysAgo(1)),
        makeEvent('b', EventSource.GITHUB, daysAgo(2)),
        makeEvent('c', EventSource.GITHUB, daysAgo(1)),
        makeEvent('d', EventSource.GITHUB, daysAgo(2)),
        makeEvent('e', EventSource.GITHUB, daysAgo(3)),
        makeEvent('f', EventSource.GITHUB, daysAgo(10)),
        makeEvent('g', EventSource.GITHUB, daysAgo(11)),
      ],
      [
        makeTopic('t1', [
          makeEvidence('a', EventSource.GITHUB),
          makeEvidence('b', EventSource.GITHUB),
        ]),
        makeTopic('t2', [
          makeEvidence('c', EventSource.GITHUB),
          makeEvidence('d', EventSource.GITHUB),
          makeEvidence('e', EventSource.GITHUB),
          makeEvidence('f', EventSource.GITHUB),
          makeEvidence('g', EventSource.GITHUB),
        ]),
      ],
    )

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    expect(result.trends.trends['t1'].growthRate).toBe(1)
    expect(result.trends.trends['t1'].normalizedGrowth).toBe(1)
    expect(result.trends.trends['t2'].growthRate).toBe(0.5)
    expect(result.trends.trends['t2'].normalizedGrowth).toBe(0.5)
  })

  it('clamps negative growth to zero during normalization', async () => {
    const context = makeContext(
      [
        makeEvent('a', EventSource.GITHUB, daysAgo(1)),
        makeEvent('b', EventSource.GITHUB, daysAgo(10)),
        makeEvent('c', EventSource.GITHUB, daysAgo(11)),
        makeEvent('d', EventSource.GITHUB, daysAgo(12)),
        makeEvent('e', EventSource.GITHUB, daysAgo(13)),
      ],
      [
        makeTopic('t1', [
          makeEvidence('a', EventSource.GITHUB),
          makeEvidence('b', EventSource.GITHUB),
          makeEvidence('c', EventSource.GITHUB),
          makeEvidence('d', EventSource.GITHUB),
          makeEvidence('e', EventSource.GITHUB),
        ]),
      ],
    )

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    expect(result.trends.trends['t1'].growthRate).toBeCloseTo(-0.75, 10)
    expect(result.trends.trends['t1'].normalizedGrowth).toBe(0)
  })

  it('computes the weighted score from all components', async () => {
    const events = [
      makeEvent('a', EventSource.GITHUB, daysAgo(1)),
      makeEvent('b', EventSource.GITHUB, daysAgo(1)),
    ]
    const context = makeContext(events, [makeTopic('t1', events.map((e) => makeEvidence(e.id)))])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    expect(result.trends.trends['t1'].score).toBeCloseTo(0.8666666667, 8)
  })

  it('keeps the final score within 0.0 – 1.0', async () => {
    const context = makeContext(
      [
        makeEvent('a', EventSource.GITHUB, daysAgo(1)),
        makeEvent('b', EventSource.GITHUB, daysAgo(10)),
        makeEvent('c', EventSource.GITHUB, daysAgo(20)),
        makeEvent('d', EventSource.REDDIT, daysAgo(2)),
        makeEvent('e', EventSource.HACKER_NEWS, daysAgo(30)),
      ],
      [
        makeTopic('t1', [makeEvidence('a'), makeEvidence('d'), makeEvidence('e')]),
        makeTopic('t2', [makeEvidence('b'), makeEvidence('c')]),
      ],
    )

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    for (const topic of Object.values(result.trends.trends)) {
      expect(topic.score).toBeGreaterThanOrEqual(0)
      expect(topic.score).toBeLessThanOrEqual(1)
    }
  })

  it('computes confidence from diversity, freshness and evidence strength', async () => {
    const sources = [EventSource.GITHUB, EventSource.REDDIT, EventSource.HACKER_NEWS]
    const events = Array.from({ length: 10 }, (_, i) =>
      makeEvent(`a${i}`, sources[i % 3], daysAgo(1)),
    )
    const context = makeContext(events, [makeTopic('t1', events.map((e) => makeEvidence(e.id, e.source as EventSource)))])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    const trend = result.trends.trends['t1']
    expect(trend.evidenceStrength).toBe(1)
    expect(trend.confidence).toBeCloseTo(1, 10)
  })

  it('caps evidence strength at 10 evidence events', async () => {
    const sources = [EventSource.GITHUB, EventSource.REDDIT, EventSource.HACKER_NEWS]
    const events = Array.from({ length: 25 }, (_, i) =>
      makeEvent(`a${i}`, sources[i % 3], daysAgo(1)),
    )
    const context = makeContext(events, [makeTopic('t1', events.map((e) => makeEvidence(e.id, e.source as EventSource)))])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    const trend = result.trends.trends['t1']
    expect(trend.evidenceStrength).toBe(1)
    expect(trend.confidence).toBeCloseTo(1, 10)
  })

  it('keeps confidence within 0.0 – 1.0', async () => {
    const context = makeContext(
      [
        makeEvent('a', EventSource.GITHUB, daysAgo(1)),
        makeEvent('b', EventSource.GITHUB, daysAgo(10)),
      ],
      [
        makeTopic('t1', [makeEvidence('a'), makeEvidence('b')]),
        makeTopic('t2', [makeEvidence('a')]),
      ],
    )

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    for (const topic of Object.values(result.trends.trends)) {
      expect(topic.confidence).toBeGreaterThanOrEqual(0)
      expect(topic.confidence).toBeLessThanOrEqual(1)
    }
  })

  it('analyzes multiple topics independently', async () => {
    const context = makeContext(
      [
        makeEvent('a', EventSource.GITHUB, daysAgo(1)),
        makeEvent('b', EventSource.REDDIT, daysAgo(2)),
        makeEvent('c', EventSource.HACKER_NEWS, daysAgo(10)),
        makeEvent('d', EventSource.GITHUB, daysAgo(20)),
      ],
      [
        makeTopic('t1', [makeEvidence('a', EventSource.GITHUB), makeEvidence('b', EventSource.REDDIT)]),
        makeTopic('t2', [makeEvidence('c', EventSource.HACKER_NEWS), makeEvidence('d', EventSource.GITHUB)]),
      ],
    )

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    expect(Object.keys(result.trends.trends).sort()).toEqual(['t1', 't2'])
    const t1 = result.trends.trends['t1']
    const t2 = result.trends.trends['t2']
    expect(t1.recentActivity).toBe(2)
    expect(t1.previousActivity).toBe(0)
    expect(t2.recentActivity).toBe(0)
    expect(t2.previousActivity).toBe(1)
    expect(t1.sourceDiversity).toBeCloseTo(2 / 3, 10)
    expect(t2.sourceDiversity).toBeCloseTo(2 / 3, 10)
  })

  it('produces zero metrics for a topic without evidence', async () => {
    const context = makeContext([], [makeTopic('t1', [])])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    const trend = result.trends.trends['t1']
    expect(trend.activity).toBe(0)
    expect(trend.recentActivity).toBe(0)
    expect(trend.previousActivity).toBe(0)
    expect(trend.growthRate).toBe(0)
    expect(trend.sourceDiversity).toBe(0)
    expect(trend.freshness).toBe(0)
    expect(trend.normalizedActivity).toBe(0)
    expect(trend.normalizedGrowth).toBe(0)
    expect(trend.score).toBe(0)
    expect(trend.confidence).toBe(0)
  })

  it('does not double-count duplicate (topic, event) evidence', async () => {
    const context = makeContext([], [makeTopic('t1', [makeEvidence('a'), makeEvidence('a')])])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    const trend = result.trends.trends['t1']
    expect(trend.activity).toBe(1)
    expect(trend.recentActivity).toBe(0)
    expect(trend.freshness).toBe(0)
  })

  it('counts evidence without a known event timestamp in activity but not in recency', async () => {
    const context = makeContext(
      [makeEvent('a', EventSource.GITHUB, daysAgo(1))],
      [makeTopic('t1', [makeEvidence('a'), makeEvidence('unknown')])],
    )

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    const trend = result.trends.trends['t1']
    expect(trend.activity).toBe(2)
    expect(trend.recentActivity).toBe(1)
    expect(trend.freshness).toBe(0.5)
  })

  it('returns an empty trend set when no topics exist', async () => {
    const context = makeContext([], [])

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    expect(result.trends.trends).toEqual({})
  })

  it('produces identical results on repeated execution (deterministic)', async () => {
    const context = makeContext(
      [
        makeEvent('a', EventSource.GITHUB, daysAgo(1)),
        makeEvent('b', EventSource.REDDIT, daysAgo(10)),
        makeEvent('c', EventSource.HACKER_NEWS, daysAgo(3)),
      ],
      [
        makeTopic('t1', [makeEvidence('a', EventSource.GITHUB), makeEvidence('b', EventSource.REDDIT)]),
        makeTopic('t2', [makeEvidence('c', EventSource.HACKER_NEWS)]),
      ],
    )

    const first = await new DeterministicTrendAnalyzer().analyze(context)
    const second = await new DeterministicTrendAnalyzer().analyze(context)

    expect(first.trends).toEqual(second.trends)
  })

  it('does not mutate the processing context (immutability)', async () => {
    const events = [makeEvent('a', EventSource.GITHUB, daysAgo(1))]
    const topics = [makeTopic('t1', [makeEvidence('a')])]
    const context = makeContext(events, topics)

    const result = await new DeterministicTrendAnalyzer().analyze(context)

    expect(result).not.toBe(context)
    expect(result.trends).not.toBe(context.trends)
    expect(context.trends).toEqual(createTrendResult())
    expect(context.topics).toEqual({ topics })
    expect(result.events).toBe(context.events)
    expect(result.topics).toBe(context.topics)
    expect(context.events).toHaveLength(1)
  })
})
