import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/api/app'
import { createDependencies } from '../../src/bootstrap/dependencies'
import { SQLiteClient } from '../../src/storage/sqlite/sqlite-client'
import type { Dependencies } from '../../src/bootstrap/dependencies'
import type express from 'express'

describe('Process API', () => {
  let app: express.Application
  let deps: Dependencies
  let client: SQLiteClient

  beforeAll(() => {
    client = new SQLiteClient(':memory:')
    client.open()

    deps = createDependencies(client)
    app = createApp(deps)
  })

  afterAll(() => {
    client.close()
  })

  it('POST /process returns 200 with processing summary', async () => {
    const res = await request(app).post('/process').expect('Content-Type', /json/)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('completed')
    expect(res.body.statistics).toBeDefined()
    expect(res.body.statistics.eventsProcessed).toBe(0)
    expect(res.body.statistics.duplicatesRemoved).toBe(0)
    expect(res.body.statistics.whitespaceTrimmed).toBe(0)
    expect(res.body.statistics.urlsNormalized).toBe(0)
    expect(res.body.statistics.categoriesFound).toBe(0)
    expect(res.body.statistics.technologiesFound).toBe(0)
    expect(res.body.statistics.keywordsExtracted).toBe(0)
  })

  it('GET /process/status returns 200 with status object', async () => {
    const res = await request(app).get('/process/status').expect('Content-Type', /json/)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('running')
    expect(res.body).toHaveProperty('lastRun')
    expect(res.body).toHaveProperty('lastDurationMs')
    expect(res.body).toHaveProperty('lastStatus')
  })

  it('POST /process returns 409 when processing is already running', async () => {
    deps.lock.acquire()

    const res = await request(app).post('/process').expect('Content-Type', /json/)

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Processing already in progress')

    deps.lock.release()
  })
})
