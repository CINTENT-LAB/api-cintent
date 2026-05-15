-- PHASE-X.2C canonical cognitive data model and governance fabric.
-- These tables normalize metadata registry, governance decisions, schema versions,
-- and runtime lineage without creating domain-specific persistence forks.

create table if not exists canonical_schema_versions (
  schema_version text primary key,
  status text not null default 'active',
  backward_compatible_with text[] not null default '{}',
  replay_compatible boolean not null default true,
  orchestration_compatible boolean not null default true,
  sdk_compatible boolean not null default true,
  created_at timestamptz not null default now()
);

insert into canonical_schema_versions (
  schema_version,
  status,
  backward_compatible_with,
  replay_compatible,
  orchestration_compatible,
  sdk_compatible
) values (
  'cintent.cognitive.v1.0.0',
  'active',
  '{}',
  true,
  true,
  true
) on conflict (schema_version) do update set
  status = excluded.status,
  replay_compatible = excluded.replay_compatible,
  orchestration_compatible = excluded.orchestration_compatible,
  sdk_compatible = excluded.sdk_compatible;

create table if not exists canonical_metadata_registry (
  registry_id text primary key,
  tenant_id text not null default 'global',
  entity_type text not null,
  entity_key text not null,
  domain text,
  schema_version text not null references canonical_schema_versions(schema_version),
  contract jsonb not null,
  governance_requirements jsonb not null default '[]'::jsonb,
  lineage_contract jsonb not null default '{}'::jsonb,
  lifecycle_state text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, entity_type, entity_key, schema_version)
);

create index if not exists idx_canonical_registry_tenant_domain
  on canonical_metadata_registry (tenant_id, domain, entity_type);

create index if not exists idx_canonical_registry_contract_gin
  on canonical_metadata_registry using gin (contract);

create table if not exists governance_policies (
  policy_id text primary key,
  tenant_id text not null default 'global',
  domain text,
  scope text not null,
  policy_name text not null,
  policy_version text not null default '1.0.0',
  constraints jsonb not null default '[]'::jsonb,
  enforcement_mode text not null default 'advisory',
  inherited_from text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_governance_policies_scope
  on governance_policies (tenant_id, domain, scope, enforcement_mode);

create table if not exists canonical_lineage_edges (
  edge_id text primary key,
  tenant_id text not null,
  source_entity_type text not null,
  source_entity_id text not null,
  target_entity_type text not null,
  target_entity_id text not null,
  relation text not null,
  schema_version text not null references canonical_schema_versions(schema_version),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_canonical_lineage_source
  on canonical_lineage_edges (tenant_id, source_entity_type, source_entity_id);

create index if not exists idx_canonical_lineage_target
  on canonical_lineage_edges (tenant_id, target_entity_type, target_entity_id);

create table if not exists canonical_event_log (
  event_id text primary key,
  tenant_id text not null,
  workspace_id text,
  session_id text,
  domain text,
  event_type text not null,
  schema_version text not null references canonical_schema_versions(schema_version),
  payload jsonb not null,
  governance jsonb not null default '{}'::jsonb,
  lineage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_canonical_event_log_tenant_type
  on canonical_event_log (tenant_id, event_type, created_at desc);

create index if not exists idx_canonical_event_log_payload_gin
  on canonical_event_log using gin (payload);
