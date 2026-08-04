export interface ClassificationResult {
  categories: string[]
  keywords: string[]
  technologies: string[]
}

export function createClassificationResult(): ClassificationResult {
  return {
    categories: [],
    keywords: [],
    technologies: [],
  }
}
