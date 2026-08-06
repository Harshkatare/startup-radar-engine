import { ProcessingService } from '../services/processing-service'
import { ProcessingLock } from './processing-lock'

export type RunStatus = 'completed' | 'failed' | 'running'

export class SchedulerService {
  private _lastRun: string | null = null
  private _lastDurationMs: number | null = null
  private _lastStatus: RunStatus | null = null

  constructor(
    private readonly processingService: ProcessingService,
    private readonly lock: ProcessingLock,
  ) {}

  get lastRun(): string | null {
    return this._lastRun
  }

  get lastDurationMs(): number | null {
    return this._lastDurationMs
  }

  get lastStatus(): RunStatus | null {
    return this._lastStatus
  }

  get running(): boolean {
    return this.lock.isRunning()
  }

  async execute(): Promise<void> {
    if (!this.lock.acquire()) {
      console.log('Processing skipped (already running)')
      return
    }

    this._lastStatus = 'running'
    const start = Date.now()
    console.log('Processing started')

    try {
      await this.processingService.run()
      this._lastStatus = 'completed'
      console.log('Processing completed')
    } catch (err) {
      this._lastStatus = 'failed'
      const message = err instanceof Error ? err.message : String(err)
      console.log('Processing failed:', message)
    } finally {
      this._lastDurationMs = Date.now() - start
      this._lastRun = new Date().toISOString()
      this.lock.release()
    }
  }
}
