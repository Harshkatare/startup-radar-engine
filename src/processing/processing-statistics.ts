export interface ProcessingStatistics {
  whitespaceTrimmed: number
  urlsNormalized: number
  metadataEntriesRemoved: number
  duplicatesRemoved: number
}

export function createProcessingStatistics(): ProcessingStatistics {
  return {
    whitespaceTrimmed: 0,
    urlsNormalized: 0,
    metadataEntriesRemoved: 0,
    duplicatesRemoved: 0,
  }
}
