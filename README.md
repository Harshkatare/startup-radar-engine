# Startup Radar Engine

An AI-powered technology intelligence platform that helps developers, technical founders, and product teams discover emerging AI startups, developer tools, and technology trends before they become mainstream.

*Currently in early development — this version adds a processing scheduler with a run lock and a full test suite (integration, API and end-to-end). AI/ML features are future roadmap.*

---

A processing scheduler with a concurrency lock, plus 71 tests across three suites validating the whole pipeline — processing, querying, dashboard and the API.

### What's included

- **Processing scheduler** — `Scheduler` (setInterval, default 60 min, start/stop independent of Express), `SchedulerService` (executes processing, tracks `lastRun`/`lastDurationMs`/`lastStatus`, logs start/complete/fail/skip), `ProcessingLock` (prevents concurrent runs; `POST /process` returns 409 when already running)
- **Scheduler status** — `GET /process/status` returns `{ running, lastRun, lastDurationMs, lastStatus }`
- **Test suite (71 tests, 7 files)** — integration (processing/query/dashboard, 32 tests, in-memory SQLite), API (process/events/dashboard, 24 tests via supertest), E2E (15 tests across 5 scenarios: processing workflow, query workflow, dashboard workflow, scheduler status, failure paths); `npm test`, `npm run test:integration|api|e2e`
- **Dashboard endpoints** — `GET /dashboard/summary`, `/dashboard/categories`, `/dashboard/technologies`, `/dashboard/top-startups?limit=`
- **Enhanced query layer** — sorting (sortBy/sortOrder via column whitelist), date-range filtering, pagination metadata (`hasNext`/`hasPrevious`), comma-separated array params, parameter validation with HTTP 400
- **Composition root** — `bootstrap/dependencies.ts` with injectable SQLiteClient (test support); `api/app.ts` accepts optional `Dependencies`; `server.ts` starts/stops the scheduler
- **Express API** — `GET /health`, `GET /events`, `GET /events/:id`, `POST /process`, `GET /process/status`, `GET /dashboard/*`
- **`ProcessingService`** — orchestrates collectors (collect → validate → normalize) + the processing pipeline (clean → classify → aggregate → score → persist)
- **Domain models** — `Event`, `Topic`, `ProcessedSignal`, `DailySnapshot`, enums, `DateRange`
- **Repository contracts + in-memory implementations** — event, topic, processed-signal, daily-snapshot
- **Collector framework** — `BaseCollector`, GitHub / Reddit / HackerNews collectors, `CollectorPipeline`
- **Cleaning pipeline** — whitespace, URL, metadata, duplicate cleaners + `SimpleDuplicateDetector`
- **Classification pipeline** — 8-category + 12-technology classifiers, keyword extractor
- **Aggregation pipeline** — category/technology/keyword count aggregators
- **Scoring pipeline** — normalized 0.0–1.0 scorers
- **SQLite persistence** — 5-table schema, `SQLiteClient`, `SQLiteStorage` (repository + persister), single-transaction `persist()`
- **Config module** — collector/processing/scoring constants
- **Tooling** — `package.json`, `tsconfig.json`, vitest, supertest, better-sqlite3

### Not yet in this version

- No per-event classification — classification is global (`__global__` event + one result per run)
- `minScore`/`maxScore` are parsed and validated but not yet applied to queries (score filtering not implemented)
- Collectors return `[]` — no HTTP calls implemented yet
- No auth, no logging, no CLI

### Layout

```
src/
├── bootstrap/      composition root — createDependencies() (injectable client)
├── api/            Express app factory, server entry, barrel
├── scheduler/      ProcessingLock, SchedulerService, Scheduler
├── controllers/    health, event, processing, dashboard controllers
├── routes/         thin route modules delegating to controllers
├── middleware/     notFound (404), errorHandler (500)
├── services/       ProcessingService, DashboardService
├── types/          domain models and enums
├── interfaces/     repository + pipeline + query contracts
├── storage/        in-memory repositories + sqlite/ (schema, client, storage)
├── collectors/     base collector, GitHub/Reddit/HackerNews, pipeline
├── processing/     cleaning/, classification/, aggregation/, scoring/
└── query/          SQLiteQueryService — sorting, date-range, pagination
tests/
├── fixtures/       sample-events.json
├── integration/    processing, query, dashboard
├── api/            process, events, dashboard
└── e2e/            startup-radar.e2e.test.ts
```

### Running

```
npm install
npm run build
npm start
```

### Testing

```
npm test
npm run test:integration
npm run test:api
npm run test:e2e
```