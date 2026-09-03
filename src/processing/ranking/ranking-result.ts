export interface RankedTopic {
  rank: number
  topicId: string
  score: number
  growthRate: number
  confidence: number
}

export interface RankingResult {
  rankedTopics: RankedTopic[]
}

export function createRankingResult(): RankingResult {
  return {
    rankedTopics: [],
  }
}
