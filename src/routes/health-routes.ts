import { Router } from 'express'
import { HealthController } from '../controllers/health-controller'

export function createHealthRoutes(controller: HealthController): Router {
  const router = Router()

  router.get('/health', (req, res) => controller.check(req, res))

  return router
}
