export interface ScoreResult {
  categoryScores: Record<string, number>
  technologyScores: Record<string, number>
  keywordScores: Record<string, number>
}

export function createScoreResult(): ScoreResult {
  return {
    categoryScores: {},
    technologyScores: {},
    keywordScores: {},
  }
}
