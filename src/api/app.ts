import express from 'express'
import { createDependencies } from '../bootstrap/dependencies'
import { createHealthRoutes } from '../routes/health-routes'
import { createEventRoutes } from '../routes/event-routes'
import { createProcessingRoutes } from '../routes/processing-routes'
import { createDashboardRoutes } from '../routes/dashboard-routes'
import { errorHandler } from '../middleware/error-handler'
import { notFound } from '../middleware/not-found'

export function createApp(): express.Application {
  const app = express()

  app.use(express.json())

  const deps = createDependencies()

  app.use(createHealthRoutes(deps.healthController))
  app.use(createEventRoutes(deps.eventController))
  app.use(createProcessingRoutes(deps.processingController))
  app.use(createDashboardRoutes(deps.dashboardController))

  app.use(notFound)
  app.use(errorHandler)

  return app
}
