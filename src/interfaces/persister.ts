import type { ProcessingContext } from '../processing/processing-context'

export interface Persister {
  persist(context: ProcessingContext): Promise<void>
}
