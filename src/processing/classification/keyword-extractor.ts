import type { Classifier } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'it', 'at', 'on', 'in', 'of', 'to', 'for',
  'with', 'by', 'and', 'or', 'not', 'no', 'but', 'from', 'as', 'be',
  'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'shall', 'can', 'its', 'this', 'that', 'these', 'those', 'we', 'he',
  'she', 'they', 'them', 'their', 'all', 'each', 'every', 'some', 'any',
  'get', 'use', 'set', 'new', 'one', 'two', 'also', 'more', 'how', 'what',
  'why', 'when', 'where', 'who', 'which', 'about', 'into', 'than', 'then',
  'just', 'now', 'so', 'if', 'has', 'had', 'been', 'very', 'too', 'own',
  'our', 'out', 'his', 'her', 'him', 'up', 'down', 'off', 'over', 'under',
  'here', 'there', 'need', 'like', 'make', 'made', 'way', 'back',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
}

export class KeywordExtractor implements Classifier {
  async classify(context: ProcessingContext): Promise<ProcessingContext> {
    const unique = new Set<string>()

    for (const event of context.events) {
      const raw = `${event.title} ${event.content}`
      const tokens = tokenize(raw)
      for (const token of tokens) {
        if (token.length >= 3 && !STOP_WORDS.has(token)) {
          unique.add(token)
        }
      }
    }

    return {
      ...context,
      classification: {
        ...context.classification,
        keywords: Array.from(unique).sort(),
      },
    }
  }
}
