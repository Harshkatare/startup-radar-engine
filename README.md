# Startup Radar Engine

An AI-powered technology intelligence platform that helps developers, technical founders, and product teams discover emerging AI startups, developer tools, and technology trends before they become mainstream.

*Currently in early development — this version is the backend core engine (domain models, repositories, collectors, deterministic processing/cleaning pipeline). AI/ML features are future roadmap.*

---

Core engine foundation — the domain model, storage contracts, collector framework, processing pipeline and cleaning pipeline. This is the earliest development stage.

### What's included

- **Domain models** — `Event`, `Topic`, `ProcessedSignal`, `DailySnapshot`, `EntityId`, enums (`EventSource`, `TopicConfidence`, `TopicCategory`), `DateRange`
- **Repository contracts + in-memory implementations** — event, topic, processed-signal, daily-snapshot repositories backed by in-memory maps
- **Collector framework** — `BaseCollector` (shared validation + normalization), GitHub / Reddit / HackerNews collectors, `CollectorPipeline` (collect → validate → normalize → persist)
- **Processing pipeline** — `ProcessingContext` (events, source, statistics), `ProcessingStatistics`, `ProcessingPipeline` (register/run/clear)
- **Cleaning pipeline** — `WhitespaceCleaner`, `UrlNormalizer`, `MetadataCleaner`, `DuplicateCleaner` with `SimpleDuplicateDetector` (source+externalId and normalized-URL rules)
- **Config module** — `COLLECTOR_CONFIG`, `PROCESSING_CONFIG`, `SCORING_CONFIG` constants

### Not yet in this version

- Collectors return `[]` — no HTTP calls implemented yet
- No classification / aggregation / scoring logic (processors are passthrough placeholders)
- No persistence (pipeline runs in memory)
- No API, no scheduler, no package.json (source-only)

### Layout

```
src/
├── types/          domain models and enums
├── interfaces/     repository + pipeline contracts
├── storage/        in-memory repository implementations
├── collectors/     base collector, GitHub/Reddit/HackerNews, pipeline
├── processing/     pipeline, context, statistics, cleaning framework
└── config/         collector/processing/scoring constants
```

### Roadmap

The engine grows in stages: classification → aggregation → scoring → SQLite persistence → query layer → REST API → scheduler.
