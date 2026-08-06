import express from 'express'
import type { Dependencies } from '../bootstrap/dependencies'
import { createDependencies } from '../bootstrap/dependencies'
import { createHealthRoutes } from '../routes/health-routes'
import { createEventRoutes } from '../routes/event-routes'
import { createProcessingRoutes } from '../routes/processing-routes'
import { createDashboardRoutes } from '../routes/dashboard-routes'
import { errorHandler } from '../middleware/error-handler'
import { notFound } from '../middleware/not-found'

export function createApp(deps?: Dependencies): express.Application {
  const app = express()

  app.use(express.json())

  const resolved = deps ?? createDependencies()

  app.use(createHealthRoutes(resolved.healthController))
  app.use(createEventRoutes(resolved.eventController))
  app.use(createProcessingRoutes(resolved.processingController))
  app.use(createDashboardRoutes(resolved.dashboardController))

  app.use(notFound)
  app.use(errorHandler)

  return app
}
