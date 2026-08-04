import type { Cleaner } from '../../../interfaces'
import type { ProcessingContext } from '../../processing-context'

const URL_KEYS = new Set(['url', 'repositoryUrl', 'link', 'homepage'])

function normalizeUrl(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  try {
    const parsed = new URL(trimmed)
    parsed.protocol = parsed.protocol.toLowerCase()
    parsed.host = parsed.host.toLowerCase()
    let result = parsed.toString()
    if (result.endsWith('/')) result = result.slice(0, -1)
    return result
  } catch {
    return trimmed
  }
}

export class UrlNormalizer implements Cleaner {
  async clean(context: ProcessingContext): Promise<ProcessingContext> {
    let count = 0

    const events = context.events.map((event) => {
      if (!event.metadata || typeof event.metadata !== 'object') return event
      const meta = event.metadata as Record<string, unknown>
      const hasUrlField = Object.keys(meta).some((k) => URL_KEYS.has(k))
      if (!hasUrlField) return event
      const updated: Record<string, unknown> = {}
      for (const key of Object.keys(meta)) {
        if (URL_KEYS.has(key)) {
          const original = meta[key]
          const normalized = normalizeUrl(original)
          updated[key] = normalized
          if (normalized !== original) count++
        } else {
          updated[key] = meta[key]
        }
      }
      return { ...event, metadata: updated }
    })

    return {
      ...context,
      events,
      statistics: {
        ...context.statistics,
        urlsNormalized: context.statistics.urlsNormalized + count,
      },
    }
  }
}
