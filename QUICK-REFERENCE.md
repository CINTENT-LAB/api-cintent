# CINTENT Platform v2 - Quick Reference Card

## 📍 WHERE AM I?

**Stabilization & Operational Validation Phase**
- Foundation: ✅ Complete (frozen)
- Current focus: PostgreSQL setup → API population → end-to-end validation
- Phase: 2 of 4

---

## 🎯 IMMEDIATE NEXT STEPS (Priority Order)

| # | Task | Time | Output |
|---|------|------|--------|
| 1 | PostgreSQL 14+ setup on Hostinger | 2-4 hrs | Operational database |
| 2 | Load `api-metadata-registry.sql` | 30 min | 10 tables created |
| 3 | Load `enterprise-operationalization.sql` | 30 min | 8 systems schemas |
| 4 | Populate 50-100 initial APIs | 4-8 hrs | APIs in database |
| 5 | Validate user signup/login/subscription | 2-4 hrs | Complete flow |
| 6 | Test API key generation | 30 min | Keys working |
| 7 | Run playground (simulated) | 30 min | Traces generating |
| 8 | Build cognitive visualizer (React) | 4-6 hrs | Frontend complete |

**Estimated total:** 2-3 weeks to phase complete

---

## 🚀 QUICK START (Local Testing)

```bash
# Navigate to project
cd C:\Users\rpm_T\RAJA_REP\api-cintent

# Install dependencies
npm install

# Start server
npm start
# Server runs on localhost:3000

# Run tests
npm run test:ask-cogni-state
npm run test:orchestration-replay
npm run test:final-qa
```

---

## 🗄️ DATABASE SETUP (PostgreSQL 14+)

```bash
# On Hostinger or local:

# 1. Create database
createdb -U postgres cintent_platform

# 2. Enable pgvector
psql -U postgres -d cintent_platform -c "CREATE EXTENSION vector;"

# 3. Load schemas
psql -U postgres -d cintent_platform -f api-metadata-registry.sql
psql -U postgres -d cintent_platform -f enterprise-operationalization.sql

# 4. Verify
psql -U postgres -d cintent_platform -c "\dt"
# Should show 20+ tables
```

---

## 📝 ADD A NEW API (SQL Template)

```sql
INSERT INTO api_metadata (
  api_key, 
  name, 
  version,
  category, 
  short_description,
  full_description,
  endpoints,
  capabilities,
  execution_modes,
  billing,
  dependencies,
  lifecycle_state,
  cognitive
) VALUES (
  'your_api_key',
  'Your API Name',
  '1.0.0',
  'Travel',  -- or Drone, Robotics, Cobotics, Governance, Replay, Observability
  'Short description',
  'Long description',
  '[{"method": "POST", "path": "/execute", "description": "...", "request_schema": {...}, "response_schema": {...}}]'::jsonb,
  '{"orchestration": true, "replay": true, "governance": true, "distributed": true, "multimodal": false, "explainability": true}'::jsonb,
  '[{"mode": "simulated", "default": true, "description": "Generate simulated traces", "generates": {"orchestration_trace": true, "replay_trace": true, "governance_events": true, "confidence_evolution": true}}]'::jsonb,
  '{"tier_access": "developer", "quota_limit": 10000, "rate_limit": 100}'::jsonb,
  '[]'::jsonb,
  'production',
  '{"generates_orchestration_traces": true, "generates_replay_traces": true, "generates_explainability_outputs": true, "provides_confidence_evolution": true, "supports_divergence_analysis": true}'::jsonb
);
```

---

