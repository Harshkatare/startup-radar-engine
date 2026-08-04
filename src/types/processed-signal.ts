export interface ProcessedSignal {
  id: string
  topicId: string
  eventIds: string[]
  classification: string
  score: number
  createdAt: Date
}
