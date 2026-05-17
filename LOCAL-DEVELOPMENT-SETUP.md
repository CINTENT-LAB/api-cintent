# CINTENT Platform v2 - Local Development Setup

**Purpose:** Run CINTENT API on localhost for demonstration  
**Target:** http://localhost:3000  
**Date:** May 13, 2026

---

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 22.x installed (`node --version`)
- ✅ npm 10.x installed (`npm --version`)
- ✅ PostgreSQL 14+ installed locally or accessible
- ✅ Git configured with credentials
- ✅ All files from GitHub pushed and cloned

---

## Step 1: Clone Repository (If Not Already Done)

```bash
# Clone the repository
git clone https://github.com/CINTENT-LAB/api-cintent.git
cd api-cintent

# Verify you have all files
ls -la api-metadata-registry.sql enterprise-operationalization.sql server-metadata-driven.js package.json
```

---

## Step 2: Set Up Local PostgreSQL Database

### Option A: PostgreSQL Already Installed Locally

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql prompt:
CREATE DATABASE cintent_dev;
CREATE USER cintent_dev WITH PASSWORD 'dev-password-123';
ALTER ROLE cintent_dev WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE cintent_dev TO cintent_dev;
\q

# Enable pgvector extension
psql -U postgres -d cintent_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Load schemas
psql -U cintent_dev -d cintent_dev -f api-metadata-registry.sql
psql -U cintent_dev -d cintent_dev -f enterprise-operationalization.sql

# Verify tables created
psql -U cintent_dev -d cintent_dev -c "\dt"
# Should show ~20 tables
```

### Option B: Docker PostgreSQL (If You Have Docker)

```bash
# Start PostgreSQL container
docker run --name cintent-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cintent_dev \
  -p 5432:5432 \
  -v pgvector_data:/var/lib/postgresql/data \
  pgvector/pgvector:pg14-latest

# In another terminal, load schemas
docker exec -i cintent-postgres psql -U postgres -d cintent_dev < api-metadata-registry.sql
docker exec -i cintent-postgres psql -U postgres -d cintent_dev < enterprise-operationalization.sql
```

### Option C: Use SQLite (No PostgreSQL Needed)

If PostgreSQL setup is complex, we can use SQLite for local development:
- See ALTERNATIVE-SQLITE-SETUP.md (we can create this if needed)

---

## Step 3: Configure Environment Variables

Create `.env` file in the root directory:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=cintent_dev
DB_PASSWORD=dev-password-123
DB_NAME=cintent_dev

# Server Configuration
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-local-dev-only-12345

# Stripe Configuration (for local demo, can be test keys)
STRIPE_PUBLIC_KEY=pk_test_dummy_local_dev
STRIPE_SECRET_KEY=sk_test_dummy_local_dev
STRIPE_WEBHOOK_SECRET=whsec_test_dummy_local_dev

# OpenAI/Claude Configuration (for Ask COGNI)
OPENAI_API_KEY=sk-dummy-for-local-dev
CLAUDE_API_KEY=sk-ant-dummy-for-local-dev

# Feature Flags
ENABLE_SIMULATED_EXECUTION=true
ENABLE_REPLAY_SERVICE=true
ENABLE_GOVERNANCE_ENFORCEMENT=true
ENABLE_OBSERVABILITY_METRICS=true

# Logging
LOG_LEVEL=debug
```

---

## Step 4: Install Dependencies

```bash
# Install npm packages
npm install

# Verify installation
npm list
# Should show: express, pg, jsonwebtoken, bcryptjs, stripe, openai
```

---

## Step 5: Start the Local Server

```bash
# Start the metadata-driven server
npm run start:metadata

# Expected output:
# ✓ CINTENT Platform v2 - Metadata-Driven Server
# ✓ Database connected to cintent_dev
# ✓ 20 tables initialized
# ✓ Server running on http://localhost:3000
# ✓ Ready for requests
```

---

## Step 6: Populate Initial APIs (Local Demo Data)

In another terminal:

