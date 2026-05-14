-- ============================================================
-- CINTENT PLATFORM V2 - ENTERPRISE OPERATIONALIZATION LAYER
-- Versioning, Dependencies, SDKs, Access Policies, Visualization, Health, Audit
-- ============================================================

-- ============================================================
-- 1. API VERSIONING SYSTEM
-- ============================================================

CREATE TABLE api_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_metadata_id UUID NOT NULL REFERENCES api_metadata(id),

  -- Semantic Versioning
  major INT NOT NULL,
  minor INT NOT NULL,
  patch INT NOT NULL,
  prerelease VARCHAR,                     -- "alpha", "beta", "rc"
  version_string VARCHAR UNIQUE,          -- "2.1.0", "3.0.0-beta.1"

  -- Lifecycle
  lifecycle_state VARCHAR,                -- "planned", "beta", "stable", "deprecated", "archived"
  released_at TIMESTAMP,
  deprecated_at TIMESTAMP,
  sunset_date TIMESTAMP,                  -- When this version stops working

  -- Compatibility
  breaking_changes TEXT[],                -- List of breaking changes
  migration_guide TEXT,                   -- How to migrate from previous version
  backward_compatible_to VARCHAR,         -- Last compatible version
  upgrade_path TEXT,                      -- Recommended upgrade path

  -- Schemas (versioned)
  request_schema JSONB,
  response_schema JSONB,
  error_schema JSONB,

  -- Metadata
  release_notes TEXT,
  changelog JSONB,
  visibility VARCHAR,                     -- "public", "beta", "enterprise", "internal"

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_lifecycle CHECK (lifecycle_state IN ('planned', 'beta', 'stable', 'deprecated', 'archived')),
  CONSTRAINT valid_visibility CHECK (visibility IN ('public', 'beta', 'enterprise', 'internal'))
);

CREATE INDEX idx_api_versions_api ON api_versions(api_metadata_id);
CREATE INDEX idx_api_versions_lifecycle ON api_versions(lifecycle_state);
CREATE INDEX idx_api_versions_deprecated ON api_versions(deprecated_at) WHERE deprecated_at IS NOT NULL;

-- ============================================================
-- 2. API DEPENDENCY GRAPH
-- ============================================================

CREATE TABLE api_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dependency Relationship
  parent_api_id UUID NOT NULL REFERENCES api_metadata(id),
  dependent_api_id UUID NOT NULL REFERENCES api_metadata(id),

  -- Dependency Type
  dependency_type VARCHAR,                -- "orchestration", "replay", "governance", "coordination", "multimodal"
  relationship VARCHAR,                  -- "requires", "optional", "conditional", "enhanced_by"
  criticality VARCHAR,                    -- "critical", "important", "optional"

  -- Dependency Metadata
  description TEXT,
  version_constraints VARCHAR,            -- ">=2.0.0", "^1.5.0"
  execution_order INT,                    -- Order in execution flow (1, 2, 3...)
  failure_mode VARCHAR,                   -- "cascade", "isolate", "retry", "degrade"

  -- Visualization
  visual_metadata JSONB,                  -- {x: 100, y: 200, color: "#FF5733"}

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT no_self_dependency CHECK (parent_api_id != dependent_api_id),
  UNIQUE(parent_api_id, dependent_api_id),
  CONSTRAINT valid_dependency_type CHECK (dependency_type IN ('orchestration', 'replay', 'governance', 'coordination', 'multimodal')),
  CONSTRAINT valid_criticality CHECK (criticality IN ('critical', 'important', 'optional'))
);

CREATE INDEX idx_api_dependencies_parent ON api_dependencies(parent_api_id);
CREATE INDEX idx_api_dependencies_dependent ON api_dependencies(dependent_api_id);
CREATE INDEX idx_api_dependencies_type ON api_dependencies(dependency_type);

-- ============================================================
-- 3. SDK AUTO-GENERATION
-- ============================================================

