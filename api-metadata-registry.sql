-- ============================================================
-- CINTENT PLATFORM V2 - API METADATA REGISTRY
-- Source of truth for all platform capabilities
-- ============================================================

-- API Categories (domains)
CREATE TABLE api_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR UNIQUE NOT NULL,           -- "Travel", "Drone", "Robotics"
  description TEXT,
  icon VARCHAR,
  order_index INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Status Types
CREATE TABLE api_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR UNIQUE NOT NULL,           -- "simulated", "beta", "production", "enterprise", "deprecated"
  description TEXT,
  color VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Metadata Registry (SINGLE SOURCE OF TRUTH)
CREATE TABLE api_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Identity
  api_key VARCHAR UNIQUE NOT NULL,        -- "travel_orchestration_v2"
  name VARCHAR NOT NULL,                  -- "Travel Orchestration Engine"
  version VARCHAR,                         -- "2.1.0"
  category_id UUID REFERENCES api_categories,

  -- Status & Lifecycle
  status_id UUID REFERENCES api_statuses,  -- simulated/beta/production/enterprise/deprecated

  -- Descriptions
  short_description VARCHAR(500),
  full_description TEXT,
  use_cases TEXT[],                        -- ["flight_booking", "hotel_search", ...]

  -- Capabilities (JSON for flexibility)
  capabilities JSONB,                      -- {
                                          --   "orchestration": true,
                                          --   "replay": true,
                                          --   "governance": true,
                                          --   "distributed": true
                                          -- }

  -- Cognitive Dimensions
  cognitive_dimensions JSONB,              -- {
                                          --   "domain": "travel",
                                          --   "business_problem": "booking_optimization",
                                          --   "workflow": "multi_step_orchestration",
                                          --   "orchestration_type": "sequential",
                                          --   "industry_capability": "e-commerce",
                                          --   "replay_explainability": true
                                          -- }

  -- API Endpoint Specification
  endpoints JSONB NOT NULL,                -- [
                                          --   {
                                          --     "method": "POST",
                                          --     "path": "/orchestrate",
                                          --     "description": "...",
                                          --     "request_schema": {...},
                                          --     "response_schema": {...}
                                          --   }
                                          -- ]

  -- Documentation
  documentation_url VARCHAR,
  code_examples JSONB,                     -- {"typescript": "...", "python": "...", "rest": "..."}
  sdk_available BOOLEAN DEFAULT false,
  sdk_languages TEXT[],                    -- ["typescript", "python", "go"]

  -- Simulation Configuration
  simulated BOOLEAN DEFAULT true,
  simulation_behavior JSONB,               -- {
                                          --   "generates_orchestration_traces": true,
                                          --   "generates_replay_traces": true,
                                          --   "generates_governance_events": true,
                                          --   "confidence_evolution": true
                                          -- }

  -- Billing & Access Control
  min_tier VARCHAR,                        -- "free", "developer", "professional", "enterprise"
  quota_limit INT,                         -- calls/month
  rate_limit INT,                          -- calls/second

  -- Requirements & Dependencies
  requires_authentication BOOLEAN DEFAULT true,
  required_scopes TEXT[],                  -- ["api:read", "replay:read", ...]
  dependencies UUID[],                     -- other APIs this depends on

  -- Metadata
  tags TEXT[],
  keywords TEXT[],
  search_vector tsvector,                  -- for full-text search
  embedding vector(1536),                  -- pgvector embedding for RAG

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_min_tier CHECK (min_tier IN ('free', 'developer', 'professional', 'enterprise'))
);

-- Indexes for performance
CREATE INDEX idx_api_metadata_category ON api_metadata(category_id);
CREATE INDEX idx_api_metadata_status ON api_metadata(status_id);
CREATE INDEX idx_api_metadata_min_tier ON api_metadata(min_tier);
CREATE INDEX idx_api_metadata_search ON api_metadata USING GIN(search_vector);
CREATE INDEX idx_api_metadata_embedding ON api_metadata USING HNSW(embedding vector_cosine_ops);

