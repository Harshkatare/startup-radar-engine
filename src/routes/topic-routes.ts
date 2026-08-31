import { Router } from 'express'
import { TopicController } from '../controllers/topic-controller'

export function createTopicRoutes(controller: TopicController): Router {
  const router = Router()

  router.get('/topics', (req, res, next) => controller.list(req, res, next))
  router.get('/topics/trending', (req, res, next) => controller.trending(req, res, next))
  router.get('/topics/:id/analysis', (req, res, next) => controller.analysis(req, res, next))
  router.get('/topics/:id', (req, res, next) => controller.getById(req, res, next))

  return router
}