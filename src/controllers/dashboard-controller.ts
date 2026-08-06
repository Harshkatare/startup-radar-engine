import type { Request, Response, NextFunction } from 'express'
import { DashboardService } from '../services/dashboard-service'

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  async summary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(this.dashboardService.getSummary())
    } catch (err) {
      next(err)
    }
  }

  async categories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(this.dashboardService.getCategoryDistribution())
    } catch (err) {
      next(err)
    }
  }

  async technologies(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(this.dashboardService.getTechnologyDistribution())
    } catch (err) {
      next(err)
    }
  }

  async topStartups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 10
      res.json(this.dashboardService.getTopStartups(limit))
    } catch (err) {
      next(err)
    }
  }
}
