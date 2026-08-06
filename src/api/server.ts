import { createApp } from './app'
import { createDependencies } from '../bootstrap/dependencies'

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

const deps = createDependencies()
const app = createApp(deps)

deps.scheduler.start()

const server = app.listen(PORT, () => {
  console.log(`Startup Radar Engine listening on port ${PORT}`)
})

function shutdown(): void {
  deps.scheduler.stop()
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