```bash
# Connect to database
psql -U cintent_dev -d cintent_dev

# Paste the SQL below to add demo APIs
```

### Demo APIs SQL

```sql
-- Travel Orchestration API
INSERT INTO api_metadata (
  api_key, name, version, category_id, status_id,
  short_description, full_description, use_cases,
  capabilities, cognitive_dimensions,
  endpoints, documentation_url, simulated, min_tier, quota_limit
) VALUES (
  'travel_orchestration_v2',
  'Travel Orchestration Engine',
  '2.1.0',
  (SELECT id FROM api_categories WHERE name = 'Travel'),
  (SELECT id FROM api_statuses WHERE name = 'production'),
  'Orchestrate complex travel bookings across multiple providers',
  'Complete travel booking orchestration with multi-provider support',
  ARRAY['flight_booking', 'hotel_coordination', 'itinerary_planning'],
  '{"orchestration": true, "replay": true, "governance": true, "distributed": true, "multimodal": false, "explainability": true}'::jsonb,
  '{"domain": "travel", "business_problem": "booking_optimization", "workflow": "multi_step_orchestration", "orchestration_type": "sequential", "industry_capability": "e-commerce", "replay_explainability": true}'::jsonb,
  '[{"method": "POST", "path": "/orchestrate", "description": "Execute orchestrated travel booking", "request_schema": {"type": "object", "properties": {"trip_type": {"type": "string"}, "origin": {"type": "string"}, "destination": {"type": "string"}}}, "response_schema": {"type": "object", "properties": {"orchestration_id": {"type": "string"}, "status": {"type": "string"}}}}]'::jsonb,
  '/docs/travel-orchestration',
  false,
  'developer',
  10000
);

-- Drone Autonomous Flight API
INSERT INTO api_metadata (
  api_key, name, version, category_id, status_id,
  short_description, full_description, use_cases,
  capabilities, cognitive_dimensions,
  endpoints, documentation_url, simulated, min_tier, quota_limit
) VALUES (
  'drone_autonomous_flight_v1',
  'Drone Autonomous Flight Controller',
  '1.0.0',
  (SELECT id FROM api_categories WHERE name = 'Drone'),
  (SELECT id FROM api_statuses WHERE name = 'beta'),
  'Autonomous drone flight planning with obstacle avoidance',
  'Advanced drone flight orchestration with real-time replanning',
  ARRAY['autonomous_delivery', 'survey_mapping', 'emergency_response'],
  '{"orchestration": true, "replay": true, "governance": true, "distributed": true, "multimodal": true, "explainability": true}'::jsonb,
  '{"domain": "drone", "business_problem": "autonomous_coordination", "workflow": "real_time_execution", "orchestration_type": "conditional", "industry_capability": "logistics", "replay_explainability": true}'::jsonb,
  '[{"method": "POST", "path": "/plan-flight", "description": "Plan autonomous flight path", "request_schema": {"type": "object"}, "response_schema": {"type": "object"}}]'::jsonb,
  '/docs/drone-flight',
  true,
  'professional',
  5000
);

-- Replay Service API
INSERT INTO api_metadata (
  api_key, name, version, category_id, status_id,
  short_description, full_description, use_cases,
  capabilities, cognitive_dimensions,
  endpoints, documentation_url, simulated, min_tier, quota_limit
) VALUES (
  'replay_service_v1',
  'Orchestration Replay & Time-Travel',
  '1.5.0',
  (SELECT id FROM api_categories WHERE name = 'Replay'),
  (SELECT id FROM api_statuses WHERE name = 'production'),
  'Time-travel through orchestrated executions to understand decision points',
  'Forensic analysis and learning from past executions',
  ARRAY['debugging', 'auditing', 'learning'],
  '{"orchestration": false, "replay": true, "governance": true, "distributed": false, "multimodal": false, "explainability": true}'::jsonb,
  '{"domain": "observability", "business_problem": "execution_analysis", "workflow": "sequential", "orchestration_type": "sequential", "industry_capability": "compliance", "replay_explainability": true}'::jsonb,
  '[{"method": "POST", "path": "/replay", "description": "Replay an execution", "request_schema": {"type": "object"}, "response_schema": {"type": "object"}}]'::jsonb,
  '/docs/replay-service',
  false,
  'developer',
  unlimited
);

-- Governance Enforcement API
INSERT INTO api_metadata (
  api_key, name, version, category_id, status_id,
  short_description, full_description, use_cases,
  capabilities, cognitive_dimensions,
  endpoints, documentation_url, simulated, min_tier, quota_limit
) VALUES (
  'governance_enforcement_v1',
  'Governance Policy Enforcement',
  '1.0.0',
  (SELECT id FROM api_categories WHERE name = 'Governance'),
  (SELECT id FROM api_statuses WHERE name = 'production'),
  'Enforce compliance policies across all API executions',
  'Real-time governance policy evaluation and enforcement',
  ARRAY['compliance_audit', 'policy_enforcement', 'risk_mitigation'],
  '{"orchestration": false, "replay": false, "governance": true, "distributed": true, "multimodal": false, "explainability": true}'::jsonb,
  '{"domain": "governance", "business_problem": "compliance_enforcement", "workflow": "event_driven", "orchestration_type": "parallel", "industry_capability": "enterprise", "replay_explainability": true}'::jsonb,
  '[{"method": "POST", "path": "/evaluate-policy", "description": "Evaluate execution against policies", "request_schema": {"type": "object"}, "response_schema": {"type": "object"}}]'::jsonb,
  '/docs/governance',
  false,
  'enterprise',
  unlimited
);

-- Verify inserts
SELECT api_key, name, version, simulated FROM api_metadata ORDER BY created_at DESC;
```

