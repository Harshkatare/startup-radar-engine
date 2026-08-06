import { Router } from 'express'
import { ProcessingController } from '../controllers/processing-controller'

export function createProcessingRoutes(controller: ProcessingController): Router {
  const router = Router()

  router.post('/process', (req, res, next) => controller.process(req, res, next))
  router.get('/process/status', (req, res, next) => controller.status(req, res, next))

  return router
}
