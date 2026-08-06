import { SchedulerService } from './scheduler-service'

const DEFAULT_INTERVAL_MINUTES = 60

export class Scheduler {
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly service: SchedulerService) {}

  start(intervalMinutes: number = DEFAULT_INTERVAL_MINUTES): void {
    if (this.timer) return

    this.timer = setInterval(() => {
      this.service.execute()
    }, intervalMinutes * 60 * 1000)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
