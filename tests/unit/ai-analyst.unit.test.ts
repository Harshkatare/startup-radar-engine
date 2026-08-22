import { describe, it, expect, vi } from 'vitest'
import { AIAnalystService } from '../../src/analysis/ai-analyst'
import { DeterministicAnalystProvider } from '../../src/analysis/deterministic-analyst-provider'
import type { AnalystInput, AnalystResult, AnalystProvider } from '../../src/analysis'
import { EventSource } from '../../src/types'

function createSampleInput(overrides?: Partial<AnalystInput>): AnalystInput {
  return {
    topic: {
      id: 'topic-1',
      name: 'AI / TypeScript / agents',
      score: 0.85,
      growthRate: 0.5,
      confidence: 0.9,
    },
    rank: 1,
    evidence: [
      { eventId: 'evt-1', source: EventSource.GITHUB },
      { eventId: 'evt-2', source: EventSource.REDDIT },
    ],
    trend: {
      activity: 10,
      recentActivity: 7,
      previousActivity: 3,
      sourceDiversity: 0.67,
      freshness: 0.7,
    },
    ...overrides,
  }
}

describe('AIAnalystService', () => {
  it('delegates analysis to the injected provider and returns the result', async () => {
    const expectedResult: AnalystResult = {
      topicId: 'topic-1',
      summary: 'Stub summary',
      whyItMatters: 'Stub importance',
      evidenceSummary: 'Stub evidence',
    }

    const mockProvider: AnalystProvider = {
      analyze: vi.fn().mockResolvedValue(expectedResult),
    }

    const service = new AIAnalystService(mockProvider)
    const input = createSampleInput()

    const result = await service.analyze(input)

    expect(result).toEqual(expectedResult)
    expect(mockProvider.analyze).toHaveBeenCalledTimes(1)
    expect(mockProvider.analyze).toHaveBeenCalledWith(input)
  })

  it('works with a custom test stub provider', async () => {
    class CustomStubProvider implements AnalystProvider {
      async analyze(input: AnalystInput): Promise<AnalystResult> {
        return {
          topicId: input.topic.id,
          summary: `Custom summary for ${input.topic.name}`,
          whyItMatters: 'Custom significance',
          evidenceSummary: `${input.evidence.length} items`,
        }
      }
    }

    const service = new AIAnalystService(new CustomStubProvider())
    const input = createSampleInput()
    const result = await service.analyze(input)

    expect(result.topicId).toBe('topic-1')
    expect(result.summary).toBe('Custom summary for AI / TypeScript / agents')
    expect(result.evidenceSummary).toBe('2 items')
  })

  it('does not mutate the input object', async () => {
    const provider = new DeterministicAnalystProvider()
    const service = new AIAnalystService(provider)
    const input = createSampleInput()
    const inputSnapshot = JSON.parse(JSON.stringify(input))

    await service.analyze(input)

    expect(input).toEqual(inputSnapshot)
  })
})

describe('DeterministicAnalystProvider', () => {
  it('produces deterministic output with expected structure', async () => {
    const provider = new DeterministicAnalystProvider()
    const input = createSampleInput()

    const result = await provider.analyze(input)

    expect(result.topicId).toBe('topic-1')
    expect(result.summary).toBe(
      'Topic "AI / TypeScript / agents" has score 0.85 and growth rate 0.5. Ranked #1.',
    )
    expect(result.whyItMatters).toBe(
      'Topic shows activity level of 10 with freshness 0.7 and source diversity 0.67.',
    )
    expect(result.evidenceSummary).toBe('Backed by 2 evidence items across sources.')
  })

  it('produces the exact same result for identical input across multiple calls', async () => {
    const provider = new DeterministicAnalystProvider()
    const input = createSampleInput()

    const result1 = await provider.analyze(input)
    const result2 = await provider.analyze(input)

    expect(result1).toEqual(result2)
  })

  it('handles rank null gracefully without adding rank text', async () => {
    const provider = new DeterministicAnalystProvider()
    const input = createSampleInput({ rank: null })

    const result = await provider.analyze(input)

    expect(result.topicId).toBe('topic-1')
    expect(result.summary).toBe(
      'Topic "AI / TypeScript / agents" has score 0.85 and growth rate 0.5.',
    )
    expect(result.summary).not.toContain('Ranked')
  })

  it('handles zero and empty trend values correctly', async () => {
    const provider = new DeterministicAnalystProvider()
    const input = createSampleInput({
      topic: {
        id: 'topic-zero',
        name: 'Empty Topic',
        score: 0,
        growthRate: 0,
        confidence: 0,
      },
      rank: null,
      evidence: [],
      trend: {
        activity: 0,
        recentActivity: 0,
        previousActivity: 0,
        sourceDiversity: 0,
        freshness: 0,
      },
    })

    const result = await provider.analyze(input)

    expect(result.topicId).toBe('topic-zero')
    expect(result.summary).toBe('Topic "Empty Topic" has score 0 and growth rate 0.')
    expect(result.whyItMatters).toBe(
      'Topic shows activity level of 0 with freshness 0 and source diversity 0.',
    )
    expect(result.evidenceSummary).toBe('Backed by 0 evidence items across sources.')
  })

  it('operates purely in memory without external dependencies or side effects', async () => {
    const provider = new DeterministicAnalystProvider()
    const input = createSampleInput({
      evidence: [
        { eventId: 'e-1', source: EventSource.GITHUB },
        { eventId: 'e-2', source: EventSource.HACKERNEWS },
        { eventId: 'e-3', source: EventSource.REDDIT },
      ],
    })

    const result = await provider.analyze(input)

    expect(result.evidenceSummary).toBe('Backed by 3 evidence items across sources.')
  })
})
