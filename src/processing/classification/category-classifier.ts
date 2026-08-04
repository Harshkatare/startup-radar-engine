import type { Classifier } from '../../interfaces'
import type { ProcessingContext } from '../processing-context'

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  AI: ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'nlp', 'llm', 'chatbot', 'gpt', 'neural', 'computer vision', 'transformer', 'language model', 'rag'],
  'Developer Tools': ['developer tools', 'ide', 'compiler', 'sdk', 'api', 'framework', 'library', 'cli', 'devtools', 'debugger', 'linter', 'package manager'],
  DevOps: ['devops', 'ci/cd', 'pipeline', 'deployment', 'container', 'orchestration', 'monitoring', 'kubernetes', 'docker', 'terraform', 'ansible', 'jenkins', 'github actions'],
  Security: ['security', 'cybersecurity', 'encryption', 'authentication', 'vulnerability', 'firewall', 'malware', 'zero trust', 'penetration', 'compliance'],
  Data: ['data', 'database', 'analytics', 'big data', 'etl', 'data pipeline', 'data warehouse', 'data lake', 'sql', 'nosql', 'visualization'],
  Cloud: ['cloud', 'aws', 'azure', 'gcp', 'serverless', 'lambda', 'cloud native', 'multi-cloud', 'edge computing'],
  FinTech: ['fintech', 'payment', 'banking', 'blockchain', 'crypto', 'finance', 'trading', 'insurtech', 'defi', 'digital wallet'],
  HealthTech: ['healthtech', 'healthcare', 'medical', 'biotech', 'health', 'clinical', 'telemedicine', 'digital health', 'medtech', 'patient'],
}

function textContainsKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword)
}

export class CategoryClassifier implements Classifier {
  async classify(context: ProcessingContext): Promise<ProcessingContext> {
    const matched = new Set<string>()

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const event of context.events) {
        const haystack = `${event.title} ${event.content}`.toLowerCase()
        const found = keywords.some((kw) => haystack.includes(kw))
        if (found) {
          matched.add(category)
          break
        }
      }
    }

    return {
      ...context,
      classification: {
        ...context.classification,
        categories: Array.from(matched),
      },
    }
  }
}
