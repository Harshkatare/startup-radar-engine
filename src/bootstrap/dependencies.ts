import { SQLiteClient } from '../storage/sqlite/sqlite-client'
import { SQLiteStorage } from '../storage/sqlite/sqlite-storage'
import { SQLiteQueryService } from '../query/query-service'
import { DashboardService } from '../services/dashboard-service'
import { ProcessingService } from '../services/processing-service'
import { ProcessingPipeline } from '../processing/processing-pipeline'
import { CleaningProcessor } from '../processing/cleaning-processor'
import { ClassificationProcessor } from '../processing/classification-processor'
import { AggregationProcessor } from '../processing/aggregation-processor'
import { ScoringProcessor } from '../processing/scoring/scoring-processor'
import { GitHubCollector } from '../collectors/github/github-collector'
import { RedditCollector } from '../collectors/reddit/reddit-collector'
import { HackerNewsCollector } from '../collectors/hackernews/hackernews-collector'
import { HealthController } from '../controllers/health-controller'
import { EventController } from '../controllers/event-controller'
import { ProcessingController } from '../controllers/processing-controller'
import { DashboardController } from '../controllers/dashboard-controller'
import { ProcessingLock } from '../scheduler/processing-lock'
import { SchedulerService } from '../scheduler/scheduler-service'
import { Scheduler } from '../scheduler/scheduler'

export interface Dependencies {
  client: SQLiteClient
  storage: SQLiteStorage
  lock: ProcessingLock
  healthController: HealthController
  eventController: EventController
  processingController: ProcessingController
  dashboardController: DashboardController
  scheduler: Scheduler
}

export function createDependencies(client?: SQLiteClient): Dependencies {
  const resolved = client ?? (() => { const c = new SQLiteClient(); c.open(); return c })()

  const storage = new SQLiteStorage(resolved)
  storage.runMigrations()

  const queryService = new SQLiteQueryService(resolved)
  const dashboardService = new DashboardService(resolved)

  const pipeline = new ProcessingPipeline(storage)
  pipeline.register(new CleaningProcessor())
  pipeline.register(new ClassificationProcessor())
  pipeline.register(new AggregationProcessor())
  pipeline.register(new ScoringProcessor())

  const processingService = new ProcessingService(
    [new GitHubCollector(), new RedditCollector(), new HackerNewsCollector()],
    pipeline,
  )

  const lock = new ProcessingLock()
  const schedulerService = new SchedulerService(processingService, lock)
  const scheduler = new Scheduler(schedulerService)

  const healthController = new HealthController()
  const eventController = new EventController(queryService)
  const processingController = new ProcessingController(processingService, lock, schedulerService)
  const dashboardController = new DashboardController(dashboardService)

  return {
    client: resolved,
    storage,
    lock,
    healthController,
    eventController,
    processingController,
    dashboardController,
    scheduler,
  }
}
