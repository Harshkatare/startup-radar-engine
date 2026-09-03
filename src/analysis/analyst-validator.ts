export interface ValidatedAnalystOutput {
  summary: string
  whyItMatters: string
  evidenceSummary: string
}

const PLACEHOLDER_PATTERNS = [
  /^n\/?a$/i,
  /^none$/i,
  /^null$/i,
  /^undefined$/i,
  /^todo$/i,
  /^unknown$/i,
  /^placeholder$/i,
  /^no (summary|data|comment|evidence)$/i,
  /^not (available|applicable|specified)$/i,
  /^tbd$/i,
]

const MIN_FIELD_LENGTH = 15

export function validateAnalystOutput(parsed: unknown): ValidatedAnalystOutput {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Analyst output validation failed: expected a JSON object')
  }

  const obj = parsed as Record<string, unknown>

  const summary = validateField(obj.summary, 'summary')
  const whyItMatters = validateField(obj.whyItMatters, 'whyItMatters')
  const evidenceSummary = validateField(obj.evidenceSummary, 'evidenceSummary')

  return {
    summary,
    whyItMatters,
    evidenceSummary,
  }
}

function validateField(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Analyst output validation failed: "${fieldName}" must be a string`)
  }

  const trimmed = value.trim()
  if (trimmed.length === 0) {
    throw new Error(
      `Analyst output validation failed: "${fieldName}" must not be empty or whitespace-only`,
    )
  }

  if (trimmed.length < MIN_FIELD_LENGTH) {
    throw new Error(
      `Analyst output validation failed: "${fieldName}" is too brief to be meaningful (< ${MIN_FIELD_LENGTH} characters)`,
    )
  }

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error(
        `Analyst output validation failed: "${fieldName}" contains placeholder or unusable text`,
      )
    }
  }

  return trimmed
}
