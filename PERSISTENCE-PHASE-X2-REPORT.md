# PHASE-X.2 Core Persistence Report

## Enterprise Persistence Architecture

CINTENT now has a unified persistence adapter that every domain can consume through shared platform primitives:

- Operational state: PostgreSQL schema in `migrations/001_enterprise_persistence.sql`.
- Vector memory: pgvector column on `ask_cogni_sessions`, with Qdrant collection definitions in `qdrant/collections.json`.
- Graph lineage: Neo4j schema in `graph/neo4j-schema.cypher`.
- Telemetry persistence: Timescale hypertables in `migrations/002_timescale_telemetry.sql`.
- Cache/session layer: Redis in `docker-compose.yml`.
- Object storage: MinIO in `docker-compose.yml`, plus a local object-ledger fallback for sandbox development.

## Unified Cognitive State Engine

The backend now persists:

- sandbox workspace initialization
- workspace state updates
- Ask COGNI memory entries
- trace and replay events
- orchestration executions
- simulation executions
- manufacturing telemetry samples
- replay exports
- SDK generations
- audit/runtime events

When PostgreSQL is configured, writes go to the database. When it is not configured, writes go to `.cintent-runtime/runtime-ledger.jsonl` and `.cintent-runtime/objects`, preserving local continuity instead of resetting state.

## Runtime Validation

Added `npm run test:persistence`, which validates:

- sandbox session continuity
- workspace state persistence
- Ask COGNI memory write path
- replay persistence
- observability trace persistence
- tenant-scoped sandbox behavior

## Production Readiness Notes

- The Docker stack provisions PostgreSQL/pgvector, Redis, Neo4j, Qdrant, TimescaleDB, MinIO, backend runtime, and trace streamer.
- Local fallback persistence is for development and sandbox continuity only.
- Production should set strong `JWT_SECRET`, database passwords, MinIO credentials, backup policies, and migration automation.
