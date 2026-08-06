import { Router } from 'express'
import { EventController } from '../controllers/event-controller'

export function createEventRoutes(controller: EventController): Router {
  const router = Router()

  router.get('/events', (req, res, next) => controller.list(req, res, next))
  router.get('/events/:id', (req, res, next) => controller.getById(req, res, next))

  return router
}