-- API Playground Execution History
CREATE TABLE api_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_metadata_id UUID NOT NULL REFERENCES api_metadata,

  -- Execution Context
  environment VARCHAR,                     -- "sandbox", "production", "simulated"
  request_payload JSONB,

  -- Simulated Execution Output
  simulated BOOLEAN,
  orchestration_trace JSONB,               -- {
                                          --   "steps": [...],
                                          --   "duration_ms": 1234,
                                          --   "hops": 5,
                                          --   "distributed": true
                                          -- }
  replay_trace JSONB,                      -- {
                                          --   "checkpoints": [...],
                                          --   "divergence_points": [...]
                                          -- }
  governance_events JSONB,                 -- [
                                          --   {"type": "policy_check", "result": "passed"},
                                          --   {"type": "compliance_verify", "result": "passed"}
                                          -- ]
  explainability_output JSONB,             -- {
                                          --   "confidence_evolution": [0.85, 0.88, 0.92],
                                          --   "reasoning_path": "...",
                                          --   "alternatives": [...]
                                          -- }

  -- Cognitive Metrics
  confidence_score FLOAT,
  complexity_score FLOAT,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Ask COGNI Knowledge Base (populated from API metadata)
CREATE TABLE cogni_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR,                     -- "api_documentation", "orchestration_trace", "replay_example", "governance_doc"
  source_id UUID,                          -- api_metadata_id or execution_id

  content TEXT,                            -- full documentation/example/explanation
  content_type VARCHAR,                    -- "markdown", "json", "code"

  embedding vector(1536),                  -- pgvector for RAG
  metadata JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cogni_kb_embedding ON cogni_knowledge_base USING HNSW(embedding vector_cosine_ops);
CREATE INDEX idx_cogni_kb_source ON cogni_knowledge_base(source_type, source_id);

-- Users (from earlier)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Subscriptions (Stripe-backed)
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),

  plan VARCHAR NOT NULL,                  -- "free", "developer", "professional", "enterprise"
  stripe_subscription_id VARCHAR,
  stripe_customer_id VARCHAR,

  status VARCHAR,                         -- "active", "cancelled", "expired"
  monthly_quota INT,                      -- API calls allowed
  monthly_used INT DEFAULT 0,

  billing_cycle_start TIMESTAMP,
  billing_cycle_end TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_plan CHECK (plan IN ('free', 'developer', 'professional', 'enterprise'))
);

-- User API Access (for RBAC and audit)
CREATE TABLE user_api_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  api_metadata_id UUID NOT NULL REFERENCES api_metadata,

  access_level VARCHAR,                   -- "read", "execute", "admin"
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,

  UNIQUE(user_id, api_metadata_id)
);

-- Audit Trail (for security & compliance)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),

  action VARCHAR,                         -- "api_executed", "playground_access", "doc_viewed", "sdk_downloaded"
  resource_type VARCHAR,                  -- "api", "execution", "replay"
  resource_id UUID,

  metadata JSONB,
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================
-- INITIALIZATION: Insert API Statuses
-- ============================================================

INSERT INTO api_statuses (name, description, color) VALUES
  ('simulated', 'Simulated execution - no real backend calls', '#FFA500'),
  ('beta', 'Beta - testing phase, may have breaking changes', '#4169E1'),
  ('production', 'Production - stable, fully tested', '#00AA00'),
  ('enterprise', 'Enterprise - custom SLAs, dedicated support', '#8B008B'),
  ('deprecated', 'Deprecated - use alternative API instead', '#808080');

-- ============================================================
-- INITIALIZATION: Insert API Categories
-- ============================================================

INSERT INTO api_categories (name, description, icon, order_index) VALUES
  ('Travel', 'Travel orchestration, flight booking, hotel coordination', '✈️', 1),
  ('Drone', 'Autonomous drone systems, flight planning, mission coordination', '🚁', 2),
  ('Robotics', 'Robotic systems, motion planning, task execution', '🤖', 3),
  ('Cobotics', 'Collaborative robotics, human-robot interaction', '👥', 4),
  ('Governance', 'Policy enforcement, compliance, audit systems', '📋', 5),
  ('Replay', 'Execution replay, time-travel debugging, divergence analysis', '⏪', 6),
  ('Observability', 'Telemetry, metrics, distributed tracing', '📊', 7);
