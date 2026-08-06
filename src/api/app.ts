import express from 'express'
import { HealthController } from '../controllers/health-controller'
import { EventController } from '../controllers/event-controller'
import { ProcessingController } from '../controllers/processing-controller'
import { createHealthRoutes } from '../routes/health-routes'
import { createEventRoutes } from '../routes/event-routes'
import { createProcessingRoutes } from '../routes/processing-routes'
import { errorHandler } from '../middleware/error-handler'
import { notFound } from '../middleware/not-found'
import { SQLiteClient } from '../storage/sqlite/sqlite-client'
import { SQLiteQueryService } from '../query/query-service'
import { ProcessingService } from '../services/processing-service'
import { ProcessingPipeline } from '../processing/processing-pipeline'
import { CleaningProcessor } from '../processing/cleaning-processor'
import { ClassificationProcessor } from '../processing/classification-processor'
import { AggregationProcessor } from '../processing/aggregation-processor'
import { ScoringProcessor } from '../processing/scoring/scoring-processor'
import { SQLiteStorage } from '../storage/sqlite/sqlite-storage'
import { GitHubCollector } from '../collectors/github/github-collector'
import { RedditCollector } from '../collectors/reddit/reddit-collector'
import { HackerNewsCollector } from '../collectors/hackernews/hackernews-collector'

export function createApp(): express.Application {
  const app = express()

  app.use(express.json())

  const client = new SQLiteClient()
  client.open()

  const storage = new SQLiteStorage(client)
  storage.runMigrations()

  const queryService = new SQLiteQueryService(client)

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

  app.use(createHealthRoutes(healthController))
  app.use(createEventRoutes(eventController))
  app.use(createProcessingRoutes(processingController))

  app.use(notFound)
  app.use(errorHandler)

  return app
}
