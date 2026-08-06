import type { Request, Response } from 'express'

export class HealthController {
  async check(_req: Request, res: Response): Promise<void> {
    res.json({ status: 'ok', service: 'startup-radar-engine' })
  }
}
