import { describe, it, expect } from 'vitest'
import { DeterministicTopicBuilder } from '../../src/processing/topics/deterministic-topic-builder'
import { createProcessingStatistics } from '../../src/processing/processing-statistics'
import { createAggregationResult } from '../../src/processing/aggregation/aggregation-result'
import { createScoreResult } from '../../src/processing/scoring/score-result'
import { createTopicResult } from '../../src/processing/topics/topic-result'
import { createTrendResult } from '../../src/processing/trends/trend-result'
import { EventSource } from '../../src/types'
import type { Event } from '../../src/types'
import type { ProcessingContext } from '../../src/processing/processing-context'

interface Signals {
  categories: string[]
  technologies: string[]
  keywords: string[]
}

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: 'e1',
    source: EventSource.GITHUB,
    externalId: 'ext-1',
    title: '',
    content: '',
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function makeContext(events: Event[], signals: Signals): ProcessingContext {
  return {
    events,
    source: EventSource.GITHUB,
    startedAt: new Date('2026-01-01T00:00:00.000Z'),
    statistics: createProcessingStatistics(),
    classification: {
      categories: [...signals.categories],
      technologies: [...signals.technologies],
      keywords: [...signals.keywords],
    },
    aggregation: createAggregationResult(),
    score: createScoreResult(),
    topics: createTopicResult(),
    trends: createTrendResult(),
  }
}

