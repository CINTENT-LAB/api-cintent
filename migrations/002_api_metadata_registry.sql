-- CINTENT PLATFORM V2 - API METADATA REGISTRY
-- Source of truth for all platform capabilities
-- Loaded AFTER enterprise persistence to avoid conflicts

CREATE TABLE IF NOT EXISTS api_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR,
  order_index INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  version VARCHAR,
  category_id UUID REFERENCES api_categories,
  status_id UUID REFERENCES api_statuses,
  short_description VARCHAR(500),
  full_description TEXT,
  use_cases TEXT[],
  capabilities JSONB,
  cognitive_dimensions JSONB,
  endpoints JSONB NOT NULL,
  documentation_url VARCHAR,
  code_examples JSONB,
  sdk_available BOOLEAN DEFAULT false,
  sdk_languages TEXT[],
  simulated BOOLEAN DEFAULT true,
  simulation_behavior JSONB,
  min_tier VARCHAR,
  quota_limit INT,
  rate_limit INT,
  requires_authentication BOOLEAN DEFAULT true,
  required_scopes TEXT[],
  dependencies UUID[],
  tags TEXT[],
  keywords TEXT[],
  search_vector tsvector,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_min_tier CHECK (min_tier IN ('free', 'developer', 'professional', 'enterprise'))
);

CREATE INDEX IF NOT EXISTS idx_api_metadata_category ON api_metadata(category_id);
CREATE INDEX IF NOT EXISTS idx_api_metadata_status ON api_metadata(status_id);
CREATE INDEX IF NOT EXISTS idx_api_metadata_min_tier ON api_metadata(min_tier);
CREATE INDEX IF NOT EXISTS idx_api_metadata_search ON api_metadata USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_api_metadata_embedding ON api_metadata USING HNSW(embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS api_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_metadata_id UUID NOT NULL REFERENCES api_metadata,
  environment VARCHAR,
  request_payload JSONB,
  simulated BOOLEAN,
  orchestration_trace JSONB,
  replay_trace JSONB,
  governance_events JSONB,
  explainability_output JSONB,
  confidence_score FLOAT,
  complexity_score FLOAT,
  execution_time_ms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_executions_user ON api_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_api_executions_metadata ON api_executions(api_metadata_id);

CREATE TABLE IF NOT EXISTS cogni_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_metadata_id UUID REFERENCES api_metadata,
  document_type VARCHAR,
  content TEXT,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cogni_kb_embedding ON cogni_knowledge_base USING HNSW(embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id text,
  tier VARCHAR NOT NULL,
  billing_cycle VARCHAR,
  status VARCHAR,
  quota_limit INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS user_api_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_metadata_id UUID NOT NULL REFERENCES api_metadata,
  access_tier VARCHAR,
  quota_remaining INT,
  last_called TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_api_access_user ON user_api_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_access_api ON user_api_access(api_metadata_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  api_metadata_id UUID,
  action VARCHAR,
  resource_type VARCHAR,
  resource_id VARCHAR,
  changes JSONB,
  ip_address VARCHAR,
  user_agent VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

INSERT INTO api_statuses (name, description) VALUES
  ('simulated', 'API is simulated for playground'),
  ('beta', 'API is in beta testing'),
  ('production', 'API is production-ready'),
  ('enterprise', 'API is enterprise-grade'),
  ('deprecated', 'API is deprecated')
ON CONFLICT (name) DO NOTHING;

INSERT INTO api_categories (name, description) VALUES
  ('Travel', 'Travel and logistics APIs'),
  ('Drone', 'Drone and autonomous vehicle APIs'),
  ('Robotics', 'Robotics and automation APIs'),
  ('Cobotics', 'Collaborative robotics APIs'),
  ('Governance', 'Governance and compliance APIs'),
  ('Replay', 'Execution replay and analysis APIs'),
  ('Observability', 'Observability and monitoring APIs')
ON CONFLICT (name) DO NOTHING;
