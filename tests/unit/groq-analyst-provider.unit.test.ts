import { describe, it, expect, vi, afterEach } from 'vitest'
import { GroqAnalystProvider } from '../../src/analysis/groq-analyst-provider'
import type { AnalystInput } from '../../src/analysis/analyst-input'
import { EventSource } from '../../src/types/enums'
import { DEFAULT_GROQ_MODEL } from '../../src/config/analyst-config'

function createSampleInput(overrides: Partial<AnalystInput> = {}): AnalystInput {
  return {
    topic: {
      id: 'topic-test-123',
      name: 'vector-search',
      score: 85.5,
      growthRate: 42.0,
      confidence: 90.0,
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

describe('GroqAnalystProvider (Unit Tests)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws a configuration error if instantiated without an API key or client', () => {
    vi.stubEnv('GROQ_API_KEY', '')

    expect(() => new GroqAnalystProvider()).toThrow(
      'GroqAnalystProvider requires an API key (GROQ_API_KEY)',
    )
  })

  it('transforms AnalystInput into the expected chat completion request with strict grounding prompts', async () => {
    const createMock = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'Vector search is experiencing strong momentum across retrieval systems.',
              whyItMatters: 'Essential infrastructure for modern developer tooling and production RAG pipelines.',
              evidenceSummary: 'Active discussions and developer interest across GitHub and Reddit platforms.',
            }),
          },
        },
      ],
    })

    const mockClient = {
      chat: {
        completions: {
          create: createMock,
        },
      },
    } as any

    const provider = new GroqAnalystProvider({ client: mockClient })
    const input = createSampleInput()

    await provider.analyze(input)

    expect(createMock).toHaveBeenCalledTimes(1)
    const callArgs = createMock.mock.calls[0][0]
    expect(callArgs.model).toBe(DEFAULT_GROQ_MODEL)
    expect(callArgs.response_format).toEqual({ type: 'json_object' })
    expect(callArgs.temperature).toBe(0.2)
    expect(callArgs.messages).toHaveLength(2)

    const [systemMsg, userMsg] = callArgs.messages
    expect(systemMsg.role).toBe('system')
    expect(systemMsg.content).toContain('AUTHORITATIVE FACTS & METRICS (CANONICAL GROUND TRUTH)')
    expect(systemMsg.content).toContain('INTERPRETATION & EXPLANATION GUIDELINES')
    expect(systemMsg.content).toContain('Do NOT recalculate, modify, estimate, or contradict')
    expect(systemMsg.content).toContain('Do NOT invent, assume, or extrapolate startups')
    expect(systemMsg.content).toContain('explicitly acknowledge this limitation rather than speculating')

    expect(userMsg.role).toBe('user')
    expect(userMsg.content).toContain('### AUTHORITATIVE FACTS & METRICS')
    expect(userMsg.content).toContain('Topic: "vector-search"')
    expect(userMsg.content).toContain('Topic ID: topic-test-123')
    expect(userMsg.content).toContain('Score: 85.5')
    expect(userMsg.content).toContain('Rank: #1')
    expect(userMsg.content).toContain('Total Activity: 10')
    expect(userMsg.content).toContain('github')
    expect(userMsg.content).toContain('reddit')
    expect(userMsg.content).toContain('### REQUIRED INTERPRETATION')
  })

  it('includes sparse evidence warning when evidence has 1 or 0 events', async () => {
    const createMock = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'Early emerging topic observed in developer tooling.',
              whyItMatters: 'Preliminary signal indicating emerging developer interest.',
              evidenceSummary: 'Single evidence event recorded from GitHub repository.',
            }),
          },
        },
      ],
    })

    const mockClient = { chat: { completions: { create: createMock } } } as any
    const provider = new GroqAnalystProvider({ client: mockClient })

    await provider.analyze(
      createSampleInput({
        rank: null,
        evidence: [{ eventId: 'evt-single', source: EventSource.GITHUB }],
      }),
    )

    const userMsg = createMock.mock.calls[0][0].messages[1].content
    expect(userMsg).toContain('Rank: unranked')
    expect(userMsg).toContain('Supporting Evidence (1 events):')
    expect(userMsg).toContain('Note: Supporting evidence is sparse/limited. Note this limitation in your explanation rather than speculating.')
  })

  it('formats unranked topic correctly when rank is null and evidence is empty', async () => {
    const createMock = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'No active topic signals detected across sources.',
              whyItMatters: 'Topic exists in directory with zero observed activity.',
              evidenceSummary: 'No supporting evidence events recorded currently.',
            }),
          },
        },
      ],
    })

    const mockClient = { chat: { completions: { create: createMock } } } as any
    const provider = new GroqAnalystProvider({ client: mockClient })

    await provider.analyze(createSampleInput({ rank: null, evidence: [] }))

    const userMsg = createMock.mock.calls[0][0].messages[1].content
    expect(userMsg).toContain('Rank: unranked')
    expect(userMsg).toContain('Supporting Evidence (0 events):\n  None')
    expect(userMsg).toContain('Note: Supporting evidence is sparse/limited')
  })

  it('respects a custom configured model', async () => {
    const createMock = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'Custom model summary for developer topic.',
              whyItMatters: 'Key architecture relevance for engineering teams.',
              evidenceSummary: 'Validated signals across multiple repositories.',
            }),
          },
        },
      ],
    })

    const mockClient = { chat: { completions: { create: createMock } } } as any
    const provider = new GroqAnalystProvider({
      client: mockClient,
      model: 'llama-3.1-8b-instant',
    })

    await provider.analyze(createSampleInput())

    expect(createMock.mock.calls[0][0].model).toBe('llama-3.1-8b-instant')
  })

  it('returns structured AnalystResult matching the contract with application-controlled topicId', async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    topicId: 'rogue-model-topic-id', // Model attempts to provide a different id
                    summary: 'High momentum in developer tooling workflows.',
                    whyItMatters: 'Standardizes retrieval across production enterprise stacks.',
                    evidenceSummary: 'GitHub commits and Reddit developer discussion threads.',
                  }),
                },
              },
            ],
          }),
        },
      },
    } as any

    const provider = new GroqAnalystProvider({ client: mockClient })
    const input = createSampleInput({
      topic: { id: 'canonical-app-topic-id', name: 'vdb', score: 10, growthRate: 5, confidence: 20 },
    })

    const result = await provider.analyze(input)

    // topicId MUST come from input.topic.id, NEVER from the model output
    expect(result.topicId).toBe('canonical-app-topic-id')
    expect(result.summary).toBe('High momentum in developer tooling workflows.')
    expect(result.whyItMatters).toBe('Standardizes retrieval across production enterprise stacks.')
    expect(result.evidenceSummary).toBe('GitHub commits and Reddit developer discussion threads.')
  })

  it('rejects malformed non-JSON output from the model', async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'This is not valid JSON at all.',
                },
              },
            ],
          }),
        },
      },
    } as any

    const provider = new GroqAnalystProvider({ client: mockClient })
    await expect(provider.analyze(createSampleInput())).rejects.toThrow(
      'Groq model returned malformed JSON',
    )
  })

  it('rejects empty or null response content', async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: null,
                },
              },
            ],
          }),
        },
      },
    } as any

    const provider = new GroqAnalystProvider({ client: mockClient })
    await expect(provider.analyze(createSampleInput())).rejects.toThrow(
      'Groq model returned empty or invalid response content',
    )
  })

  it('rejects JSON missing required schema fields or containing empty/placeholder values', async () => {
    const testCases = [
      { payload: { whyItMatters: 'Valid why it matters here', evidenceSummary: 'Valid evidence here' } },
      { payload: { summary: '   ', whyItMatters: 'Valid why it matters here', evidenceSummary: 'Valid evidence here' } },
      { payload: { summary: 'Valid summary here', evidenceSummary: 'Valid evidence here' } },
      { payload: { summary: 'Valid summary here', whyItMatters: 'Valid why it matters here' } },
      { payload: { summary: 'N/A', whyItMatters: 'Valid why it matters here', evidenceSummary: 'Valid evidence here' } },
      { payload: { summary: 'Short', whyItMatters: 'Valid why it matters here', evidenceSummary: 'Valid evidence here' } },
    ]

    for (const { payload } of testCases) {
      const mockClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: JSON.stringify(payload) } }],
            }),
          },
        },
      } as any

      const provider = new GroqAnalystProvider({ client: mockClient })
      await expect(provider.analyze(createSampleInput())).rejects.toThrow(
        /Analyst output validation failed/,
      )
    }
  })

  it('surfaces API errors and redacts the API key from error messages', async () => {
    const secretKey = 'gsk_super_secret_api_key_12345'
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(
            new Error(`Unauthorized: Invalid authorization header with Bearer ${secretKey}`),
          ),
        },
      },
    } as any

    const provider = new GroqAnalystProvider({ client: mockClient, apiKey: secretKey })

    let caughtError: Error | undefined
    try {
      await provider.analyze(createSampleInput())
    } catch (err: any) {
      caughtError = err
    }

    expect(caughtError).toBeDefined()
    expect(caughtError?.message).toContain('Groq analysis failed:')
    expect(caughtError?.message).not.toContain(secretKey)
    expect(caughtError?.message).toContain('[REDACTED]')
  })
})
