export interface Event {
  id: string
  source: string
  externalId: string
  title: string
  content: string
  metadata: Record<string, unknown>
  createdAt: Date
}
