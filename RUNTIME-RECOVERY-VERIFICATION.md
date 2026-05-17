# CINTENT RUNTIME RECOVERY & VERIFICATION PLAN

**Status:** RECOVERY PROCEDURES DOCUMENTED  
**Target:** Full PostgreSQL operationalization with persistence validation

---

## PHASE 1: ENVIRONMENT CONFIGURATION FIX

### Action Items

1. **Verify `.env` File**
   ```bash
   cat .env | grep -E "DB_USER|DB_NAME|DB_PASSWORD"
   ```
   Expected output:
   ```
   DB_USER=cintent
   DB_NAME=cintent
   DB_PASSWORD=cintent_dev_password
   ```

2. **Backup Current Configuration**
   ```bash
   cp docker-compose.yml docker-compose.yml.backup
   cp .env .env.backup
   ```

3. **Verify Correctness**
   - `.env` DB_USER: `cintent` ✅
   - `.env` DB_NAME: `cintent` ✅
   - docker-compose POSTGRES_USER: `cintent` ✅
   - docker-compose POSTGRES_DB: `cintent` ✅

---

## PHASE 2: CONTAINER RESTART (Docker Environment)

**If running in Docker:**

### Step 1: Stop Containers
```bash
docker-compose down
```

### Step 2: Clean Database Volume (First Time Only)
```bash
# ⚠️  WARNING: This deletes all data
# docker volume rm api-cintent_postgres-data
# OR let containers recreate it fresh
```

### Step 3: Start PostgreSQL
```bash
docker-compose up -d postgres
sleep 15  # Wait for migrations to execute
```

### Step 4: Verify PostgreSQL Health
```bash
docker-compose ps postgres
# Expected: service_healthy ✅
```

---

## PHASE 3: MIGRATION VERIFICATION

### Check Migration Execution

```bash
# List all tables in database
docker exec cintent-postgres psql -U cintent -d cintent -c "\dt"
```

**Expected output (14 tables):**
```
Schema |          Name          | Type  |  Owner  
--------+------------------------+-------+---------
 public | tenants                | table | cintent
 public | users                  | table | cintent
 public | sessions               | table | cintent
 public | workspaces             | table | cintent
 public | orchestration_runs     | table | cintent
 public | workflow_states        | table | cintent
 public | replay_events          | table | cintent
 public | telemetry_streams      | table | cintent
 public | ask_cogni_sessions     | table | cintent
 public | simulations            | table | cintent
 public | governance_events      | table | cintent
 public | sdk_generations        | table | cintent
 public | runtime_metrics        | table | cintent
 public | runtime_events         | table | cintent
```

### Check Extensions

```bash
docker exec cintent-postgres psql -U cintent -d cintent -c "\dx"
```

**Expected output:**
```
 pgcrypto  | 1.3    | public | cryptographic functions
 vector    | 0.5.1  | public | type for storing OpenAI embeddings
```

### Verify Table Row Counts

```bash
docker exec cintent-postgres psql -U cintent -d cintent << 'SQL'
SELECT 
  schemaname,
  tablename,
  (SELECT count(*) FROM pg_class WHERE relname=tablename) as rows
FROM pg_tables 
WHERE schemaname='public'
ORDER BY tablename;
SQL
```

---

## PHASE 4: DATABASE CONNECTIVITY TEST

### From Local Machine (Non-Docker)

```bash
# Test with psql
psql -h localhost -U cintent -d cintent -c "SELECT version();"

# Expected output:
# PostgreSQL 16.x on x86_64-pc-linux-gnu, compiled by ...
```

### From Node.js

