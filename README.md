# Startup Radar Engine

An AI-powered technology intelligence platform that helps developers, technical founders, and product teams discover emerging AI startups, developer tools, and technology trends before they become mainstream.

*Currently in early development — this version adds a read-only query layer on top of the classification/aggregation/scoring pipelines and SQLite persistence. AI/ML features are future roadmap.*

## This Version (third commit)

A read-only query layer — filter, paginate and retrieve persisted events through `SQLiteQueryService` with fully parameterized dynamic SQL.

### What's included

- **Query layer** — `QueryService` interface with `findEvents()`, `StartupQuery` model (source, categories, technologies, keywords, limit, offset), `QueryResult<T>` (items, total, limit, offset); `SQLiteQueryService` builds conditional JOINs and WHERE filters with `?` bindings plus a count query and LIMIT/OFFSET pagination — read-only, no mutation
- **Domain models** — `Event`, `Topic`, `ProcessedSignal`, `DailySnapshot`, enums, `DateRange`
- **Repository contracts + in-memory implementations** — event, topic, processed-signal, daily-snapshot
- **Collector framework** — `BaseCollector`, GitHub / Reddit / HackerNews collectors, `CollectorPipeline`
- **Cleaning pipeline** — whitespace, URL, metadata, duplicate cleaners + `SimpleDuplicateDetector`
- **Classification pipeline** — 8-category + 12-technology classifiers, keyword extractor
- **Aggregation pipeline** — category/technology/keyword count aggregators
- **Scoring pipeline** — normalized 0.0–1.0 scorers
- **SQLite persistence** — 5-table schema, `SQLiteClient`, `SQLiteStorage` (repository + persister), single-transaction `persist()`
- **Config module** — collector/processing/scoring constants

### Not yet in this version

- No sorting, no date-range filtering, no event-by-id lookup (query service is filter + paginate only)
- Collectors return `[]` — no HTTP calls implemented yet
- Classification is batch-global (one result per processing run), not per-event
- No API, no scheduler, no package.json (source-only)

### Layout

```
src/
├── types/          domain models and enums
├── interfaces/     repository + pipeline contracts + query contracts
├── storage/        in-memory repositories + sqlite/ (schema, client, storage)
├── collectors/     base collector, GitHub/Reddit/HackerNews, pipeline
├── processing/     cleaning/, classification/, aggregation/, scoring/
└── query/          SQLiteQueryService — read-only, dynamic parameterized SQL
```