CREATE TABLE sdk_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_metadata_id UUID NOT NULL REFERENCES api_metadata(id),

  -- Language & Framework
  language VARCHAR NOT NULL,              -- "typescript", "python", "rest"
  framework VARCHAR,                      -- "axios", "requests", "fetch"
  package_name VARCHAR,                   -- "cintent-travel-sdk", "@cintent/drone-sdk"

  -- Generation Metadata
  generated_at TIMESTAMP,
  generated_from_version UUID REFERENCES api_versions(id),
  auto_generate BOOLEAN DEFAULT true,

  -- SDK Content
  source_code TEXT,                       -- Full SDK source
  type_definitions JSONB,                 -- TypeScript: interfaces, types
  documentation TEXT,                     -- README, examples
  npm_package_metadata JSONB,             -- package.json content

  -- Distribution
  published_at TIMESTAMP,
  npm_registry_url VARCHAR,
  pypi_registry_url VARCHAR,
  github_url VARCHAR,

  -- Metadata
  version VARCHAR,                        -- SDK version
  download_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(api_metadata_id, language),
  CONSTRAINT valid_language CHECK (language IN ('typescript', 'python', 'rest'))
);

CREATE INDEX idx_sdk_definitions_api ON sdk_definitions(api_metadata_id);
CREATE INDEX idx_sdk_definitions_language ON sdk_definitions(language);

-- ============================================================
-- 4. ACCESS POLICY ENGINE
-- ============================================================

CREATE TABLE access_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_metadata_id UUID NOT NULL REFERENCES api_metadata(id),

  -- Policy Type
  policy_type VARCHAR,                    -- "tier_based", "scope_based", "runtime", "simulation_only", "enterprise_only"
  policy_name VARCHAR,
  description TEXT,

  -- Access Rules
  allowed_tiers TEXT[],                   -- ["developer", "professional", "enterprise"]
  required_scopes TEXT[],                 -- ["api:read", "api:execute", "replay:read"]
  runtime_restrictions JSONB,             -- {"max_calls_per_minute": 100, "max_concurrent": 5}
  simulation_only BOOLEAN DEFAULT false,
  enterprise_only BOOLEAN DEFAULT false,
  governance_restricted BOOLEAN DEFAULT false,

  -- Policy Conditions
  conditions JSONB,                       -- Dynamic conditions: {"require_mfa": true, "restrict_regions": ["US", "EU"]}
  effective_from TIMESTAMP,
  effective_until TIMESTAMP,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_policy_type CHECK (policy_type IN ('tier_based', 'scope_based', 'runtime', 'simulation_only', 'enterprise_only', 'governance_restricted'))
);

CREATE INDEX idx_access_policies_api ON access_policies(api_metadata_id);
CREATE INDEX idx_access_policies_type ON access_policies(policy_type);

-- ============================================================
-- 5. COGNITIVE EXECUTION VISUALIZER
-- ============================================================

CREATE TABLE execution_visualizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES api_executions(id),

  -- Orchestration Graph
  orchestration_graph JSONB,              -- {nodes: [...], edges: [...], metadata: {...}}

  -- Replay Timeline
  replay_timeline JSONB,                  -- {checkpoints: [...], divergences: [...], timeline_view: {...}}

  -- Governance Propagation
  governance_propagation JSONB,           -- {events: [...], flow: [...], impact_analysis: {...}}

  -- Confidence Evolution
  confidence_chart JSONB,                 -- {data: [0.75, 0.82, 0.88, 0.91, 0.94], metadata: {...}}

  -- Distributed Synchronization
  sync_graph JSONB,                       -- {nodes: [...], sync_points: [...], causality: {...}}

  -- Execution Lineage
  execution_lineage JSONB,                -- {root: {...}, calls: [...], dependencies: [...]}

  -- Interactive Metadata
  visualization_state JSONB,              -- {zoom: 1.0, pan: {x: 0, y: 0}, highlighted: [...]}

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_execution_visualizations_execution ON execution_visualizations(execution_id);

-- ============================================================
-- 6. API HEALTH & STATUS ENGINE
-- ============================================================

