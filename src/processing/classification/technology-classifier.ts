import type { Classifier } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

const TECHNOLOGY_KEYWORDS: Record<string, string[]> = {
  React: ['react', 'reactjs', 'react.js'],
  'Next.js': ['nextjs', 'next.js', 'next js'],
  'Node.js': ['nodejs', 'node.js', 'node js'],
  TypeScript: ['typescript', 'ts'],
  Python: ['python'],
  Go: ['golang', 'go '],
  Rust: ['rust'],
  Docker: ['docker'],
  Kubernetes: ['kubernetes', 'k8s'],
  PostgreSQL: ['postgresql', 'postgres'],
  Redis: ['redis'],
  MongoDB: ['mongodb', 'mongo'],
}

function textContainsTechnology(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some((kw) => lower.includes(kw))
}

export class TechnologyClassifier implements Classifier {
  async classify(context: ProcessingContext): Promise<ProcessingContext> {
    const matched = new Set<string>()

    for (const event of context.events) {
      const haystack = `${event.title} ${event.content}`.toLowerCase()

      for (const [tech, keywords] of Object.entries(TECHNOLOGY_KEYWORDS)) {
        if (textContainsTechnology(haystack, keywords)) {
          matched.add(tech)
        }
      }
    }

    return {
      ...context,
      classification: {
        ...context.classification,
        technologies: Array.from(matched),
      },
    }
  }
}