---

## Step 7: Test the API

### Test 1: Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "environment": "development",
  "timestamp": "2026-05-13T..."
}
```

### Test 2: Get API Catalog

```bash
curl http://localhost:3000/api/catalog
```

Expected response:
```json
{
  "apis": [
    {
      "api_key": "travel_orchestration_v2",
      "name": "Travel Orchestration Engine",
      "version": "2.1.0",
      "category": "Travel",
      "status": "production",
      "short_description": "Orchestrate complex travel bookings..."
    },
    // ... more APIs
  ],
  "total": 4,
  "timestamp": "2026-05-13T..."
}
```

### Test 3: Get Single API

```bash
curl http://localhost:3000/api/catalog/travel_orchestration_v2
```

### Test 4: Playground Execution (Simulated)

```bash
curl -X POST http://localhost:3000/api/playground/execute \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "travel_orchestration_v2",
    "parameters": {
      "trip_type": "round_trip",
      "origin": "SFO",
      "destination": "NYC"
    }
  }'
```

Expected response:
```json
{
  "execution_id": "exec_123456",
  "status": "success",
  "orchestration_trace": {
    "root": {...},
    "steps": [...]
  },
  "replay_trace": {
    "checkpoints": [...]
  },
  "governance_events": [...],
  "confidence_evolution": [...],
  "explainability_output": {...}
}
```

### Test 5: Dashboard Metrics

```bash
curl http://localhost:3000/api/dashboard/metrics
```

---

## Step 8: Connect Frontend

Once the backend is running on localhost:3000, connect the professional frontend:

### Option A: Frontend on Localhost

```bash
# Copy the frontend HTML to a local dev folder
cp CINTENT-PLATFORM-PROD.html public/

# The server serves it at:
# http://localhost:3000/
```

### Option B: Update Frontend API Configuration

In the frontend HTML (CINTENT-PLATFORM-PROD.html), find the API configuration section and update:

```javascript
// Find this section in the HTML:
const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',  // Point to local server
  USE_METADATA_API: true
};

// Or if hardcoded, replace API endpoints:
// OLD: https://api-cintent.cognivantalabs.com/api/...
// NEW: http://localhost:3000/api/...
```

### Option C: Run Frontend Separately

If you have the frontend on a separate domain, just point it to localhost:3000:

```html
<!-- In HTML or JavaScript -->
<script>
  const API_BASE = 'http://localhost:3000';
  const USE_METADATA_API = true;
