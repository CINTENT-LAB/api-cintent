# CINTENT Database Sync Manifest

This manifest records the database assets that must travel with the runtime so
the platform starts with persistence, telemetry, graph, vector, cache, and
artifact storage available.

## Runtime Services

| Layer | Service | Compose service | Purpose |
| --- | --- | --- | --- |
| Operational database | PostgreSQL + pgvector | `postgres` | Users, tenants, workspaces, sessions, workflows, orchestration, replay, governance, SDK generation, canonical metadata |
| Telemetry database | TimescaleDB | `timescaledb` | Runtime telemetry, orchestration metrics, replay metrics, simulation streams |
| Cache/session layer | Redis | `redis` | Active sessions, sandbox TTL state, runtime synchronization, websocket recovery |
| Graph runtime | Neo4j | `neo4j` | Orchestration lineage, replay relationships, workflow dependency graphs |
| Vector memory | Qdrant | `qdrant` | Ask COGNI semantic memory and contextual retrieval |
| Object storage | MinIO | `minio` | Replay exports, SDK artifacts, audit exports, runtime snapshots |

## Database Migrations

| Migration | Target | Included in compose | Notes |
| --- | --- | --- | --- |
| `migrations/001_enterprise_persistence.sql` | PostgreSQL, TimescaleDB | Yes | Core enterprise persistence tables and runtime indexes |
| `migrations/002_timescale_telemetry.sql` | TimescaleDB | Yes | Telemetry hypertable and time-series persistence |
| `migrations/003_canonical_data_governance.sql` | PostgreSQL | Yes | Canonical metadata registry, schema governance, policy fabric, and lineage normalization |

## Apply Notes

Docker entrypoint migrations run automatically for empty database volumes:

```powershell
docker-compose up -d postgres timescaledb redis neo4j qdrant minio
```

For an existing PostgreSQL volume, apply new migrations manually with `psql`
or recreate the non-production volume intentionally after backup. Do not delete
production volumes without a verified export.

## Runtime Wiring

The backend receives these database endpoints from `docker-compose.yml`:

```text
DATABASE_URL=postgres://cintent:<password>@postgres:5432/cintent
REDIS_URL=redis://redis:6379
NEO4J_URI=bolt://neo4j:7687
QDRANT_URL=http://qdrant:6333
MINIO_ENDPOINT=http://minio:9000
```

These services are part of the committed platform sync and must be deployed
together for persistent workspace, replay, telemetry, graph, and Ask COGNI
continuity.
