# Startup Radar Engine

An AI-powered technology intelligence platform that helps developers, technical founders, and product teams discover emerging AI startups, developer tools, and technology trends before they become mainstream.

*Currently in early development — this version adds an Express REST API over the query layer and processing pipeline. AI/ML features are future roadmap.*

---

An Express REST API — health, event querying (filter, paginate, fetch by id) and a processing endpoint — wired through a composition root that connects the SQLite layer, query service, processing pipeline and collectors.

### What's included

- **Express API** — `GET /health`, `GET /events`, `GET /events/:id`, `POST /process`; thin routes delegating to controllers, centralized 404 + error middleware, composition root in `api/app.ts` (SQLiteClient → SQLiteQueryService → EventController; SQLiteStorage → ProcessingPipeline → ProcessingService → ProcessingController)
- **`ProcessingService`** — orchestrates collectors (collect → validate → normalize) + the processing pipeline (clean → classify → aggregate → score → persist), returns processing statistics
- **Event-by-id lookup** — `findById()` added to `QueryService` / `SQLiteQueryService` (parameterized SQL, 404 when missing)
- **Query layer** — `QueryService` with `findEvents()`, `StartupQuery` (source, categories, technologies, keywords, limit, offset), `QueryResult<T>`, conditional JOINs + parameterized WHERE + LIMIT/OFFSET pagination
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

- No sorting, no date-range filtering, no dashboard endpoints (Steps 30+)
- No processing scheduler or scheduled runs
- Collectors return `[]` — no HTTP calls implemented yet
- Classification is batch-global (one result per processing run), not per-event
- No auth, no logging, no CLI

### Layout

```
src/
├── api/            Express app factory, server entry, barrel
├── controllers/    health, event, processing controllers
├── routes/         thin route modules delegating to controllers
├── middleware/     notFound (404), errorHandler (500)
├── services/       ProcessingService — collector + pipeline orchestration
├── types/          domain models and enums
├── interfaces/     repository + pipeline + query contracts
├── storage/        in-memory repositories + sqlite/ (schema, client, storage)
├── collectors/     base collector, GitHub/Reddit/HackerNews, pipeline
├── processing/     cleaning/, classification/, aggregation/, scoring/
└── query/          SQLiteQueryService — read-only, dynamic parameterized SQL
```

### Running

```
npm install
npm run build
npm start
```