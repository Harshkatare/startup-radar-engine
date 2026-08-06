# Startup Radar Engine

An AI-powered technology intelligence platform that helps developers, technical founders, and product teams discover emerging AI startups, developer tools, and technology trends before they become mainstream.

*Currently in early development — this version adds dashboard endpoints and an enhanced query layer with sorting, date-range filtering and pagination metadata. AI/ML features are future roadmap.*

---

Dashboard endpoints over the persisted data plus a richer query layer — sorting, date-range filtering and pagination metadata — with a dedicated composition root wiring all services and controllers.

### What's included

- **Dashboard endpoints** — `GET /dashboard/summary` (totals + average score), `GET /dashboard/categories`, `GET /dashboard/technologies`, `GET /dashboard/top-startups?limit=`; `DashboardService` reads SQLite directly with parameterized SQL, no mutation
- **Enhanced query layer** — sorting (`sortBy` publishedAt/createdAt, `sortOrder` asc/desc via column whitelist), date-range filtering (`fromDate`/`toDate` on created_at), pagination metadata (`hasNext`/`hasPrevious`); comma-separated array params (`categories=AI,SaaS`); full parameter validation with HTTP 400 on invalid values
- **Composition root** — `bootstrap/dependencies.ts` (`createDependencies()`) instantiates all shared infrastructure, services and controllers; `api/app.ts` only registers routes and middleware
- **Express API** — `GET /health`, `GET /events`, `GET /events/:id`, `POST /process`, `GET /dashboard/*`; centralized 404 + error middleware
- **`ProcessingService`** — orchestrates collectors (collect → validate → normalize) + the processing pipeline (clean → classify → aggregate → score → persist)
- **Query layer** — `QueryService` with `findEvents()`/`findById()`, `StartupQuery`, `QueryResult<T>` with pagination metadata
- **Domain models** — `Event`, `Topic`, `ProcessedSignal`, `DailySnapshot`, enums, `DateRange`
- **Repository contracts + in-memory implementations** — event, topic, processed-signal, daily-snapshot
- **Collector framework** — `BaseCollector`, GitHub / Reddit / HackerNews collectors, `CollectorPipeline`
- **Cleaning pipeline** — whitespace, URL, metadata, duplicate cleaners + `SimpleDuplicateDetector`
- **Classification pipeline** — 8-category + 12-technology classifiers, keyword extractor
- **Aggregation pipeline** — category/technology/keyword count aggregators
- **Scoring pipeline** — normalized 0.0–1.0 scorers
- **SQLite persistence** — 5-table schema, `SQLiteClient`, `SQLiteStorage` (repository + persister), single-transaction `persist()`
- **Config module** — collector/processing/scoring constants
- **Tooling** — `package.json`, `tsconfig.json`, TypeScript build via tsc

### Not yet in this version

- No processing scheduler or scheduled runs
- `minScore`/`maxScore` are parsed and validated but not yet applied to queries (score filtering not implemented)
- Collectors return `[]` — no HTTP calls implemented yet
- Classification is batch-global (one result per processing run), not per-event
- No auth, no logging, no CLI

### Layout

```
src/
├── bootstrap/      composition root — createDependencies()
├── api/            Express app factory, server entry, barrel
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
```

### Running

```
npm install
npm run build
npm start
```