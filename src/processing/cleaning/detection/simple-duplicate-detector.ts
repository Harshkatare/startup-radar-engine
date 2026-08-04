import type { Event } from '../../../types'
import type { DuplicateDetector } from '../../../interfaces'

const URL_KEYS = new Set(['url', 'repositoryUrl', 'link', 'homepage'])

function normalizeUrlForComparison(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    parsed.protocol = parsed.protocol.toLowerCase()
    parsed.host = parsed.host.toLowerCase()
    let result = parsed.toString()
    if (result.endsWith('/')) result = result.slice(0, -1)
    return result
  } catch {
    return null
  }
}

function extractUrls(event: Event): Set<string> {
  const urls = new Set<string>()
  if (!event.metadata || typeof event.metadata !== 'object') return urls
  const meta = event.metadata as Record<string, unknown>
  for (const key of Object.keys(meta)) {
    if (URL_KEYS.has(key)) {
      const normalized = normalizeUrlForComparison(meta[key])
      if (normalized) urls.add(normalized)
    }
  }
  return urls
}

export class SimpleDuplicateDetector implements DuplicateDetector {
  async isDuplicate(event: Event, existingEvents: Event[]): Promise<boolean> {
    const candidateUrls = extractUrls(event)

    for (const existing of existingEvents) {
      if (existing.source === event.source && existing.externalId === event.externalId) {
        return true
      }

      if (candidateUrls.size > 0) {
        const existingUrls = extractUrls(existing)
        for (const url of candidateUrls) {
          if (existingUrls.has(url)) return true
        }
      }
    }

    return false
  }
}
