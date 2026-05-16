# CINTENT Database Sync Manifest

This manifest records the database assets that must travel with the launch
runtime so the platform starts with stable persistence, workspace continuity,
replay, orchestration, telemetry, Ask COGNI memory, and session synchronization.

The current productization phase intentionally keeps the stack simple. The
required launch path is PostgreSQL with pgvector plus Redis. Heavier services
remain available behind the `advanced` Docker Compose profile for later scale
or specialized deployments.

## Runtime Services

| Layer | Service | Compose service | Launch status | Purpose |
| --- | --- | --- | --- | --- |
| Operational database | PostgreSQL + pgvector | `postgres` | Required | Users, tenants, workspaces, sessions, workflows, orchestration, replay, telemetry, governance, SDK generation, canonical metadata, and Ask COGNI memory |
| Cache/session layer | Redis | `redis` | Required | Active sessions, sandbox TTL state, runtime synchronization, websocket recovery |
| Telemetry database | TimescaleDB | `timescaledb` | Optional, `advanced` profile | High-volume telemetry, orchestration metrics, replay metrics, simulation streams |
| Graph runtime | Neo4j | `neo4j` | Optional, `advanced` profile | Orchestration lineage, replay relationships, workflow dependency graphs |
| Vector memory | Qdrant | `qdrant` | Optional, `advanced` profile | External vector memory if pgvector is outgrown |
| Object storage | MinIO | `minio` | Optional, `advanced` profile | Large replay exports, SDK artifacts, audit exports, runtime snapshots |

## Database Migrations

| Migration | Target | Included in compose | Notes |
| --- | --- | --- | --- |
| `migrations/001_enterprise_persistence.sql` | PostgreSQL, optional TimescaleDB | Yes | Core platform persistence tables and runtime indexes |
| `migrations/002_timescale_telemetry.sql` | Optional TimescaleDB | Advanced profile | Telemetry hypertable and time-series persistence |
| `migrations/003_canonical_data_governance.sql` | PostgreSQL | Yes | Canonical metadata registry, schema governance, policy fabric, and lineage normalization |
| `migrations/004_license_governance.sql` | PostgreSQL | Yes | Enterprise license policy versions, acceptance logs, policy view tracking, and consent audit logs |

## Apply Notes

Docker entrypoint migrations run automatically for empty database volumes:

```powershell
docker-compose up -d postgres redis
```

Optional advanced services can be started only when needed:

```powershell
docker-compose --profile advanced up -d timescaledb neo4j qdrant minio
```

For an existing PostgreSQL volume, apply new migrations manually with `psql`
or recreate the non-production volume intentionally after backup. Do not delete
production volumes without a verified export.

## Runtime Wiring

The backend receives these database endpoints from `docker-compose.yml`:

```text
DATABASE_URL=postgres://cintent:<password>@postgres:5432/cintent
REDIS_URL=redis://redis:6379
```

For launch, persistent workspace, replay, orchestration, telemetry, and Ask
COGNI continuity should be proven against PostgreSQL and Redis first. Neo4j,
Qdrant, TimescaleDB, and MinIO should be enabled only after the portal behavior
is stable and there is a real scale or artifact requirement.