```bash
node << 'JAVASCRIPT'
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'cintent',
  password: 'cintent_dev_password',
  database: 'cintent'
});

async function test() {
  try {
    const result = await pool.query('SELECT version()');
    console.log('✅ CONNECTION SUCCESS');
    console.log('PostgreSQL:', result.rows[0].version.split(',')[0]);
    
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname='public'
    `);
    console.log(`✅ FOUND ${tables.rows.length} TABLES`);
    console.log('Tables:', tables.rows.map(r => r.tablename).join(', '));
    
    // Test vector extension
    const vector = await pool.query("SELECT 1 FROM pg_extension WHERE extname='vector'");
    console.log(`✅ pgvector: ${vector.rows.length > 0 ? 'ENABLED' : 'DISABLED'}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ CONNECTION FAILED:', err.message);
    process.exit(1);
  }
}

test();
JAVASCRIPT
```

---

## PHASE 5: PERSISTENCE OPERATION TESTS

### Test 1: Insert User

```bash
docker exec cintent-postgres psql -U cintent -d cintent << 'SQL'
INSERT INTO users (user_id, tenant_id, email, name, role)
VALUES ('test-user-1', 'test-tenant', 'test@example.com', 'Test User', 'admin');

SELECT user_id, email, name FROM users WHERE user_id='test-user-1';
SQL
```

**Expected:**
- Insert succeeds
- SELECT returns 1 row
- Email: `test@example.com`

### Test 2: Insert Orchestration Run

```bash
docker exec cintent-postgres psql -U cintent -d cintent << 'SQL'
INSERT INTO orchestration_runs 
  (orchestration_id, tenant_id, status, current_stage)
VALUES 
  ('orch-test-1', 'test-tenant', 'running', 'initialization');

SELECT orchestration_id, status, current_stage FROM orchestration_runs 
WHERE orchestration_id='orch-test-1';
SQL
```

**Expected:**
- Insert succeeds
- Status: `running`
- Stage: `initialization`

### Test 3: Insert Replay Event

```bash
docker exec cintent-postgres psql -U cintent -d cintent << 'SQL'
INSERT INTO replay_events 
  (replay_event_id, tenant_id, replay_id, event_type, sequence_no, payload)
VALUES 
  ('replay-evt-1', 'test-tenant', 'replay-1', 'api_call', 1, '{"api":"test"}');

SELECT COUNT(*) as event_count FROM replay_events 
WHERE replay_id='replay-1';
SQL
```

**Expected:**
- Insert succeeds
- Event count: 1

### Test 4: Insert Governance Event

```bash
docker exec cintent-postgres psql -U cintent -d cintent << 'SQL'
INSERT INTO governance_events 
  (governance_event_id, tenant_id, event_type, decision, payload)
VALUES 
  ('gov-evt-1', 'test-tenant', 'license_check', 'approved', '{"user":"test"}');

SELECT COUNT(*) as policy_events FROM governance_events 
WHERE event_type='license_check';
SQL
```

**Expected:**
- Insert succeeds
- Policy events: 1

### Test 5: Verify Data Persistence (Restart Test)

```bash
# 1. Insert data
docker exec cintent-postgres psql -U cintent -d cintent -c \
  "INSERT INTO users VALUES ('persist-test', 'tenant-1', 'persist@test.com', 'Test', 'viewer');"

# 2. Count rows
docker exec cintent-postgres psql -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM users WHERE user_id='persist-test';" 
# Expected: 1

# 3. Restart PostgreSQL container
docker-compose restart postgres
sleep 10

# 4. Verify data still exists
docker exec cintent-postgres psql -U cintent -d cintent -c \
  "SELECT email FROM users WHERE user_id='persist-test';"
# Expected: persist@test.com ✅
```

---

## PHASE 6: API SERVER STARTUP TEST

### Start API Server

```bash
# Option 1: Docker
docker-compose up -d cintent-api
sleep 10
docker logs cintent-api | tail -20

# Option 2: Local Node.js
cd /sessions/zen-cool-heisenberg/mnt/RAJA_REP/api-cintent
npm start
```

### Check Server Health

```bash
curl -s http://localhost:3000/api/health | jq '.'
```

**Expected response:**
```json
{
  "status": "ok",
  "uptime": 12.345,
  "database": "connected",
  "version": "2.0.0"
}
```

### Check Server Logs

```bash
# Docker
docker logs cintent-api | grep -E "Connected to|pgvector|ready|listening"

# Local
# Check console for "Server running on port 3000"
```

**Look for:**
- ✅ `Connected to PostgreSQL` or similar
- ✅ `pgvector enabled` or `vector extension found`
- ✅ `Server ready` or `listening on port 3000`
- ❌ NOT: `connection refused`, `role postgres does not exist`, `database not found`

---

## PHASE 7: END-TO-END PERSISTENCE TEST

### User Registration & Login

```bash
# 1. Register user (creates entry in users table)
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "e2e-test@example.com",
    "password": "Test123!",
    "name": "E2E Test User"
  }'

# Expected: 200 OK, user_id returned

# 2. Check database (user persisted)
docker exec cintent-postgres psql -U cintent -d cintent -c \
  "SELECT email, name FROM users WHERE email='e2e-test@example.com';"

# Expected: user visible in database
```

### Orchestration Run Persistence

```bash
# 1. Create orchestration run
curl -X POST http://localhost:3000/api/orchestration/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "workflow_id": "test-workflow",
    "input": {"test": "data"}
  }'

# Expected: 200 OK, orchestration_id returned

# 2. Check database (run persisted)
docker exec cintent-postgres psql -U cintent -d cintent -c \
  "SELECT orchestration_id, status FROM orchestration_runs LIMIT 1;"

# Expected: run visible in database, status=running
```

### Replay Event Persistence

```bash
# 1. Record replay event (internal)
# This happens automatically during API execution

# 2. Check database
docker exec cintent-postgres psql -U cintent -d cintent -c \
  "SELECT COUNT(*) as event_count FROM replay_events;"

# Expected: event_count > 0
```

---

## PHASE 8: PERFORMANCE VALIDATION

### Page Load Performance

1. **First Load (Fresh Cache)**
   ```bash
   curl -w "\nTime Total: %{time_total}s\n" http://localhost:3000 > /dev/null
   ```
   Expected: < 2 seconds ✅

2. **Repeat Load (Cached)**
   ```bash
   curl -w "\nTime Total: %{time_total}s\n" http://localhost:3000 > /dev/null
   ```
   Expected: < 100ms ✅

### Database Query Performance

```bash
docker exec cintent-postgres psql -U cintent -d cintent << 'SQL'
-- Test query performance
EXPLAIN ANALYZE
  SELECT COUNT(*) FROM orchestration_runs WHERE tenant_id='test-tenant';

-- Should use index: idx_orchestration_tenant_status
-- Execution time should be < 1ms
SQL
```

### Connection Pool Health

```bash
node << 'JAVASCRIPT'
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'cintent',
  password: 'cintent_dev_password',
  database: 'cintent',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function test() {
  const promises = [];
  
  // Test 20 concurrent connections
  for (let i = 0; i < 20; i++) {
    promises.push(pool.query('SELECT 1'));
  }
  
  try {
    await Promise.all(promises);
    console.log('✅ Connection pool: 20 concurrent queries successful');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection pool failed:', err.message);
    process.exit(1);
  }
}

test();
JAVASCRIPT
```

---

## PHASE 9: FALLBACK MODE VERIFICATION

### Disable Database (Test Fallback)

```bash
# 1. Stop PostgreSQL
docker-compose stop postgres

# 2. Start API server
docker-compose up -d cintent-api
sleep 5

# 3. Check logs for fallback message
docker logs cintent-api | grep -i "fallback\|memory\|disabled"

# 4. API should still work but use in-memory storage
curl -s http://localhost:3000/api/health | jq '.database'
# Expected: "fallback" or "disconnected"
```

### Restart Database (Recovery)

```bash
# 1. Start PostgreSQL
docker-compose up -d postgres
sleep 15

# 2. API automatically reconnects
docker logs cintent-api | grep "reconnect\|connected"

# 3. Persistence resumes
```

---

## PHASE 10: COMPLETE RUNTIME VERIFICATION

### Final Checklist

- [ ] PostgreSQL container healthy
- [ ] All 14 tables exist
- [ ] pgvector extension enabled
- [ ] User insertion works
- [ ] Orchestration run insertion works
- [ ] Replay event insertion works
- [ ] Governance event insertion works
- [ ] Data survives container restart
- [ ] API server connects to database
- [ ] `/api/health` returns `database: connected`
- [ ] First page load < 2 seconds
- [ ] Repeat page load < 100ms
- [ ] No "role postgres does not exist" errors
- [ ] No connection timeout loops in logs
- [ ] Fallback mode works (graceful degradation)
- [ ] Recovery works (database reconnection)

---

## CRITICAL SUCCESS CRITERIA

### Must Have (BLOCKING)
1. ✅ PostgreSQL accepts connections as `cintent` user
2. ✅ All 14 tables exist and are empty
3. ✅ Migrations executed without errors
4. ✅ pgvector enabled for embeddings
5. ✅ Data persists across container restarts

### Should Have (HIGH PRIORITY)
1. ✅ API connects to database on startup
2. ✅ Users table gets populated
3. ✅ Orchestration runs persist
4. ✅ Replay events recorded
5. ✅ Governance policies stored
6. ✅ Performance < 2s first load, < 100ms repeat

### Nice to Have (MEDIUM PRIORITY)
1. ✅ Connection pooling optimized
2. ✅ Automated health checks
3. ✅ Query performance monitoring
4. ✅ Backup/restore procedures

---

## LAUNCH APPROVAL CRITERIA

**APPROVED FOR LAUNCH WHEN:**
- ✅ All 14 tables created successfully
- ✅ Database connectivity verified
- ✅ All persistence tests pass
- ✅ Performance targets met
- ✅ No connection errors in logs
- ✅ Graceful fallback mode working
- ✅ Recovery from database failure working

**BLOCKED FROM LAUNCH IF:**
- ❌ PostgreSQL connection fails
- ❌ Migrations don't execute
- ❌ Tables missing or corrupted
- ❌ Data doesn't persist
- ❌ Performance degraded
- ❌ Fallback mode not working

---

## TIMELINE ESTIMATE

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Fix .env | 2 min |
| 2 | Restart containers | 3 min |
| 3 | Verify migrations | 2 min |
| 4 | Test connectivity | 3 min |
| 5 | Persistence tests | 5 min |
| 6 | API startup | 2 min |
| 7 | E2E test | 5 min |
| 8 | Performance check | 3 min |
| 9 | Fallback test | 5 min |
| 10 | Final verification | 5 min |
| **TOTAL** | | **35 minutes** |

---

## ROLLBACK PROCEDURE

If issues occur:

```bash
# 1. Stop all containers
docker-compose down

# 2. Restore from backup
cp docker-compose.yml.backup docker-compose.yml
cp .env.backup .env

# 3. Delete corrupted volume
docker volume rm api-cintent_postgres-data

# 4. Start fresh
docker-compose up -d
```

---

*Recovery Plan: May 16, 2026*  
*Severity: CRITICAL*  
*Status: READY TO EXECUTE*
