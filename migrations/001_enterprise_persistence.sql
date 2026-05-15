create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists tenants (
  tenant_id text primary key,
  name text not null,
  tier text not null default 'demo',
  status text not null default 'active',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  user_id text primary key,
  tenant_id text not null references tenants(tenant_id) on delete cascade,
  email text unique not null,
  name text,
  role text not null default 'viewer',
  password_hash text,
  email_verified boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  session_id text primary key,
  tenant_id text not null,
  user_id text,
  session_type text not null,
  scopes jsonb not null default '[]',
  encrypted_state jsonb not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspaces (
  workspace_id text primary key,
  tenant_id text not null,
  session_id text,
  domain text not null default 'platform',
  application_id text,
  selected_apis jsonb not null default '[]',
  selected_workflow text,
  selected_simulation text,
  state jsonb not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_workspaces_tenant_updated on workspaces(tenant_id, updated_at desc);
create index if not exists idx_workspaces_context on workspaces(tenant_id, domain, application_id);

create table if not exists orchestration_runs (
  orchestration_id text primary key,
  tenant_id text not null,
  workspace_id text,
  session_id text,
  workflow_id text,
  status text not null,
  current_stage text,
  confidence numeric,
  input jsonb not null default '{}',
  state jsonb not null default '{}',
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orchestration_tenant_status on orchestration_runs(tenant_id, status, updated_at desc);

create table if not exists workflow_states (
  workflow_state_id text primary key,
  tenant_id text not null,
  workspace_id text,
  workflow_id text,
  stage text not null,
  state jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_workflow_states_lineage on workflow_states(tenant_id, workspace_id, workflow_id, created_at);

create table if not exists replay_events (
  replay_event_id text primary key,
  tenant_id text not null,
  workspace_id text,
  session_id text,
  replay_id text,
  event_type text not null,
  sequence_no integer not null default 0,
  payload jsonb not null default '{}',
  payload_hash text generated always as (encode(digest(payload::text, 'sha256'), 'hex')) stored,
  created_at timestamptz not null default now()
);
create index if not exists idx_replay_events_tenant_replay on replay_events(tenant_id, replay_id, sequence_no, created_at);
create index if not exists idx_replay_events_type_time on replay_events(event_type, created_at desc);

create table if not exists telemetry_streams (
  telemetry_id text primary key,
  tenant_id text not null,
  workspace_id text,
  stream_type text not null,
  source text,
  sample jsonb not null default '{}',
  anomaly boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_telemetry_tenant_time on telemetry_streams(tenant_id, stream_type, created_at desc);
create index if not exists idx_telemetry_anomaly on telemetry_streams(tenant_id, anomaly, created_at desc);

create table if not exists ask_cogni_sessions (
  memory_id text primary key,
  tenant_id text not null,
  workspace_id text,
  session_id text,
  context_id text,
  domain text not null default 'platform',
  query text not null,
  response_summary text,
  embedding_text text,
  embedding vector(1536),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_ask_memory_context on ask_cogni_sessions(tenant_id, workspace_id, domain, created_at desc);

create table if not exists simulations (
  simulation_id text primary key,
  tenant_id text not null,
  workspace_id text,
  domain text not null,
  scenario text,
  state jsonb not null default '{}',
  checkpoint jsonb not null default '{}',
  replay_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_simulations_tenant_domain on simulations(tenant_id, domain, updated_at desc);

create table if not exists governance_events (
  governance_event_id text primary key,
  tenant_id text not null,
  workspace_id text,
  policy_id text,
  event_type text not null,
  decision text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_governance_tenant_time on governance_events(tenant_id, created_at desc);

create table if not exists sdk_generations (
  sdk_generation_id text primary key,
  tenant_id text not null,
  workspace_id text,
  api_key text,
  language text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_sdk_tenant_api on sdk_generations(tenant_id, api_key, created_at desc);

create table if not exists runtime_metrics (
  metric_id bigserial primary key,
  tenant_id text not null,
  workspace_id text,
  metric_type text not null,
  value numeric,
  labels jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_runtime_metrics_tenant_time on runtime_metrics(tenant_id, metric_type, created_at desc);

create table if not exists runtime_events (
  event_id text primary key,
  tenant_id text not null,
  workspace_id text,
  session_id text,
  event_type text not null,
  entity_id text,
  payload jsonb not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_runtime_events_tenant_type on runtime_events(tenant_id, event_type, created_at desc);