CREATE TABLE api_health_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_metadata_id UUID NOT NULL REFERENCES api_metadata(id),

  -- Current Status
  status VARCHAR,                         -- "healthy", "degraded", "maintenance", "simulated", "beta", "production"
  health_score FLOAT,                     -- 0.0 to 1.0
  last_check TIMESTAMP,
  uptime_percentage FLOAT,                -- 99.95

  -- Metrics
  response_time_ms FLOAT,
  error_rate FLOAT,
  success_rate FLOAT,

  -- Status Metadata
  status_message TEXT,
  maintenance_window JSONB,               -- {start: "...", end: "...", reason: "..."}
  incident_history JSONB,                 -- [{timestamp: "...", severity: "...", description: "..."}]

  -- SLA Tracking
  sla_status VARCHAR,                     -- "met", "at_risk", "violated"
  sla_violations INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_status CHECK (status IN ('healthy', 'degraded', 'maintenance', 'simulated', 'beta', 'production')),
  CONSTRAINT valid_sla_status CHECK (sla_status IN ('met', 'at_risk', 'violated'))
);

CREATE INDEX idx_api_health_status_api ON api_health_status(api_metadata_id);
CREATE INDEX idx_api_health_status_status ON api_health_status(status);

-- Real-time status updates
CREATE TABLE api_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_metadata_id UUID NOT NULL REFERENCES api_metadata(id),
  previous_status VARCHAR,
  new_status VARCHAR,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_status_history_api ON api_status_history(api_metadata_id);
CREATE INDEX idx_api_status_history_created ON api_status_history(created_at DESC);

-- ============================================================
-- 7. ENTERPRISE AUDIT EXPORTS
-- ============================================================

CREATE TABLE audit_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Export Metadata
  export_type VARCHAR,                    -- "replay_export", "orchestration_export", "governance_export", "lineage_export", "audit_bundle"
  format VARCHAR,                         -- "json", "pdf", "bundle"
  description VARCHAR,

  -- Scope
  executions_included UUID[],             -- List of execution IDs
  apis_included UUID[],                   -- List of API IDs
  time_range_start TIMESTAMP,
  time_range_end TIMESTAMP,

  -- Export Content
  export_data JSONB,
  export_file_path VARCHAR,               -- S3/local path
  export_size_bytes INT,

  -- Audit Trail
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  downloaded_at TIMESTAMP,
  download_count INT DEFAULT 0,

  -- Compliance
  retention_days INT DEFAULT 90,
  expires_at TIMESTAMP,
  encryption_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_export_type CHECK (export_type IN ('replay_export', 'orchestration_export', 'governance_export', 'lineage_export', 'audit_bundle')),
  CONSTRAINT valid_format CHECK (format IN ('json', 'pdf', 'bundle'))
);

CREATE INDEX idx_audit_exports_user ON audit_exports(user_id);
CREATE INDEX idx_audit_exports_created ON audit_exports(created_at DESC);

-- ============================================================
-- 8. METADATA POPULATION AUTOMATION
-- ============================================================

CREATE TABLE metadata_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source Type
  source_type VARCHAR,                    -- "openapi_spec", "graphql_schema", "protobuf_contract", "orchestration_schema", "governance_policy"
  source_name VARCHAR,
  source_url VARCHAR,
  source_content TEXT,

  -- Processing
  last_synced TIMESTAMP,
  sync_frequency VARCHAR,                 -- "hourly", "daily", "weekly", "manual"
  auto_update BOOLEAN DEFAULT true,

  -- Generated Metadata
  generated_apis UUID[],                  -- API metadata IDs created from this source
  generation_errors JSONB,
  generation_status VARCHAR,              -- "success", "partial", "failed"

  -- Versioning
  source_version VARCHAR,
  schema_version VARCHAR,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_source_type CHECK (source_type IN ('openapi_spec', 'graphql_schema', 'protobuf_contract', 'orchestration_schema', 'governance_policy')),
  CONSTRAINT valid_sync_frequency CHECK (sync_frequency IN ('hourly', 'daily', 'weekly', 'manual'))
);

