import type { TopicBuilder } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'
import type { EventSource } from '../../types'
import type { Topic } from './topic-result'

type SignalGroup = {
  categories: string[]
  technologies: string[]
  keywords: string[]
}

export class DeterministicTopicBuilder implements TopicBuilder {
  async build(context: ProcessingContext): Promise<ProcessingContext> {
    const topics = this.generateTopics(context)

    return {
      ...context,
      topics: { topics },
    }
  }

  private generateTopics(context: ProcessingContext): Topic[] {
    const groups = new Map<string, TopicGroup>()

    for (const event of context.events) {
      const signals = this.matchSignals(event.title, event.content, context.classification)
      if (!signals) {
        continue
      }

      const key = signalKey(signals)
      let group = groups.get(key)
      if (!group) {
        group = {
          signals,
          evidence: new Map<string, TopicEvidenceValue>(),
        }
        groups.set(key, group)
      }

      if (!group.evidence.has(event.id)) {
        group.evidence.set(event.id, {
          eventId: event.id,
          source: event.source as EventSource,
        })
      }
    }

    const topics = Array.from(groups.entries()).map(([key, group]) => ({
      id: topicId(key),
      name: topicName(group.signals),
      categories: group.signals.categories,
      technologies: group.signals.technologies,
      keywords: group.signals.keywords,
      evidence: Array.from(group.evidence.values()),
    }))

    topics.sort((a, b) => a.name.localeCompare(b.name))

    return topics
  }

  private matchSignals(
    title: string,
    content: string,
    classification: ProcessingContext['classification'],
  ): SignalGroup | null {
    const text = `${title} ${content}`.toLowerCase()

    const categories = classification.categories.filter((signal) => signalMatches(text, signal)).sort()
    const technologies = classification.technologies.filter((signal) => signalMatches(text, signal)).sort()
    const keywords = classification.keywords.filter((signal) => signalMatches(text, signal)).sort()

    if (categories.length === 0 && technologies.length === 0 && keywords.length === 0) {
      return null
    }

    return { categories, technologies, keywords }
  }
}

interface TopicEvidenceValue {
  eventId: string
  source: EventSource
}

interface TopicGroup {
  signals: SignalGroup
  evidence: Map<string, TopicEvidenceValue>
}

function signalKey(signals: SignalGroup): string {
  const entries = [
    ...signals.categories.map((signal) => `c:${signal}`),
    ...signals.technologies.map((signal) => `t:${signal}`),
    ...signals.keywords.map((signal) => `k:${signal}`),
  ]
  entries.sort()
  return entries.join('|')
}

function topicName(signals: SignalGroup): string {
  return [...signals.categories, ...signals.technologies, ...signals.keywords].join(' / ')
}

function topicId(key: string): string {
  return `topic-${fnv1a(key)}`
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function signalMatches(text: string, signal: string): boolean {
  const needle = signal.trim().toLowerCase()
  if (needle.length === 0) {
    return false
  }
  return new RegExp(`\\b${escapeRegExp(needle)}\\b`).test(text)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}