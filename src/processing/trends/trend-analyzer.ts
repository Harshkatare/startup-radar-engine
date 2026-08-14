import type { TrendAnalyzer } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'
import type { Topic, TopicEvidence } from '../topics/topic-result'
import type { TopicTrend } from './trend-result'
import { SCORING_CONFIG } from '../../config'
import { EventSource } from '../../types'

const DAY_MS = 24 * 60 * 60 * 1000

interface TopicMetrics {
  topicId: string
  activity: number
  recentActivity: number
  previousActivity: number
  growthRate: number
  sourceDiversity: number
  freshness: number
  evidenceStrength: number
}

export class DeterministicTrendAnalyzer implements TrendAnalyzer {
  async analyze(context: ProcessingContext): Promise<ProcessingContext> {
    const trends = this.computeTrends(context)

    return {
      ...context,
      trends: { trends },
    }
  }

  private computeTrends(context: ProcessingContext): Record<string, TopicTrend> {
    const topics = context.topics.topics
    if (topics.length === 0) {
      return {}
    }

    const now = context.startedAt.getTime()
    const eventTimes = new Map(context.events.map((event) => [event.id, event.createdAt.getTime()]))

    const metrics = topics.map((topic) => this.computeMetrics(topic, eventTimes, now))

    const maxActivity = Math.max(0, ...metrics.map((metric) => metric.activity))
    const maxGrowth = Math.max(0, ...metrics.map((metric) => metric.growthRate))

    const trends: Record<string, TopicTrend> = {}
    for (const metric of metrics) {
      const normalizedActivity = maxActivity > 0 ? metric.activity / maxActivity : 0
      const normalizedGrowth = maxGrowth > 0 ? Math.max(0, metric.growthRate) / maxGrowth : 0

      const score = clamp01(
        SCORING_CONFIG.trendScore.activityWeight * normalizedActivity +
          SCORING_CONFIG.trendScore.growthWeight * normalizedGrowth +
          SCORING_CONFIG.trendScore.diversityWeight * metric.sourceDiversity +
          SCORING_CONFIG.trendScore.freshnessWeight * metric.freshness,
      )

      const confidence = clamp01(
        SCORING_CONFIG.trendConfidence.diversityWeight * metric.sourceDiversity +
          SCORING_CONFIG.trendConfidence.freshnessWeight * metric.freshness +
          SCORING_CONFIG.trendConfidence.evidenceStrengthWeight * metric.evidenceStrength,
      )

      trends[metric.topicId] = {
        ...metric,
        normalizedActivity,
        normalizedGrowth,
        score,
        confidence,
      }
    }

    return trends
  }

  private computeMetrics(topic: Topic, eventTimes: Map<string, number>, now: number): TopicMetrics {
    const evidence = uniqueEvidence(topic.evidence)
    const activity = evidence.length

    let recentActivity = 0
    let previousActivity = 0
    const sources = new Set<EventSource>()

    for (const item of evidence) {
      sources.add(item.source)
      const time = eventTimes.get(item.eventId)
      if (time === undefined) {
        continue
      }
      if (time >= now - 7 * DAY_MS && time <= now) {
        recentActivity++
      } else if (time >= now - 14 * DAY_MS && time < now - 7 * DAY_MS) {
        previousActivity++
      }
    }

    const growthRate =
      previousActivity > 0
        ? (recentActivity - previousActivity) / previousActivity
        : recentActivity > 0
          ? 1
          : 0

    const sourceDiversity = sources.size / supportedSourceCount()
    const freshness = activity > 0 ? recentActivity / activity : 0
    const evidenceStrength = Math.min(
      activity / SCORING_CONFIG.trendConfidence.evidenceStrengthDivisor,
      1,
    )

    return {
      topicId: topic.id,
      activity,
      recentActivity,
      previousActivity,
      growthRate,
      sourceDiversity,
      freshness,
      evidenceStrength,
    }
  }
}

function uniqueEvidence(evidence: TopicEvidence[]): TopicEvidence[] {
  const seen = new Map<string, TopicEvidence>()
  for (const item of evidence) {
    if (!seen.has(item.eventId)) {
      seen.set(item.eventId, item)
    }
  }
  return Array.from(seen.values())
}

function supportedSourceCount(): number {
  return Object.values(EventSource).length
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}