## 🔑 KEY ENDPOINTS

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/auth/register` | POST | User signup | ✅ Ready |
| `/api/auth/login` | POST | User login | ✅ Ready |
| `/api/catalog` | GET | List all APIs | ✅ Ready |
| `/api/catalog/:apiKey` | GET | Get single API metadata | ✅ Ready |
| `/api/playground/execute` | POST | Execute API (simulated) | ✅ Ready |
| `/api/cogni/ask` | POST | Ask COGNI (RAG search) | ✅ Ready |
| `/api/billing/plans` | GET | Get tier plans | ✅ Ready |
| `/api/dashboard/metrics` | GET | Cognitive metrics | ✅ Ready |
| `/api/health` | GET | Health check | ✅ Ready |
| `/api/versions` | GET/POST | Version management | ✅ Ready |
| `/api/dependencies` | GET | Dependency graph | ✅ Ready |
| `/api/sdks` | GET/POST | SDK generation | ✅ Ready |
| `/api/policies` | GET/POST | Access policies | ✅ Ready |
| `/api/visualizations/:type` | GET | Render visualizations | ✅ Ready |
| `/api/health-status` | GET | Real-time health | ✅ Ready |
| `/api/audit-export` | GET | Compliance export | ✅ Ready |

---

## 📊 CORE TABLES (PostgreSQL)

**api_metadata**
```sql
SELECT COUNT(*) FROM api_metadata;
-- Should show 50-100 after population
```

**api_executions**
```sql
SELECT * FROM api_executions WHERE api_key = 'your_api_key' ORDER BY created_at DESC LIMIT 10;
```

**users**
```sql
SELECT * FROM users WHERE email = 'user@example.com';
```

**user_subscriptions**
```sql
SELECT u.email, s.tier, s.quota_limit FROM user_subscriptions s
JOIN users u ON s.user_id = u.id;
```

---

## 🔒 HARD CONSTRAINTS

| Rule | Consequence |
|------|-------------|
| ❌ Don't load 1000+ APIs yet | Infrastructure bloat, validation delays |
| ❌ Don't change metadata schema | Breaks auto-generated features |
| ❌ Don't build frontend features | Backend first, then frontend |
| ❌ Don't optimize performance | Functional correctness first |
| ❌ Don't deploy to production | Stabilization not complete |

**Current rule:** 50-100 APIs, 4 categories, simulated mode ONLY

---

## 📚 DOCUMENTATION HIERARCHY

**Start here (15 min):**
- EXECUTIVE-SUMMARY.md (this is context)
- 00-START-HERE.md (current status)

**Then read (2 hours):**
- CANONICAL-METADATA-SCHEMA-V1.md (API spec)
- IMPLEMENTATION-GUIDE.md (setup guide)
- PROJECT-OVERVIEW.md (comprehensive overview)

**Deep dive (if needed):**
- ENTERPRISE-OPERATIONALIZATION.md (systems)
- CINTENT-PLATFORM-V2-IMPLEMENTATION-SUMMARY.md (full details)

---

## 🧪 TESTING COMMANDS

```bash
npm run test:ask-cogni-state              # Ask COGNI state engine
npm run test:persistence                  # Persistence layer
npm run test:orchestration-replay         # Orchestration & replay
npm run test:enterprise-ux                # Enterprise UX
npm run test:production-hardening         # Production hardening
npm run test:final-qa                     # Final QA acceptance
npm run test:runtime-integration          # Runtime integration
npm run test:canonical-governance         # Data governance
npm run test:workspace-lifecycle          # Workspace lifecycle
```

---

## 🐛 COMMON ISSUES & FIXES

**PostgreSQL extension not found:**
```sql
CREATE EXTENSION vector;
-- Make sure PostgreSQL 14+ with pgvector installed
```

**Vector dimension mismatch:**
```sql
-- pgvector vectors must be 1536-dimensional (for OpenAI embeddings)
ALTER TABLE cogni_knowledge_base 
ADD COLUMN embedding vector(1536);
```

**JWT token expired:**
```bash
# Token expires in 24 hours
# User must login again to get new token
```

**API key not found:**
```sql
-- Verify api_key exists and user has access
SELECT * FROM user_api_access WHERE api_key = 'your_key';
```

---

## 🎓 KNOWLEDGE MAP

**For Backend Developers:**
1. Read CANONICAL-METADATA-SCHEMA-V1.md (API spec)
2. Read server.js (13K lines, main implementation)
3. Read enterprise-endpoints.js (modular routers)
4. Run tests: `npm run test:*`

**For Database Developers:**
1. Read api-metadata-registry.sql (core schema)
2. Read enterprise-operationalization.sql (8 systems)
3. Test locally: create database, load schemas
4. Add sample APIs using SQL template above

**For Frontend Developers:**
1. Read ENTERPRISE-OPERATIONALIZATION.md (API endpoints)
2. Read CINTENT-PLATFORM-PROD.html (current UI)
3. Build React visualizer for orchestration graphs
4. Integrate with backend endpoints

---

## 🔗 GIT WORKFLOW

```bash
# Before starting
git pull origin main
git status

# Make changes
# ... edit files ...

# Commit
git add .
git commit -m "Description of changes"

# Push
git push origin main

# Verify
git status
# Should show: "Your branch is up to date with 'origin/main'"
```

---

## 🚨 RED FLAGS (Stop & Replan)

- ❌ Loading 500+ APIs (should be 50-100)
- ❌ Changing CANONICAL-METADATA-SCHEMA-V1 (it's frozen)
- ❌ Building complex frontend (focus on backend first)
- ❌ Optimizing performance (prove it works first)
- ❌ Deploying to production (stabilization not complete)

If you see any of these: **Stop, review hard constraints, replan.**

---

## ✅ SUCCESS CHECKLIST (Stabilization Phase)

- [ ] PostgreSQL database operational
- [ ] 20+ tables created from schemas
- [ ] 50-100 APIs populated
- [ ] User can signup
- [ ] User can login
- [ ] User can select subscription tier
- [ ] API key generation working
- [ ] Playground execution working (simulated)
- [ ] Replay generation working
- [ ] Ask COGNI responding to queries
- [ ] Dashboard metrics displaying
- [ ] Audit export downloading
- [ ] One complete user workflow end-to-end validated
- [ ] All 8 enterprise system endpoints functional

**When all checked: Stabilization phase complete ✅**

---

## 📞 CONTACT & SUPPORT

**Ron's email:** rupamarora.pm@gmail.com  
**Repository:** https://github.com/CINTENT-LAB/api-cintent  
**Domain:** api-cintent.cognivantalabs.com  

**For questions:** Refer to appropriate documentation section above

---

**Current Status: Foundation Complete ✅ | Stabilization Phase 🚀 | May 16, 2026**

Ready to build? Start with PostgreSQL setup! 🔨
