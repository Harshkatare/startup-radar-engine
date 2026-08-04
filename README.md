# Startup Radar Engine

An AI-powered technology intelligence platform that helps developers, technical founders, and product teams discover emerging AI startups, developer tools, and technology trends before they become mainstream.

*Currently in early development — this version adds classification, aggregation, scoring and SQLite persistence on top of the core engine foundation (domain models, repositories, collectors, deterministic processing/cleaning pipeline). AI/ML features are future roadmap.*

## This Version (second commit)

Classification, aggregation and scoring pipelines with SQLite persistence — the processing pipeline is now fully wired end to end: clean → classify → aggregate → score → persist.

### What's included

- **Domain models** — `Event`, `Topic`, `ProcessedSignal`, `DailySnapshot`, `EntityId`, enums (`EventSource`, `TopicConfidence`, `TopicCategory`), `DateRange`
- **Repository contracts + in-memory implementations** — event, topic, processed-signal, daily-snapshot repositories backed by in-memory maps
- **Collector framework** — `BaseCollector` (shared validation + normalization), GitHub / Reddit / HackerNews collectors, `CollectorPipeline` (collect → validate → normalize → persist)
- **Cleaning pipeline** — `WhitespaceCleaner`, `UrlNormalizer`, `MetadataCleaner`, `DuplicateCleaner` with `SimpleDuplicateDetector` (source+externalId and normalized-URL rules)
- **Classification pipeline** — `CategoryClassifier` (8 categories), `TechnologyClassifier` (12 technologies), `KeywordExtractor` (tokenizer + stop-word filter)
- **Aggregation pipeline** — `CategoryAggregator`, `TechnologyAggregator`, `KeywordAggregator` (count-based)
- **Scoring pipeline** — shared `normalize` (count / max → 0.0–1.0), `CategoryScorer`, `TechnologyScorer`, `KeywordScorer`
- **SQLite persistence** — 5-table schema (`events`, `categories`, `technologies`, `keywords`, `processing_results`), `SQLiteClient` wrapper, `SQLiteStorage` implementing both `EventRepository` and `Persister`; `persist()` saves events, classification, aggregation and scores in a single transaction
- **Config module** — `COLLECTOR_CONFIG`, `PROCESSING_CONFIG`, `SCORING_CONFIG` constants

### Not yet in this version

- Collectors return `[]` — no HTTP calls implemented yet
- Classification is batch-global (one result per processing run), not per-event
- No query layer, no API, no scheduler, no package.json (source-only)

### Layout

```
src/
├── types/          domain models and enums
├── interfaces/     repository + pipeline contracts
├── storage/        in-memory repositories + sqlite/ (schema, client, storage)
├── collectors/     base collector, GitHub/Reddit/HackerNews, pipeline
├── processing/     pipeline, context, statistics
│   ├── cleaning/       whitespace, URL, metadata, duplicate cleaners
│   ├── classification/ category/technology classifiers + keyword extractor
│   ├── aggregation/    category/technology/keyword aggregators
│   └── scoring/        normalized category/technology/keyword scorers
└── config/         collector/processing/scoring constants
```
