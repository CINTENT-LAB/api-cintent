-- PHASE-X.9A enterprise license governance and mandatory consent enforcement.

create table if not exists license_policy_versions (
  policy_version text primary key,
  policy_key text not null default 'enterprise-license',
  title text not null,
  summary text not null,
  content text not null,
  effective_at timestamptz not null default now(),
  requires_reconsent boolean not null default true,
  tenant_scope text not null default 'global',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists idx_license_policy_status
  on license_policy_versions(policy_key, tenant_scope, status, effective_at desc);

create table if not exists policy_view_logs (
  view_id text primary key,
  policy_version text not null,
  policy_key text not null default 'enterprise-license',
  user_id text,
  tenant_id text not null,
  session_id text,
  ip_address text,
  user_agent text,
  view_mode text not null,
  viewed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_policy_view_tenant_user
  on policy_view_logs(tenant_id, user_id, policy_version, viewed_at desc);

create table if not exists license_acceptance_logs (
  acceptance_id text primary key,
  policy_version text not null,
  policy_key text not null default 'enterprise-license',
  user_id text,
  tenant_id text not null,
  session_id text,
  ip_address text,
  user_agent text,
  accepted boolean not null default false,
  acknowledged_review boolean not null default false,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create unique index if not exists idx_license_acceptance_unique_subject
  on license_acceptance_logs(policy_key, policy_version, tenant_id, coalesce(user_id, session_id));

create index if not exists idx_license_acceptance_active
  on license_acceptance_logs(tenant_id, user_id, policy_version, accepted_at desc)
  where accepted = true;

create table if not exists consent_audit_logs (
  audit_id text primary key,
  policy_version text,
  policy_key text not null default 'enterprise-license',
  user_id text,
  tenant_id text not null,
  session_id text,
  action text not null,
  decision text not null,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_consent_audit_tenant_action
  on consent_audit_logs(tenant_id, action, created_at desc);