</script>
```

---

## Step 9: Authentication (Local Testing)

### Get JWT Token

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@cintent.local",
    "password": "demo-password-123",
    "name": "Demo User"
  }'

# Response will include:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_123",
    "email": "demo@cintent.local",
    "name": "Demo User"
  }
}

# Copy the token for authenticated requests
TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Use it for authenticated endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/dashboard/metrics
```

---

## Step 10: Access the Platform

### Via Web Browser

**Option 1: Local Server**
```
http://localhost:3000
```

**Option 2: Frontend on Production + Backend on Localhost**
- Open https://api-cintent.cognivantalabs.com/CINTENT-PLATFORM-PROD.html
- Update the API base URL in browser console or HTML to:
  ```javascript
  window.API_BASE = 'http://localhost:3000';
  ```

---

## Troubleshooting

### "Database connection failed"
```bash
# Check PostgreSQL is running
psql -U cintent_dev -d cintent_dev -c "SELECT 1;"

# If error, restart PostgreSQL
# macOS: brew services restart postgresql
# Linux: sudo systemctl restart postgresql
# Windows: Services > PostgreSQL > Restart
```

### "Port 3000 already in use"
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 npm run start:metadata
```

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "Cannot find tables"
```bash
# Verify schemas loaded
psql -U cintent_dev -d cintent_dev -c "\dt"

# If empty, reload schemas
psql -U cintent_dev -d cintent_dev -f api-metadata-registry.sql
psql -U cintent_dev -d cintent_dev -f enterprise-operationalization.sql
```

### CORS Issues (Frontend to Backend)

If frontend on different origin, add CORS configuration:

```javascript
// In server-metadata-driven.js, add:
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://api-cintent.cognivantalabs.com'],
  credentials: true
}));
```

---

## Demo Scenario: Complete User Journey

Once everything is running:

```bash
# 1. Check server health
curl http://localhost:3000/api/health

# 2. List available APIs
curl http://localhost:3000/api/catalog

# 3. Get specific API details
curl http://localhost:3000/api/catalog/travel_orchestration_v2

# 4. Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@local","password":"123","name":"Demo"}'

# 5. Execute API (simulated)
TOKEN="<from step 4>"
curl -X POST http://localhost:3000/api/playground/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "travel_orchestration_v2",
    "parameters": {"trip_type":"round_trip","origin":"SFO","destination":"NYC"}
  }'

# 6. View dashboard metrics
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/dashboard/metrics

# 7. Ask COGNI
curl -X POST http://localhost:3000/api/cogni/ask \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"How do I book a flight?"}'
```

---

## Files to Verify

Before starting, ensure these files exist in your directory:

```
✅ api-metadata-registry.sql
✅ enterprise-operationalization.sql
✅ server-metadata-driven.js
✅ enterprise-endpoints.js
✅ package.json
✅ .env (created in Step 3)
✅ CINTENT-PLATFORM-PROD.html (optional, for UI)
```

---

## Summary

| Step | Action | Time |
|------|--------|------|
| 1 | Clone repository | 2 min |
| 2 | Set up PostgreSQL | 5 min |
| 3 | Configure .env | 2 min |
| 4 | Install dependencies | 2 min |
| 5 | Start server | 1 min |
| 6 | Populate demo APIs | 2 min |
| 7 | Test API endpoints | 5 min |
| 8 | Connect frontend | 3 min |
| 9 | Test authentication | 3 min |
| 10 | Access platform | 1 min |

**Total: ~26 minutes to full local demo**

---

## Next: Demonstration

Once running locally:
- Show API catalog filtering
- Execute playground simulation
- Show orchestration traces
- Show replay functionality
- Show Ask COGNI responses
- Show dashboard metrics
- Show governance events

All running on **http://localhost:3000** 🚀

---

**Status: Ready for Local Demonstration**

All files are production-ready. Local setup takes ~25 minutes.
