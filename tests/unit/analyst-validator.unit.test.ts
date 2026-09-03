import { describe, it, expect } from 'vitest'
import { validateAnalystOutput } from '../../src/analysis/analyst-validator'

describe('validateAnalystOutput', () => {
  const validOutput = {
    summary: 'Autonomous AI agents are expanding rapidly across developer tooling workflows.',
    whyItMatters: 'High velocity and cross-platform traction indicate strong adoption for autonomous dev workflows.',
    evidenceSummary: 'Supported by 5 events across GitHub and HackerNews indicating strong developer engagement.',
  }

  it('validates and returns trimmed valid analyst output', () => {
    const result = validateAnalystOutput({
      summary: `  ${validOutput.summary}  `,
      whyItMatters: `  ${validOutput.whyItMatters}  `,
      evidenceSummary: `  ${validOutput.evidenceSummary}  `,
    })

    expect(result).toEqual(validOutput)
  })

  it('throws when input is not an object or is null/array', () => {
    expect(() => validateAnalystOutput(null)).toThrow('Analyst output validation failed: expected a JSON object')
    expect(() => validateAnalystOutput('string')).toThrow('Analyst output validation failed: expected a JSON object')
    expect(() => validateAnalystOutput(123)).toThrow('Analyst output validation failed: expected a JSON object')
    expect(() => validateAnalystOutput([])).toThrow('Analyst output validation failed: expected a JSON object')
  })

  it('throws when required fields are missing', () => {
    expect(() =>
      validateAnalystOutput({
        whyItMatters: validOutput.whyItMatters,
        evidenceSummary: validOutput.evidenceSummary,
      }),
    ).toThrow('Analyst output validation failed: "summary" must be a string')

    expect(() =>
      validateAnalystOutput({
        summary: validOutput.summary,
        evidenceSummary: validOutput.evidenceSummary,
      }),
    ).toThrow('Analyst output validation failed: "whyItMatters" must be a string')

    expect(() =>
      validateAnalystOutput({
        summary: validOutput.summary,
        whyItMatters: validOutput.whyItMatters,
      }),
    ).toThrow('Analyst output validation failed: "evidenceSummary" must be a string')
  })

  it('throws when fields are non-string types', () => {
    expect(() =>
      validateAnalystOutput({
        ...validOutput,
        summary: 123456789012345,
      }),
    ).toThrow('Analyst output validation failed: "summary" must be a string')
  })

  it('throws when fields are empty or whitespace-only', () => {
    expect(() =>
      validateAnalystOutput({
        ...validOutput,
        summary: '   ',
      }),
    ).toThrow('Analyst output validation failed: "summary" must not be empty or whitespace-only')

    expect(() =>
      validateAnalystOutput({
        ...validOutput,
        whyItMatters: '',
      }),
    ).toThrow('Analyst output validation failed: "whyItMatters" must not be empty or whitespace-only')
  })

  it('throws when fields are too brief to be meaningful (< 15 characters)', () => {
    expect(() =>
      validateAnalystOutput({
        ...validOutput,
        summary: 'Short topic',
      }),
    ).toThrow('Analyst output validation failed: "summary" is too brief to be meaningful (< 15 characters)')

    expect(() =>
      validateAnalystOutput({
        ...validOutput,
        evidenceSummary: '1 event here',
      }),
    ).toThrow('Analyst output validation failed: "evidenceSummary" is too brief to be meaningful (< 15 characters)')
  })

  it('throws when fields contain placeholder or unusable values', () => {
    const placeholders = [
      'N/A',
      'n/a',
      'None',
      'null',
      'undefined',
      'TODO',
      'unknown',
      'placeholder',
      'No summary',
      'No data',
      'No comment',
      'No evidence',
      'Not applicable',
      'TBD',
    ]

    for (const placeholder of placeholders) {
      expect(() =>
        validateAnalystOutput({
          ...validOutput,
          whyItMatters: placeholder,
        }),
      ).toThrow()
    }
  })
})
