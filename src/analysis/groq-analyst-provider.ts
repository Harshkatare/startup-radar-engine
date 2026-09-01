import Groq from 'groq-sdk'
import type { AnalystProvider } from './analyst-provider'
import type { AnalystInput } from './analyst-input'
import type { AnalystResult } from './analyst-result'
import { DEFAULT_GROQ_MODEL } from '../config/analyst-config'

export interface GroqAnalystConfig {
  apiKey?: string
  model?: string
  client?: Groq
}

const SYSTEM_PROMPT = `You are a technology trend analyst explaining deterministic signals detected by Startup Radar Engine.
The supplied metrics and evidence are deterministic product intelligence. Interpret and explain them; do not invent, recalculate, or contradict them.
Do NOT recalculate or estimate score, growth rate, confidence, rank, activity, source diversity, or freshness.
Do NOT invent evidence.

You must respond ONLY with a JSON object containing exactly these three fields:
{
  "summary": "Concise interpretation of the topic, its current trajectory, and momentum based on the provided metrics.",
  "whyItMatters": "Why this topic is significant or emerging in the ecosystem, and its implications for builders.",
  "evidenceSummary": "Concise synthesis of the supporting evidence events across sources."
}`

function buildUserPrompt(input: AnalystInput): string {
  const rankStr = input.rank !== null ? `#${input.rank}` : 'unranked'
  const evidenceLines =
    input.evidence.length > 0
      ? input.evidence
          .map((e, idx) => `  ${idx + 1}. [${e.source}] Event ID: ${e.eventId}`)
          .join('\n')
      : '  None'

  return `Explain the following technology topic using only the deterministic product intelligence provided:

Topic: "${input.topic.name}"
Topic ID: ${input.topic.id}

Deterministic Intelligence Metrics:
- Score: ${input.topic.score}
- Growth Rate: ${input.topic.growthRate}
- Confidence: ${input.topic.confidence}
- Rank: ${rankStr}

Trend Intelligence:
- Total Activity: ${input.trend.activity}
- Recent Activity (last 7d): ${input.trend.recentActivity}
- Previous Activity (prior 7d): ${input.trend.previousActivity}
- Source Diversity: ${input.trend.sourceDiversity}
- Freshness: ${input.trend.freshness}

Supporting Evidence (${input.evidence.length} events):
${evidenceLines}

Respond with the required JSON object containing summary, whyItMatters, and evidenceSummary.`
}

interface ModelOutputSchema {
  summary: string
  whyItMatters: string
  evidenceSummary: string
}

function validateModelResponse(parsed: unknown): ModelOutputSchema {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Groq model response failed schema validation: expected JSON object')
  }

  const obj = parsed as Record<string, unknown>

  if (typeof obj.summary !== 'string' || !obj.summary.trim()) {
    throw new Error('Groq model response failed schema validation: "summary" must be a non-empty string')
  }
  if (typeof obj.whyItMatters !== 'string' || !obj.whyItMatters.trim()) {
    throw new Error(
      'Groq model response failed schema validation: "whyItMatters" must be a non-empty string',
    )
  }
  if (typeof obj.evidenceSummary !== 'string' || !obj.evidenceSummary.trim()) {
    throw new Error(
      'Groq model response failed schema validation: "evidenceSummary" must be a non-empty string',
    )
  }

  return {
    summary: obj.summary.trim(),
    whyItMatters: obj.whyItMatters.trim(),
    evidenceSummary: obj.evidenceSummary.trim(),
  }
}

export class GroqAnalystProvider implements AnalystProvider {
  private readonly client: Groq
  private readonly model: string
  private readonly apiKey?: string

  constructor(config: GroqAnalystConfig = {}) {
    this.model = config.model || process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL
    this.apiKey = config.apiKey || process.env.GROQ_API_KEY

    if (config.client) {
      this.client = config.client
    } else {
      if (!this.apiKey) {
        throw new Error('GroqAnalystProvider requires an API key (GROQ_API_KEY)')
      }
      this.client = new Groq({ apiKey: this.apiKey })
    }
  }

  async analyze(input: AnalystInput): Promise<AnalystResult> {
    let completion: any
    try {
      completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(input) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      })
    } catch (err: unknown) {
      throw this.sanitizeError(err)
    }

    const content = completion.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      throw new Error('Groq model returned empty or invalid response content')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      throw new Error('Groq model returned malformed JSON')
    }

    const validated = validateModelResponse(parsed)

    return {
      topicId: input.topic.id, // Application-controlled, NEVER from model
      summary: validated.summary,
      whyItMatters: validated.whyItMatters,
      evidenceSummary: validated.evidenceSummary,
    }
  }

  private sanitizeError(err: unknown): Error {
    const raw = err instanceof Error ? err.message : String(err)
    const sanitized = this.apiKey ? raw.split(this.apiKey).join('[REDACTED]') : raw
    return new Error(`Groq analysis failed: ${sanitized}`)
  }
}
