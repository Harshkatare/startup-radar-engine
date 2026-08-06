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

export interface Dependencies {
  client: SQLiteClient
  healthController: HealthController
  eventController: EventController
  processingController: ProcessingController
  dashboardController: DashboardController
}

export function createDependencies(): Dependencies {
  const client = new SQLiteClient()
  client.open()

  const storage = new SQLiteStorage(client)
  storage.runMigrations()

  const queryService = new SQLiteQueryService(client)
  const dashboardService = new DashboardService(client)

  const pipeline = new ProcessingPipeline(storage)
  pipeline.register(new CleaningProcessor())
  pipeline.register(new ClassificationProcessor())
  pipeline.register(new AggregationProcessor())
  pipeline.register(new ScoringProcessor())

  const processingService = new ProcessingService(
    [new GitHubCollector(), new RedditCollector(), new HackerNewsCollector()],
    pipeline,
  )

  const healthController = new HealthController()
  const eventController = new EventController(queryService)
  const processingController = new ProcessingController(processingService)
  const dashboardController = new DashboardController(dashboardService)

  return {
    client,
    healthController,
    eventController,
    processingController,
    dashboardController,
  }
}
