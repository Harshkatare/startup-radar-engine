import { createApp } from './app'

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

const app = createApp()

const server = app.listen(PORT, () => {
  console.log(`Startup Radar Engine listening on port ${PORT}`)
})

function shutdown(): void {
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
