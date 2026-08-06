import { Router } from 'express'
import { DashboardController } from '../controllers/dashboard-controller'

export function createDashboardRoutes(controller: DashboardController): Router {
  const router = Router()

  router.get('/dashboard/summary', (req, res, next) => controller.summary(req, res, next))
  router.get('/dashboard/categories', (req, res, next) => controller.categories(req, res, next))
  router.get('/dashboard/technologies', (req, res, next) => controller.technologies(req, res, next))
  router.get('/dashboard/top-startups', (req, res, next) => controller.topStartups(req, res, next))

  return router
}