describe('DeterministicTopicBuilder', () => {
  it('groups events with identical signals into the same topic', async () => {
    const events = [
      makeEvent({ id: 'a', title: 'AI coding agent built with Python', content: 'automates software agents' }),
      makeEvent({ id: 'b', title: 'Python agent framework for AI', content: 'open source agents toolkit' }),
    ]
    const signals: Signals = { categories: ['AI'], technologies: ['Python'], keywords: ['agents'] }

    const result = await new DeterministicTopicBuilder().build(makeContext(events, signals))

    expect(result.topics.topics).toHaveLength(1)
    const topic = result.topics.topics[0]
    expect(topic.name).toBe('AI / Python / agents')
    expect(topic.evidence.map((evidence) => evidence.eventId).sort()).toEqual(['a', 'b'])
  })

  it('places events with different signals into different topics', async () => {
    const events = [
      makeEvent({ id: 'a', title: 'AI coding agent built with Python', content: 'automates software agents' }),
      makeEvent({ id: 'c', title: 'Docker deployment pipeline for DevOps', content: 'container deployment' }),
    ]
    const signals: Signals = {
      categories: ['AI', 'DevOps'],
      technologies: ['Python', 'Docker'],
      keywords: ['agents', 'deployment'],
    }

    const result = await new DeterministicTopicBuilder().build(makeContext(events, signals))

    expect(result.topics.topics).toHaveLength(2)
    expect(result.topics.topics.map((topic) => topic.name).sort()).toEqual([
      'AI / Python / agents',
      'DevOps / Docker / deployment',
    ])
  })

  it('attaches all matching events as evidence with their sources', async () => {
    const events = [
      makeEvent({ id: 'a', source: EventSource.GITHUB, title: 'AI coding agent in Python', content: 'agents for developers' }),
      makeEvent({ id: 'b', source: EventSource.REDDIT, title: 'AI agent written in Python', content: 'python agents discussion' }),
      makeEvent({ id: 'c', source: EventSource.HACKER_NEWS, title: 'Python AI agent library', content: 'build agents with python' }),
    ]
    const signals: Signals = { categories: ['AI'], technologies: ['Python'], keywords: ['agents'] }

    const result = await new DeterministicTopicBuilder().build(makeContext(events, signals))

    const topic = result.topics.topics[0]
    expect(topic.evidence).toHaveLength(3)
    expect(topic.evidence.map((evidence) => evidence.eventId).sort()).toEqual(['a', 'b', 'c'])
    expect(topic.evidence.map((evidence) => evidence.source).sort()).toEqual([
      EventSource.GITHUB,
      EventSource.HACKER_NEWS,
      EventSource.REDDIT,
    ])
  })

  it('prevents duplicate evidence for the same event', async () => {
    const event = makeEvent({ id: 'a', title: 'AI coding agent in Python', content: 'agents for developers' })
    const events = [event, event]
    const signals: Signals = { categories: ['AI'], technologies: ['Python'], keywords: ['agents'] }

    const result = await new DeterministicTopicBuilder().build(makeContext(events, signals))

    expect(result.topics.topics).toHaveLength(1)
    expect(result.topics.topics[0].evidence).toHaveLength(1)
    expect(result.topics.topics[0].evidence[0].eventId).toBe('a')
  })

  it('produces stable deterministic topic ids from the topic key', async () => {
    const events = [
      makeEvent({ id: 'a', title: 'AI coding agent built with Python', content: 'automates software agents' }),
      makeEvent({ id: 'b', title: 'Python agent framework for AI', content: 'open source agents toolkit' }),
    ]
    const signals: Signals = { categories: ['AI'], technologies: ['Python'], keywords: ['agents'] }

    const first = await new DeterministicTopicBuilder().build(makeContext(events, signals))
    const second = await new DeterministicTopicBuilder().build(makeContext(events, signals))

    expect(first.topics.topics[0].id).toMatch(/^topic-[0-9a-f]{8}$/)
    expect(first.topics.topics[0].id).toBe(second.topics.topics[0].id)
  })

  it('ignores events without usable signals', async () => {
    const events = [
      makeEvent({ id: 'x', title: 'Music festival announced', content: 'local band lineup ticket sale' }),
    ]
    const signals: Signals = { categories: ['AI'], technologies: ['Python'], keywords: ['agents'] }

    const result = await new DeterministicTopicBuilder().build(makeContext(events, signals))

    expect(result.topics.topics).toHaveLength(0)
  })

  it('does not include signal-less events in topics alongside signal events', async () => {
    const events = [
      makeEvent({ id: 'a', title: 'AI coding agent built with Python', content: 'automates software agents' }),
      makeEvent({ id: 'x', title: 'Music festival announced', content: 'local band lineup ticket sale' }),
    ]
    const signals: Signals = { categories: ['AI'], technologies: ['Python'], keywords: ['agents'] }

    const result = await new DeterministicTopicBuilder().build(makeContext(events, signals))

    expect(result.topics.topics).toHaveLength(1)
    expect(result.topics.topics[0].evidence.map((evidence) => evidence.eventId)).toEqual(['a'])
  })

  it('preserves matched signals on the resulting topic', async () => {
    const events = [
      makeEvent({ id: 'a', title: 'AI coding agent built with Python', content: 'automates software agents' }),
    ]
    const signals: Signals = { categories: ['AI'], technologies: ['Python'], keywords: ['agents'] }

    const result = await new DeterministicTopicBuilder().build(makeContext(events, signals))

    const topic = result.topics.topics[0]
    expect(topic.categories).toEqual(['AI'])
    expect(topic.technologies).toEqual(['Python'])
    expect(topic.keywords).toEqual(['agents'])
  })

  it('leaves existing classification data unchanged', async () => {
    const events = [
      makeEvent({ id: 'a', title: 'AI coding agent built with Python', content: 'automates software agents' }),
    ]
    const context = makeContext(events, { categories: ['AI'], technologies: ['Python'], keywords: ['agents'] })
    const classificationSnapshot = {
      categories: ['AI'],
      technologies: ['Python'],
      keywords: ['agents'],
    }

    const result = await new DeterministicTopicBuilder().build(context)

    expect(context.classification).toEqual(classificationSnapshot)
    expect(result.classification).toBe(context.classification)
  })

  it('does not mutate the processing context (immutability)', async () => {
    const events = [
      makeEvent({ id: 'a', title: 'AI coding agent built with Python', content: 'automates software agents' }),
      makeEvent({ id: 'b', title: 'Python agent framework for AI', content: 'open source agents toolkit' }),
    ]
    const context = makeContext(events, { categories: ['AI'], technologies: ['Python'], keywords: ['agents'] })

    const result = await new DeterministicTopicBuilder().build(context)

    expect(result).not.toBe(context)
    expect(result.topics).not.toBe(context.topics)
    expect(context.topics).toEqual(createTopicResult())
    expect(result.events).toBe(context.events)
    expect(context.events).toHaveLength(2)
    expect(context.events[0]).toBe(events[0])
    expect(context.events[1]).toBe(events[1])
    expect(context.statistics).toEqual(createProcessingStatistics())
  })
})