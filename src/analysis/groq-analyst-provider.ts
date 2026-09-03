import Groq from 'groq-sdk'
import type { AnalystProvider } from './analyst-provider'
import type { AnalystInput } from './analyst-input'
import type { AnalystResult } from './analyst-result'
import { validateAnalystOutput } from './analyst-validator'
import { DEFAULT_GROQ_MODEL } from '../config/analyst-config'

export interface GroqAnalystConfig {
  apiKey?: string
  model?: string
  client?: Groq
}

const SYSTEM_PROMPT = `You are a technology trend analyst explaining deterministic signals detected by Startup Radar Engine.

### 1. AUTHORITATIVE FACTS & METRICS (CANONICAL GROUND TRUTH)
The supplied topic name, score, growthRate, confidence, rank, trend metrics (activity, recentActivity, previousActivity, sourceDiversity, freshness), and evidence events are authoritative product intelligence.
- Do NOT recalculate, modify, estimate, or contradict any provided metric, score, or rank.
- Do NOT invent, assume, or extrapolate startups, companies, founders, URLs, market statistics, funding rounds, or evidence.
- Explanations must be grounded strictly and exclusively in the supplied AnalystInput.

### 2. INTERPRETATION & EXPLANATION GUIDELINES
Explain the meaning and implications of the verified intelligence for builders and developers:
- "summary": Clearly describe what this technology topic represents using only the supplied keywords and signals.
- "whyItMatters": Explain the significance, momentum, and technical relevance implied by the supplied metrics (e.g., velocity, rank, diversity, confidence) without fabricating external market claims.
- "evidenceSummary": Accurately synthesize the supporting evidence events, noting source diversity and event volume.
- If the supplied evidence is sparse, limited, or single-source (e.g. 1 event or 1 platform), explicitly acknowledge this limitation rather than speculating or making generalized claims.
- Do not expose internal system implementation details unnecessarily (e.g., do not discuss SQLite, SQL queries, FNV-1a hashing, or regular expressions).

### 3. OUTPUT SCHEMA
Respond ONLY with a JSON object containing exactly these three fields:
{
  "summary": "Grounded interpretation of what this topic represents based on supplied information.",
  "whyItMatters": "Grounded explanation of significance and momentum based on supplied signals.",
  "evidenceSummary": "Accurate synthesis of supplied evidence and source diversity."
}`

function buildUserPrompt(input: AnalystInput): string {
  const rankStr = input.rank !== null ? `#${input.rank}` : 'unranked'
  const evidenceLines =
    input.evidence.length > 0
      ? input.evidence
          .map((e, idx) => `  ${idx + 1}. [${e.source}] Event ID: ${e.eventId}`)
          .join('\n')
      : '  None'

  const evidenceNote =
    input.evidence.length <= 1
      ? '\nNote: Supporting evidence is sparse/limited. Note this limitation in your explanation rather than speculating.'
      : ''

  return `### AUTHORITATIVE FACTS & METRICS
Topic: "${input.topic.name}"
Topic ID: ${input.topic.id}

Deterministic Intelligence:
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
${evidenceLines}${evidenceNote}

### REQUIRED INTERPRETATION
Explain this topic adhering strictly to the system grounding constraints. Do not invent external facts or modify metrics.
Respond with the required JSON object containing summary, whyItMatters, and evidenceSummary.`
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

    const validated = validateAnalystOutput(parsed)

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