CREATE INDEX idx_metadata_sources_type ON metadata_sources(source_type);
CREATE INDEX idx_metadata_sources_synced ON metadata_sources(last_synced DESC);

-- Track metadata generation history
CREATE TABLE metadata_generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metadata_source_id UUID NOT NULL REFERENCES metadata_sources(id),
  api_metadata_id UUID NOT NULL REFERENCES api_metadata(id),

  -- Generation Details
  generation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  generated_fields JSONB,                 -- Which fields were auto-populated
  manual_overrides JSONB,                 -- Fields manually changed after generation
  generation_confidence FLOAT,            -- How confident is the generation

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metadata_generation_history_source ON metadata_generation_history(metadata_source_id);
CREATE INDEX idx_metadata_generation_history_api ON metadata_generation_history(api_metadata_id);

-- ============================================================
-- COGNITION-FIRST PLATFORM METRICS
-- ============================================================

CREATE TABLE cognitive_platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Orchestration Intelligence
  orchestration_complexity_avg FLOAT,     -- Average complexity of orchestrations
  orchestration_depth_max INT,            -- Deepest orchestration chain
  orchestration_patterns TEXT[],          -- ["sequential", "parallel", "conditional"]

  -- Replay Intelligence
  replay_usage_count INT DEFAULT 0,
  replay_divergence_analysis_count INT DEFAULT 0,
  replay_avg_time_travel_steps INT,

  -- Explainability
  explainability_queries INT DEFAULT 0,
  confidence_evolution_avg FLOAT,
  alternative_paths_explored INT DEFAULT 0,

  -- Governance
  governance_policies_applied INT DEFAULT 0,
  compliance_violations INT DEFAULT 0,
  governance_events_triggered INT DEFAULT 0,

  -- Distributed Cognition
  distributed_sync_operations INT DEFAULT 0,
  multimodal_orchestrations INT DEFAULT 0,
  cognitive_coordination_events INT DEFAULT 0,

  -- Platform Intelligence
  ask_cogni_queries INT DEFAULT 0,
  ask_cogni_avg_relevance_score FLOAT,
  sdk_downloads INT DEFAULT 0,

  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cognitive_metrics_user ON cognitive_platform_metrics(user_id);

-- ============================================================
-- VIEW: Complete API Status Dashboard
-- ============================================================

CREATE OR REPLACE VIEW api_operational_status AS
SELECT
  am.id,
  am.api_key,
  am.name,
  av.version_string,
  av.lifecycle_state,
  ahs.status,
  ahs.health_score,
  ahs.uptime_percentage,
  ahs.response_time_ms,
  ahs.error_rate,
  ac.name as category,
  (SELECT COUNT(*) FROM api_dependencies WHERE parent_api_id = am.id) as dependent_apis_count,
  (SELECT COUNT(*) FROM sdk_definitions WHERE api_metadata_id = am.id) as sdk_count,
  ap.policy_type,
  am.simulated,
  am.updated_at
FROM api_metadata am
LEFT JOIN api_versions av ON am.id = av.api_metadata_id AND av.lifecycle_state = 'stable'
LEFT JOIN api_health_status ahs ON am.id = ahs.api_metadata_id
LEFT JOIN api_categories ac ON am.category_id = ac.id
LEFT JOIN access_policies ap ON am.id = ap.api_metadata_id
ORDER BY am.updated_at DESC;

-- ============================================================
-- INITIALIZATION: Extended API Status Enum
-- ============================================================

INSERT INTO api_statuses (name, description, color) VALUES
  ('simulated', 'Simulated execution - no real backend calls', '#FFA500'),
  ('beta', 'Beta - testing phase, may have breaking changes', '#4169E1'),
  ('production', 'Production - stable, fully tested', '#00AA00'),
  ('enterprise', 'Enterprise - custom SLAs, dedicated support', '#8B008B'),
  ('deprecated', 'Deprecated - use alternative API instead', '#808080')
ON CONFLICT DO NOTHING;
