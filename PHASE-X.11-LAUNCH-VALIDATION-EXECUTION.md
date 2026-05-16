# PHASE-X.11 CINTENT LAUNCH VALIDATION
## Enterprise QA & Launch Acceptance Testing - Execution Guide

**Status:** READY FOR EXECUTION  
**Validation Type:** Real User Enterprise QA  
**Test Scope:** 11 test groups, 5 personas, comprehensive failure scenarios  
**Expected Duration:** 6-8 hours focused validation  
**Confidence Requirement:** Enterprise-grade operational stability  

---

## MANDATORY PLATFORM REQUIREMENTS FOR LAUNCH

The platform MUST demonstrate:

✅ **Real Persistence** - Data survives all failure scenarios  
✅ **Real Orchestration** - Workflows execute reliably  
✅ **Real Replay** - Authentically reconstructible from events  
✅ **Real Governance** - Cannot be bypassed, properly enforced  
✅ **Stable Ask COGNI** - Honest positioning, no false claims  
✅ **Enterprise UX** - Professional, no internal IDs, no fake data  
✅ **Operational Reliability** - Graceful failure handling, auto-recovery  

---

## PRE-VALIDATION ENVIRONMENT CHECK

### Command 1: Verify All Containers Running
```bash
cd C:\Users\rpm_T\RAJA_REP\api-cintent
docker-compose ps
```
**Expected:** All containers show "Up" status
- cintent-postgres: Up
- cintent-redis: Up
- cintent-api: Up
- trace-streamer: Up
- (additional services)

**If any container down:** Run `docker-compose up -d`

### Command 2: PostgreSQL Database Ready
```bash
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='public';"
```
**Expected Output:** A number ≥ 30 (31 tables created)

**If different:** Database schema not loaded correctly

### Command 3: Redis Ready
```bash
docker exec cintent-redis redis-cli PING
```
**Expected Output:** PONG

**If fails:** Redis not responding

### Command 4: API Health Check
```bash
curl -s http://localhost:3000/api/health
```
**Expected Output:** HTTP 200 with JSON (health status)

**If fails:** API not ready, check `docker-compose logs cintent-api`

### Command 5: Database Tables Verify
```bash
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c "\dt"
```
**Expected:** See table names:
- api_metadata
- ask_cogni_sessions
- orchestration_runs
- replay_events
- governance_policies
- users
- workspaces
- runtime_events
- sessions
- (and more)

**If missing tables:** Run migrations

---

## TEST EXECUTION STRATEGY

### Personas to Use (Rotate through tests)

1. **Beginner User**
   - Email: beginner@test.local
   - Use case: First-time user, basic workflow
   - Validation: Can user get value without documentation?

2. **Developer**
   - Email: developer@test.local
   - Use case: Build custom orchestration, use APIs
   - Validation: Do APIs work as documented?

3. **Enterprise Architect**
   - Email: architect@test.local
   - Use case: Design enterprise governance, review orchestrations
   - Validation: Does governance work at enterprise scale?

4. **Business User**
   - Email: business@test.local
   - Use case: Execute pre-built workflows
   - Validation: Is platform accessible to non-technical users?

5. **Operations User**
   - Email: ops@test.local
   - Use case: Monitor, restart, troubleshoot
   - Validation: Are operational tools available?

### Create Test Users (If not existing)

```bash
# Create test users in PostgreSQL
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c "
INSERT INTO users (id, email, name, tenant_id, created_at) VALUES
  ('user-beginner', 'beginner@test.local', 'Beginner User', 'default-tenant', NOW()),
  ('user-dev', 'developer@test.local', 'Developer User', 'default-tenant', NOW()),
  ('user-arch', 'architect@test.local', 'Enterprise Architect', 'default-tenant', NOW()),
  ('user-biz', 'business@test.local', 'Business User', 'default-tenant', NOW()),
  ('user-ops', 'ops@test.local', 'Operations User', 'default-tenant', NOW())
ON CONFLICT DO NOTHING;
"
```

---

## TEST GROUP 1: AUTHENTICATION (45 minutes)

### TEST 1.1: Fresh Login
```
PERSONA: Beginner User
ACTION:
1. Navigate to http://localhost:3000
2. Enter email: beginner@test.local
3. Enter password: test_password (or set if using user creation)
4. Click Sign In

VALIDATE:
✅ Login form appears without errors
✅ Email/password fields accept input
✅ Sign In button is clickable
✅ Redirects to workspace/dashboard on success
✅ User name/email appears in UI
✅ Session created in Redis:
   docker exec cintent-redis redis-cli KEYS "session:*"
✅ User record in PostgreSQL:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT email, created_at FROM users WHERE email='beginner@test.local';"

CAPTURE EVIDENCE:
- Screenshot of login page
- Screenshot of dashboard after login
- Terminal output of Redis KEYS command
- Terminal output of PostgreSQL query
```

### TEST 1.2: Session Persistence
```
PERSONA: Developer User
ACTION:
1. Log in as developer@test.local
2. Navigate to a specific page (e.g., workspace settings)
3. Take note of URL
4. Press F5 (refresh browser)
5. Wait for page reload

VALIDATE:
✅ User remains logged in (no redirect to login)
✅ Same page loads without re-navigation
✅ User info still displayed (name, email)
✅ Session still in Redis with TTL:
   docker exec cintent-redis redis-cli TTL "session:<session-id>"
   ← Should show positive number (seconds remaining)
✅ No new login prompt
✅ Workspace state preserved (if on workspace page)

CAPTURE EVIDENCE:
- Screenshot before refresh
- Screenshot after refresh
- Terminal output of Redis TTL command
```

### TEST 1.3: Invalid Login
```
PERSONA: Beginner User
ACTION:
1. Navigate to http://localhost:3000
2. Enter email: nonexistent@fake.local
3. Enter password: wrong_password
4. Click Sign In

VALIDATE:
✅ Login fails with clear error message
✅ Error message shows (e.g., "Invalid credentials")
✅ User NOT logged in
✅ No session created in Redis
✅ Stays on login page (doesn't redirect)
✅ Can retry login immediately

CAPTURE EVIDENCE:
- Screenshot of error message
- Terminal: docker exec cintent-redis redis-cli KEYS "session:*" 
  (should not show new session)
```

### TEST 1.4: Session Expiry
```
PERSONA: Developer User
ACTION:
1. Log in successfully
2. Note session ID from Redis
3. Simulate expiry:
   docker exec cintent-redis redis-cli SETEX "session:<id>" 2 "{}"
   sleep 3
4. Try to access protected endpoint:
   curl -s http://localhost:3000/api/workspaces \
     -H "Cookie: sessionId=<session-id>"

VALIDATE:
✅ Returns 401 Unauthorized (NOT 200)
✅ Clear error message
✅ User is logged out on next browser action
✅ Redirected to login page when accessing UI

CAPTURE EVIDENCE:
- Terminal output of curl command showing 401
```

### TEST 1.5: Logout and Cleanup
```
PERSONA: Beginner User
ACTION:
1. User is logged in
2. Find and click "Logout" or "Sign Out" button
3. Confirm logout if prompted
4. Wait for redirect

VALIDATE:
✅ Redirected to login page
✅ Session removed from Redis:
   docker exec cintent-redis redis-cli GET "session:<id>"
   ← Should return (nil)
✅ Cannot access protected endpoints
✅ Cookie cleared or set to empty
✅ Can log in again with different user

CAPTURE EVIDENCE:
- Screenshot of logout confirmation
- Screenshot of login page after logout
- Terminal output showing session deleted from Redis
```

---

## TEST GROUP 2: GOVERNANCE (60 minutes)

### TEST 2.1: Governance Popup on First Login
```
PERSONA: Beginner User (fresh user)
ACTION:
1. Fresh login (user without governance acceptance)
2. Observe initial screen

VALIDATE:
✅ Modal popup appears BEFORE workspace
✅ Title: "Platform Governance & Terms" or similar
✅ Contains:
   - Terms of Service section
   - License Agreement section
   - Privacy Policy section
   - Governance Compliance statement
✅ "Accept All" button present and clickable
✅ "Decline" or "I Do Not Accept" button present
✅ Cannot close modal by clicking X or outside
✅ Must choose Accept or Decline

CAPTURE EVIDENCE:
- Screenshot of governance popup
- Screenshot showing all sections visible
```

### TEST 2.2: Terms & License Acceptance
```
PERSONA: Business User
ACTION:
1. Governance popup showing
2. Read through sections (verify they make sense)
3. Click "Accept All"

VALIDATE:
✅ Modal closes
✅ User directed to workspace
✅ Can access APIs
✅ Governance acceptance recorded:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT * FROM governance_events WHERE event_type='acceptance';"
✅ Record has: user_id, timestamp, acceptance_type
✅ Acceptance persists (no popup on next login)

CAPTURE EVIDENCE:
- Screenshot of workspace after acceptance
- Terminal output showing governance record in DB
```

### TEST 2.3: Governance Bypass Attempt (CRITICAL)
```
PERSONA: Developer User (attempting security test)
ACTION:
1. CRITICAL TEST: Attempt to bypass governance
2. Method 1: Direct API call without governance token:
   curl -s http://localhost:3000/api/ask \
     -H "Content-Type: application/json" \
     -d '{"query": "test"}'
3. Method 2: Manipulate browser localStorage to fake acceptance
4. Method 3: Try to access /api/orchestrations directly

VALIDATE:
✅ ALL bypass attempts FAIL
✅ API returns 403 Forbidden or 401 Unauthorized
✅ Response message: "Governance acceptance required"
✅ NO data returned despite attempt
✅ Bypass attempt logged in audit:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT * FROM audit_logs WHERE action='governance_bypass_attempt' LIMIT 5;"

CAPTURE EVIDENCE:
- Terminal output of failed bypass attempts
- Error messages from API
- Audit logs showing bypass attempt recorded

CRITICAL: If ANY bypass succeeds → LAUNCH BLOCKED
```

### TEST 2.4: Governance Rejection
```
PERSONA: Enterprise Architect
ACTION:
1. Fresh login
2. Governance popup appears
3. Click "Decline" or "Do Not Accept"

VALIDATE:
✅ Modal closes
✅ User logged out OR shown rejection message
✅ Cannot access workspace
✅ Rejection recorded:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT * FROM governance_events WHERE event_type='rejection';"
✅ Can attempt login again later (not permanently blocked)
✅ Governance popup shows again on next login attempt

CAPTURE EVIDENCE:
- Screenshot of rejection message
- Terminal output showing rejection in DB
```

---

## TEST GROUP 3: WORKSPACE LIFECYCLE (60 minutes)

### TEST 3.1: Fresh Workspace Creation
```
PERSONA: Beginner User
ACTION:
1. User logged in, governance accepted
2. See workspace initialization screen
3. Note: Fresh workspace with no previous state

VALIDATE:
✅ Workspace ID generated:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT workspace_id, tenant_id, created_at FROM workspaces WHERE tenant_id='default-tenant' LIMIT 1;"
✅ Workspace stored in Redis:
   docker exec cintent-redis redis-cli GET "workspace:<workspace-id>"
✅ UI shows:
   - Empty domain selector
   - No active APIs selected
   - Sandbox mode indicator
   - Domain templates available
✅ Can select initial domain

CAPTURE EVIDENCE:
- Screenshot of fresh workspace
- Terminal output of workspace DB query
- Terminal output of Redis workspace data
```

### TEST 3.2: Workspace Resume After Refresh
```
PERSONA: Developer User
ACTION:
1. Configure workspace:
   - Select domain: "governance"
   - Select APIs: governance-1, governance-2
   - Select workflow: "policy-setup"
2. Press F5 (refresh)
3. Wait for reload

VALIDATE:
✅ Same workspace ID (not new workspace created)
✅ Previous configuration restored:
   - Same domain selected
   - Same APIs active
   - Same workflow visible
✅ No re-configuration needed
✅ State retrieved from Redis (fast) OR PostgreSQL (durable)
✅ Verify in database:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT domain, selected_apis FROM workspaces WHERE workspace_id='<id>';"

CAPTURE EVIDENCE:
- Screenshot before refresh (configuration visible)
- Screenshot after refresh (same configuration)
- Terminal output showing preserved state in DB
```

### TEST 3.3: Workspace Reset
```
PERSONA: Operations User
ACTION:
1. Workspace configured with domain/APIs/workflow
2. Click "Reset Workspace" button
3. Confirm reset

VALIDATE:
✅ Workspace state cleared:
   - Domain reset to empty/default
   - Selected APIs cleared
   - Workflow cleared
   - UI shows empty workspace
✅ Same workspace ID maintained (not deleted)
✅ Reset recorded in database:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT * FROM runtime_events WHERE event_type='workspace_reset';"
✅ Can reconfigure fresh workspace
✅ Reset doesn't affect other users' workspaces

CAPTURE EVIDENCE:
- Screenshot of reset action
- Screenshot of cleared workspace
- Terminal output showing reset event in DB
```

### TEST 3.4: Domain Switching
```
PERSONA: Business User
ACTION:
1. Workspace with domain "governance" selected
2. Open domain selector
3. Change to domain "orchestration"
4. Observe update

VALIDATE:
✅ Domain dropdown shows all available domains
✅ Selection changes domain immediately
✅ Available APIs filter to new domain
✅ Previous domain's configuration cleared
✅ New domain state persisted:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT domain FROM workspaces WHERE workspace_id='<id>';"
✅ Refresh maintains new domain
✅ UI updates to show new domain APIs

CAPTURE EVIDENCE:
- Screenshot of domain selector
- Screenshot after domain change
- Terminal output showing domain change persisted
```

### TEST 3.5: No Stale State Bleed
```
PERSONA: Beginner User (User A) and Developer User (User B)
ACTION:
1. User A: Create workspace, select domain "governance", select APIs [gov-1, gov-2]
2. Note: User A's workspace configuration
3. Log out User A
4. Log in as User B
5. Check User B's workspace

VALIDATE:
✅ User B gets FRESH empty workspace (not User A's)
✅ User B's workspace_id is DIFFERENT from User A's
✅ User B cannot see User A's configuration
✅ User B's tenant_id is different (isolation)
✅ No stale data visible:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT DISTINCT workspace_id, tenant_id FROM workspaces LIMIT 10;"
   ← Should show different IDs for different users

CAPTURE EVIDENCE:
- Screenshot of User A's workspace configuration
- Screenshot of User B's fresh workspace
- Terminal output showing different workspace IDs
```

---

## TEST GROUP 4: ASK COGNI (75 minutes)

### TEST 4.1: Contextual Retrieval
```
PERSONA: Developer User
ACTION:
1. Workspace with domain "governance" configured
2. Click Ask COGNI / Cognitive Assistant
3. Ask: "How do I set up governance policies?"
4. Submit query

VALIDATE:
✅ Ask COGNI responds (no timeout, <5 seconds)
✅ Results are contextual to "governance" domain:
   - Governance APIs ranked high
   - Non-governance APIs low or absent
   - Results relevant to query
✅ Response includes:
   - Result set (6 APIs typical)
   - Each result: name, description, lifecycle, governance support
   - "Based on your governance context..." explanation
✅ Response contains HONEST architecture info:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT * FROM ask_cogni_sessions WHERE query LIKE '%governance%' LIMIT 1;"
✅ transparency_metadata field shows:
   - "retrieval_method": "contextual-keyword-weighting (NOT semantic)"
   - "vector_search_enabled": false
   - NO false "pgvector" claims

CAPTURE EVIDENCE:
- Screenshot of Ask COGNI query and results
- Screenshot showing transparency metadata
- Terminal output of ask_cogni_sessions DB record
```

### TEST 4.2: Orchestration Awareness
```
PERSONA: Enterprise Architect
ACTION:
1. Workspace with:
   - Domain: "orchestration"
   - Selected APIs: api-1, api-2, api-3
   - Active workflow: "api-chain-execution"
2. Ask COGNI: "What orchestration patterns are available?"

VALIDATE:
✅ Results adapted to orchestration context:
   - APIs that work in chains ranked higher
   - Workflow-appropriate APIs suggested
   - Explains orchestration awareness
✅ Scoring breakdown shows orchestration factor:
   Response includes: "orchestration(25%)" in scoring
✅ Recommendations align with selected workflow

CAPTURE EVIDENCE:
- Screenshot of Ask COGNI response
- Visible scoring breakdown
```

### TEST 4.3: Replay Awareness
```
PERSONA: Operations User
ACTION:
1. System has executed some orchestrations
2. Ask COGNI: "Which APIs work well together?"

VALIDATE:
✅ Results consider replay history:
   - APIs used together successfully ranked higher
   - "Based on your replay history..." message shown
✅ Scoring breakdown includes:
   - "replay(15%)" in scoring factors
✅ Recommendations based on real patterns, not static

CAPTURE EVIDENCE:
- Screenshot showing replay awareness in response
- Scoring breakdown visible
```

### TEST 4.4: Memory Continuity
```
PERSONA: Business User
ACTION:
1. Ask COGNI first query: "Show me governance APIs"
2. Get results, note them
3. Later, ask similar query: "Which governance APIs are available?"
4. Check if system recognizes similar past query

VALIDATE:
✅ Ask COGNI shows:
   - Reference to similar past query (if applicable)
   - "Similar query 2 days ago..." message
   - Continuity across sessions
✅ Query history accessible:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT query, created_at FROM ask_cogni_sessions ORDER BY created_at DESC LIMIT 5;"
✅ No repetitive identical responses

CAPTURE EVIDENCE:
- Screenshot of memory reference
- Terminal output showing query history
```

### TEST 4.5: No Repetitive Metadata Dumping
```
PERSONA: Beginner User
ACTION:
1. Ask COGNI multiple different questions:
   - "governance APIs"
   - "orchestration workflows"
   - "user management tools"
2. Observe response structure for each

VALIDATE:
✅ Responses are UNIQUE per query (not template):
   - Governance query: governance-specific content
   - Orchestration query: orchestration-specific content
   - Different queries → different response structures
✅ Response is structured, not metadata dump:
   - Top N results listed
   - Brief description per result
   - Context-specific guidance
   - NO endless repetition of same metadata
✅ Natural language answers provided
✅ Not template-like (obvious that it's generated)

CAPTURE EVIDENCE:
- Screenshots of 3 different Ask COGNI queries
- Show how responses adapt to different domains
```

### TEST 4.6: Domain Adaptation
```
PERSONA: Developer User
ACTION:
1. Ask COGNI in "governance" domain: "Show APIs"
2. Note results
3. Switch domain to "orchestration"
4. Ask COGNI same: "Show APIs"
5. Compare results

VALIDATE:
✅ Results immediately adapt to new domain:
   - Governance domain results ≠ Orchestration domain results
   - New domain APIs ranked high
   - Old domain APIs low or absent
✅ Response language changes:
   - References domain-specific terminology
   - Different examples provided
✅ No stale results from previous domain
✅ Domain switch is seamless

CAPTURE EVIDENCE:
- Screenshot of governance domain results
- Screenshot of orchestration domain results
- Show visible differences
```

---

## TEST GROUP 5: ORCHESTRATION (90 minutes)

### TEST 5.1: Workflow Creation
```
PERSONA: Developer User
ACTION:
1. Click "Create Workflow" or "New Orchestration"
2. Fill in:
   - Name: "Test Governance Setup"
   - Select APIs: governance-1, governance-2, governance-3
   - Define order: gov-1 → gov-2 → gov-3
3. Save workflow

VALIDATE:
✅ Workflow created and saved:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT id, title, apis_used FROM orchestration_runs WHERE title='Test Governance Setup';"
✅ Workflow appears in UI with:
   - Correct name
   - API sequence shown
   - Status: "Ready" or similar
✅ Can edit after creation
✅ Configuration persists across page refresh

CAPTURE EVIDENCE:
- Screenshot of workflow creation form
- Screenshot of created workflow in UI
- Terminal output of DB query showing workflow
```

### TEST 5.2: Orchestration Execution
```
PERSONA: Enterprise Architect
ACTION:
1. Workflow ready (from TEST 5.1)
2. Click "Execute" or "Run" button
3. Monitor execution progress

VALIDATE:
✅ Execution starts immediately
✅ Workflow status shows "running"
✅ Each step executes in order:
   - API 1 starts
   - API 1 completes
   - API 2 starts (receives API 1 output)
   - API 2 completes
   - API 3 starts (receives API 2 output)
   - API 3 completes
✅ Database shows execution:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT id, status, started_at, completed_at FROM orchestration_runs WHERE title='Test Governance Setup';"
✅ Execution time recorded
✅ No errors in execution log

CAPTURE EVIDENCE:
- Screenshot of execution start
- Screenshot of execution progress
- Screenshot of completed execution
- Terminal output showing execution in DB
```

### TEST 5.3: API Transitions
```
PERSONA: Operations User
ACTION:
1. Workflow executing with 3 APIs
2. Monitor data flow between APIs

VALIDATE:
✅ Each API completes before next starts
✅ Output of API N becomes input to API N+1
✅ No data loss between steps
✅ Transitions logged:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT * FROM workflow_states WHERE orchestration_id='<id>' ORDER BY created_at;"
✅ All steps show in workflow_states table
✅ Data integrity maintained

CAPTURE EVIDENCE:
- Screenshot showing API transition
- Terminal output showing workflow_states records
```

### TEST 5.4: Persistence
```
PERSONA: Developer User
ACTION:
1. Workflow has been executed
2. Note execution results
3. Refresh browser (F5)
4. Navigate back to orchestrations

VALIDATE:
✅ Workflow still visible in UI
✅ Execution history preserved:
   - Same execution ID
   - Same results
   - Same timestamps
✅ Can view results after refresh:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT COUNT(*) FROM orchestration_runs;"
   ← Count unchanged
✅ Can re-execute same workflow

CAPTURE EVIDENCE:
- Screenshot before refresh
- Screenshot after refresh
- Terminal output showing persistent execution
```

### TEST 5.5: Restart Recovery
```
PERSONA: Operations User
ACTION:
1. Start long-running orchestration
2. Wait for it to reach step 2 of 5
3. Simulate failure:
   docker-compose restart cintent-api
4. Wait for API to restart (~10 seconds)
5. Check orchestration status

VALIDATE:
✅ API recovers from restart
✅ Orchestration can resume (not lost):
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT status, completed_at FROM orchestration_runs WHERE title='Test Governance Setup';"
✅ Can complete remaining steps
✅ Final result contains:
   - All completed steps
   - Timestamps for recovery
   - Full execution history
✅ No duplicate execution of earlier steps

CAPTURE EVIDENCE:
- Screenshot before restart
- Screenshot after restart
- Terminal output showing recovery
```

---

## TEST GROUP 6: REPLAY (90 minutes)

### TEST 6.1: Replay Generation
```
PERSONA: Developer User
ACTION:
1. Orchestration has completed
2. Click "Generate Replay" or similar
3. Wait for replay to generate

VALIDATE:
✅ Replay generated successfully:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT id, orchestration_id, status FROM replay_events LIMIT 1;"
✅ Replay contains:
   - Complete event sequence
   - API call sequence
   - Input/output for each step
   - Timestamps for each event
✅ Replay marked as "recorded" in DB
✅ UI shows: "Replay generated from orchestration_id_XXXXX"

CAPTURE EVIDENCE:
- Screenshot of replay generation confirmation
- Terminal output showing replay in DB
```

### TEST 6.2: Replay Reconstruction (CRITICAL)
```
PERSONA: Enterprise Architect
ACTION:
1. Replay has been generated
2. Click "Reconstruct Replay" or "Replay This Execution"
3. Monitor reconstruction

VALIDATE:
✅ Reconstruction starts immediately
✅ Events replay in original order
✅ Each replayed event produces same output as original:
   - API A output same as original
   - API B receives correct input
   - Final result matches original execution
✅ UI shows: "Replaying recorded execution..."
✅ Reconstruction completes successfully
✅ Status shown: "reconstruction_completed"
✅ Marked as separate from original (not new execution)
✅ Verify in DB:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT reconstruction_status FROM replay_events WHERE id='<replay-id>';"

CAPTURE EVIDENCE:
- Screenshot of reconstruction start
- Screenshot of reconstruction complete
- Terminal output showing reconstruction status

CRITICAL: If reconstruction fails, replay is not truly reconstructive
```

### TEST 6.3: Replay Independence (CRITICAL)
```
PERSONA: Operations User
ACTION:
1. Replay has been generated
2. Delete or modify original orchestration:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "DELETE FROM orchestration_runs WHERE id='<original-id>';"
3. Attempt to reconstruct replay again

VALIDATE:
✅ CRITICAL: Replay reconstruction SUCCEEDS despite original deleted
✅ Replay is self-contained (not dependent on original)
✅ Event sequence replays from stored data
✅ Results match original execution
✅ Proves replay is TRULY RECONSTRUCTIVE, not cosmetic

If reconstruction FAILS after original deleted:
  ❌ LAUNCH BLOCKED - Replay is only cosmetic

CAPTURE EVIDENCE:
- Terminal output showing orchestration deleted
- Screenshot of successful reconstruction
- Terminal output confirming reconstruction status
```

### TEST 6.4: Replay Persistence
```
PERSONA: Beginner User
ACTION:
1. Multiple orchestrations executed and replayed
2. Check replay ledger file:
   ls -lah .cintent-runtime/runtime-ledger.jsonl
3. Check database:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT COUNT(*) as total_replays FROM replay_events;"

VALIDATE:
✅ Ledger file exists and has content (>1MB)
✅ Ledger contains valid JSON (each line parseable):
   head -1 .cintent-runtime/runtime-ledger.jsonl | jq .
✅ Database contains replay records (count >0)
✅ Both ledger and DB in sync
✅ Old replays still present, new ones added
✅ Proper sizing (file doesn't grow unbounded)

CAPTURE EVIDENCE:
- Terminal output: ls -lah runtime-ledger.jsonl (file size)
- Terminal output: jq parsing of ledger line
- Terminal output: COUNT from replay_events
```

### TEST 6.5: Replay Continuity
```
PERSONA: Business User
ACTION:
1. User logs in
2. Executes and replays orchestration #1
3. Notes replay ID
4. Logs out
5. Logs back in later
6. Searches for previous replay
7. Reconstructs it again

VALIDATE:
✅ Replay still accessible:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT COUNT(*) FROM replay_events WHERE user_id='<user-id>';"
   ← Count unchanged
✅ Reconstruction succeeds on second user session
✅ Data unchanged from original replay
✅ Can reconstruct multiple times independently

CAPTURE EVIDENCE:
- Screenshot of replay found in history
- Screenshot of successful second reconstruction
- Terminal output showing replay count by user
```

### TEST 6.6: Replay Export
```
PERSONA: Developer User
ACTION:
1. Replay generated
2. Click "Export Replay" or download option
3. Select format (JSON, CSV, etc.)
4. Download

VALIDATE:
✅ Export option available
✅ Download succeeds
✅ File format valid:
   - If JSON: Valid JSON structure
   - If CSV: Proper CSV format
✅ File contains complete data:
   - All events
   - All metadata
   - Timestamps
✅ File is readable (can open in text editor)

CAPTURE EVIDENCE:
- Screenshot of export dialog
- Terminal: file <downloaded-file> (verify format)
```

---

## TEST GROUP 7: TELEMETRY (60 minutes)

### TEST 7.1: Telemetry Streaming
```
PERSONA: Operations User
ACTION:
1. Orchestration executing
2. Open telemetry/monitoring page (if available)
3. Monitor stream of events

VALIDATE:
✅ Telemetry events stream in real-time:
   - API start events
   - API complete events
   - Data flow events
   - Performance metrics
✅ Events show timestamps
✅ Metrics visible (CPU, memory, execution time)
✅ WebSocket connection active for streaming:
   Browser DevTools → Network → WS filter
   ← Should show active ws:// connection
✅ Verify in DB:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT COUNT(*) FROM runtime_events;"
   ← Should show telemetry events

CAPTURE EVIDENCE:
- Screenshot of telemetry dashboard
- Browser Network tab showing WS connection
- Terminal output showing telemetry event count
```

### TEST 7.2: Telemetry Persistence
```
PERSONA: Operations User
ACTION:
1. Orchestrations have executed, generating telemetry
2. Check TimescaleDB telemetry table (if separate):
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT COUNT(*) FROM telemetry_streams;"

VALIDATE:
✅ Telemetry events persisted in DB
✅ Events have timestamps
✅ Events linked to orchestration_id
✅ Can query historical telemetry:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT * FROM telemetry_streams LIMIT 10;"
✅ Retention policy if configured

CAPTURE EVIDENCE:
- Terminal output: COUNT of telemetry events
- Terminal output: sample telemetry records
```

### TEST 7.3: WebSocket Synchronization
```
PERSONA: Business User
ACTION:
1. Orchestration executing
2. Two browser windows open to same system
3. Monitor telemetry in both windows

VALIDATE:
✅ Both windows receive same updates simultaneously
✅ Real-time synchronization working
✅ WebSocket broadcasting events to all connected clients
✅ No lag between windows

CAPTURE EVIDENCE:
- Screenshot of both windows showing same data
```

### TEST 7.4: Reconnect Restoration
```
PERSONA: Operations User
ACTION:
1. Telemetry streaming
2. Simulate WebSocket disconnect:
   Browser DevTools → Network → Close ws connection
3. Wait 5 seconds
4. Observe automatic reconnection

VALIDATE:
✅ Disconnect detected
✅ Browser attempts reconnection
✅ Connection re-established
✅ Missing telemetry during disconnect is caught up:
   - All events received
   - No events lost
✅ No stale data shown

CAPTURE EVIDENCE:
- Browser Network tab showing disconnect/reconnect
- Screenshot showing event continuity after reconnect
```

---

## TEST GROUP 8: REDIS PERSISTENCE (60 minutes)

### TEST 8.1: Session Persistence
```
PERSONA: Developer User
ACTION:
1. User logged in with active session
2. Check Redis:
   docker exec cintent-redis redis-cli KEYS "session:*"
   docker exec cintent-redis redis-cli GET "session:<session-id>"
3. Check TTL:
   docker exec cintent-redis redis-cli TTL "session:<session-id>"

VALIDATE:
✅ Session key exists in Redis
✅ Session data contains user info
✅ TTL is positive (not permanent):
   - Typically 7200 (2 hours)
   - User session won't expire during normal work
✅ Session survives Redis restart:
   docker-compose restart cintent-redis
   # Wait 5 seconds
   docker exec cintent-redis redis-cli GET "session:<session-id>"
   ← Should still exist if persisted to RDB

CAPTURE EVIDENCE:
- Terminal output: Redis KEYS and GET commands
- Terminal output: TTL value
- Terminal output: post-restart session check
```

### TEST 8.2: Cache Continuity
```
PERSONA: Enterprise Architect
ACTION:
1. System has been running (cache populated)
2. Check Redis cache:
   docker exec cintent-redis redis-cli KEYS "*" | wc -l
3. Access APIs that use cache (e.g., API catalog)
4. First request: cache miss
5. Second request: cache hit (faster)

VALIDATE:
✅ Cache keys present in Redis
✅ Cache is actually being used (observable speed difference)
✅ No stale data from cache
✅ Cache keys for:
   - API metadata
   - User preferences
   - Workspace state
✅ Cache is invalidated properly on updates

CAPTURE EVIDENCE:
- Terminal output: Redis key count
- Browser: First request response time
- Browser: Second request response time (should be faster)
```

### TEST 8.3: Reconnect Recovery
```
PERSONA: Operations User
ACTION:
1. User in middle of operations
2. Stop Redis:
   docker-compose stop cintent-redis
3. System behavior during Redis down:
   - Some operations fail gracefully
   - DB fallback works (if configured)
4. Restart Redis:
   docker-compose start cintent-redis
5. Attempt operations again

VALIDATE:
✅ During Redis down:
   - User gets error message (not crash)
   - Can continue with DB fallback
   - Session still in PostgreSQL
✅ After Redis restart:
   - User still logged in
   - Cache repopulates automatically
   - Operations continue normally
✅ No data corruption

CAPTURE EVIDENCE:
- Terminal output: Redis stop
- Screenshot: Error message during downtime
- Screenshot: Recovery after Redis restart
- Terminal: Redis start
```

### TEST 8.4: WebSocket Continuity
```
PERSONA: Business User
ACTION:
1. Real-time updates via WebSocket
2. Simulate disconnect:
   Browser DevTools → Network → Close ws connection
3. Wait for automatic reconnect
4. Verify updates resume

VALIDATE:
✅ WebSocket disconnect detected
✅ Automatic reconnection attempted
✅ Missing updates caught up
✅ No stale data
✅ Real-time updates resume

CAPTURE EVIDENCE:
- Browser Network tab showing ws connection/disconnect
- Timeline of events showing reconnection
```

---

## TEST GROUP 9: UX VALIDATION (45 minutes)

### TEST 9.1: No Runtime IDs Visible
```
PERSONA: Beginner User
ACTION:
1. Navigate entire UI
2. Scan all pages, modals, messages for internal IDs
3. Look for patterns like:
   - "persist-event-19f8a1b2"
   - "orchestration-abc123def456"
   - UUIDs in user-facing text
   - Database IDs exposed

VALIDATE:
✅ User sees human-readable names:
   - "Governance Policy Engine" (not "api-a1b2c3d4")
   - "Test Orchestration" (not "orch-xyz789")
✅ No exposed database IDs
✅ No exposed internal tokens or secrets
✅ Professional, clean UI

CAPTURE EVIDENCE:
- Screenshot of each major page
- Note any internal IDs if found (would be violation)
```

### TEST 9.2: No Stale Workflows
```
PERSONA: Developer User
ACTION:
1. Create multiple workflows
2. Execute some, delete some
3. Check workflow list

VALIDATE:
✅ Only active workflows shown
✅ No deleted workflows in list
✅ Workflow count matches database:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT COUNT(*) FROM orchestration_runs WHERE deleted_at IS NULL;"
✅ No duplicate entries
✅ UI consistent with DB

CAPTURE EVIDENCE:
- Screenshot of workflow list
- Terminal output of DB count
```

### TEST 9.3: No Fake Data
```
PERSONA: Business User
ACTION:
1. Observe data displayed:
   - API descriptions
   - Workflow results
   - Orchestration output
   - Ask COGNI responses
2. Check for obvious fake/placeholder content

VALIDATE:
✅ All data is REAL (not lorem ipsum)
✅ No "test data" labels visible
✅ No placeholder values
✅ Genuine API information
✅ Actual execution results

CAPTURE EVIDENCE:
- Screenshots of data-heavy pages
```

### TEST 9.4: No Broken Modals
```
PERSONA: Enterprise Architect
ACTION:
1. Open each modal/dialog in UI:
   - Login modal
   - Governance modal
   - Settings modal
   - Confirmation dialogs
2. Check rendering and functionality

VALIDATE:
✅ All modals render correctly:
   - Proper dimensions
   - Centered on screen
   - Content fully visible
   - Buttons clickable
✅ Close button works (X or Cancel)
✅ Form fields work
✅ No JavaScript console errors:
   Browser DevTools → Console
   ← Should show no red errors

CAPTURE EVIDENCE:
- Screenshots of each modal
- Browser Console screenshot (empty of errors)
```

### TEST 9.5: No Misleading Semantic Claims (CRITICAL)
```
PERSONA: Beginner User
ACTION:
1. CRITICAL: Scan ALL user-facing text for:
   - "Semantic search"
   - "AI-powered"
   - "Vector search"
   - "Embeddings"
   - "Neural network"
   - "LLM"
   - False pgvector claims
2. Check in:
   - Ask COGNI responses
   - Architecture descriptions
   - Feature marketing text
   - Help text and tooltips
   - Response metadata

VALIDATE:
✅ NO false semantic claims found
✅ Ask COGNI honest descriptions:
   - "Contextual retrieval"
   - "Based on your workspace context"
   - "Learned from your execution history"
✅ transparency_metadata shows truth:
   - "vector_search_enabled": false
   - "retrieval_method": "contextual-keyword-weighting"
✅ Professional, honest positioning

If ANY false claims found:
  ❌ LAUNCH BLOCKED

CAPTURE EVIDENCE:
- Screenshots of Ask COGNI response (full transparency section)
- Any occurrences of false claims (would be violations)
```

---

## TEST GROUP 10: API RUNTIME (60 minutes)

### TEST 10.1: API Catalog Loading
```
PERSONA: Developer User
ACTION:
1. API catalog endpoint:
   curl -s http://localhost:3000/api/catalog \
     -H "Cookie: sessionId=<session-id>" | jq . | head -20
2. Verify catalog loads with all APIs

VALIDATE:
✅ Returns 200 OK (not 401, not 500)
✅ JSON response with API list
✅ Each API has:
   - api_key
   - name
   - description
   - domain
   - lifecycle_state
   - (other metadata)
✅ Count > 50 APIs (substantial catalog)
✅ No authentication errors

CAPTURE EVIDENCE:
- Terminal output: curl response showing APIs
```

### TEST 10.2: Authentication Enforcement
```
PERSONA: Operations User
ACTION:
1. Try to access protected endpoint WITHOUT session:
   curl -s http://localhost:3000/api/orchestrations
2. Try to access WITH invalid session:
   curl -s http://localhost:3000/api/orchestrations \
     -H "Cookie: sessionId=invalid-session-xyz"

VALIDATE:
✅ Returns 401 Unauthorized (not 200, not 500)
✅ Clear error message: "Authentication required"
✅ No protected data returned
✅ Authentication properly enforced

CAPTURE EVIDENCE:
- Terminal output: 401 responses
```

### TEST 10.3: Governance Enforcement
```
PERSONA: Developer User
ACTION:
1. Fresh user (governance NOT accepted)
2. Try to call API:
   curl -s http://localhost:3000/api/ask \
     -H "Cookie: sessionId=<session-id>" \
     -H "Content-Type: application/json" \
     -d '{"query":"test"}'

VALIDATE:
✅ Returns 403 Forbidden or 401 Unauthorized
✅ Error message: "Governance acceptance required"
✅ NO data returned despite request
✅ Governance properly enforced at API level

CAPTURE EVIDENCE:
- Terminal output: blocked API call
```

### TEST 10.4: SDK Generation
```
PERSONA: Developer User
ACTION:
1. Access SDK generation endpoint:
   curl -s http://localhost:3000/api/sdk/generate \
     -H "Cookie: sessionId=<session-id>" \
     -H "Content-Type: application/json" \
     -d '{"language":"python"}'

VALIDATE:
✅ SDK generates successfully
✅ Returns generated SDK code
✅ Code is valid for specified language
✅ Can be copied and used locally

CAPTURE EVIDENCE:
- Terminal output: SDK response
```

### TEST 10.5: Orchestration APIs
```
PERSONA: Enterprise Architect
ACTION:
1. Test orchestration endpoints:
   - GET /api/orchestrations
   - POST /api/orchestrations/execute
   - GET /api/orchestrations/<id>/status

VALIDATE:
✅ All endpoints respond with 200 OK
✅ Data format correct
✅ No authentication issues
✅ Orchestration state queries work

CAPTURE EVIDENCE:
- Terminal output: curl responses for each endpoint
```

---

## TEST GROUP 11: DEPLOYMENT VALIDATION (75 minutes)

### TEST 11.1: Full Docker Restart
```
PERSONA: Operations User
ACTION:
1. Bring down entire environment:
   docker-compose down
2. Wait for all containers to stop (30 seconds)
3. Bring everything back up:
   docker-compose up -d
4. Wait for initialization (60 seconds)
5. Check all services

VALIDATE:
✅ All containers start successfully:
   docker-compose ps
   ← All show "Up"
✅ Services are healthy:
   - PostgreSQL accepting connections
   - Redis responding
   - API ready on port 3000
✅ Data persisted:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c "SELECT COUNT(*) FROM users;"
   ← Count unchanged
✅ Migrations run if needed
✅ No data loss

CAPTURE EVIDENCE:
- Terminal: docker-compose down
- Terminal: docker-compose up -d
- Terminal: docker-compose ps (showing all Up)
- Terminal: database verification queries
```

### TEST 11.2: Individual Service Restart
```
PERSONA: Operations User
ACTION:
1. Restart PostgreSQL:
   docker-compose restart cintent-postgres
2. Monitor system during restart
3. Wait for recovery (10-15 seconds)
4. Test API still working
5. Repeat with Redis and API

VALIDATE:
✅ Service restarts cleanly (~5-10 seconds)
✅ Other services remain running
✅ Graceful degradation during restart
✅ API responds after PostgreSQL restart
✅ No cascade failures
✅ No stuck processes

CAPTURE EVIDENCE:
- Terminal: restart commands
- Terminal: API health check after each restart
```

### TEST 11.3: PostgreSQL Data Durability
```
PERSONA: Operations User
ACTION:
1. Record initial data counts:
   docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
     psql -h localhost -U cintent -d cintent -c \
     "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM replay_events;"
2. Restart PostgreSQL:
   docker-compose restart cintent-postgres
3. Check counts again

VALIDATE:
✅ Data counts unchanged
✅ No data loss on restart
✅ Data integrity maintained:
   - No NULL fields appearing
   - Foreign keys still valid
   - Timestamps unchanged
✅ Database accessible immediately after restart

CAPTURE EVIDENCE:
- Terminal: before and after counts
```

### TEST 11.4: Redis Data Durability
```
PERSONA: Operations User
ACTION:
1. Check Redis keys:
   docker exec cintent-redis redis-cli KEYS "*" | wc -l
2. Restart Redis:
   docker-compose restart cintent-redis
3. Check keys again

VALIDATE:
✅ Key count unchanged or reasonable:
   - Session keys may be lost (short TTL expected)
   - Other cache keys preserved
✅ Session data preserved if not expired:
   docker exec cintent-redis redis-cli GET "session:<id>"
   ← Should exist if TTL not exceeded
✅ RDB/AOF persistence working

CAPTURE EVIDENCE:
- Terminal: before and after key counts
```

### TEST 11.5: Health Endpoints
```
PERSONA: Operations User
ACTION:
1. Check API health:
   curl -s http://localhost:3000/api/health
2. Check specific service health (if endpoints exist):
   curl -s http://localhost:3000/api/health/database
   curl -s http://localhost:3000/api/health/redis

VALIDATE:
✅ /api/health returns 200 OK
✅ Response includes:
   - status: "ok"
   - timestamp
   - service versions
   - component statuses
✅ Database health shows: "connected"
✅ Redis health shows: "connected"
✅ All components showing healthy status

CAPTURE EVIDENCE:
- Terminal output: health endpoint responses
```

---

## COMPREHENSIVE END-TO-END FLOW (120 minutes)

Execute the complete workflow without interruption:

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: LOGIN                                               │
├─────────────────────────────────────────────────────────────┤
| 1. Navigate to http://localhost:3000
| 2. Login as: beginner@test.local
| 3. Verify in Redis: docker exec cintent-redis redis-cli KEYS "session:*"
| RESULT: ✅ User logged in, session in Redis
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: GOVERNANCE ACCEPTANCE                               │
├─────────────────────────────────────────────────────────────┤
| 1. Governance popup appears
| 2. Read terms and privacy policy
| 3. Click "Accept All"
| 4. Verify: SELECT * FROM governance_events
| RESULT: ✅ Governance accepted, recorded in DB
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: WORKSPACE INITIALIZATION                            │
├─────────────────────────────────────────────────────────────┤
| 1. Select domain: "governance"
| 2. See available APIs for governance
| 3. Workspace ID generated in PostgreSQL
| 4. Verify: SELECT workspace_id FROM workspaces LIMIT 1
| RESULT: ✅ Fresh workspace created
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: ASK COGNI QUERY                                     │
├─────────────────────────────────────────────────────────────┤
| 1. Click Ask COGNI
| 2. Query: "How do I set up governance policies?"
| 3. Receive contextual results for governance domain
| 4. Verify no false semantic claims in response
| RESULT: ✅ Ask COGNI provides honest, contextual results
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: WORKFLOW CREATION                                   │
├─────────────────────────────────────────────────────────────┤
| 1. Click "Create Workflow"
| 2. Name: "Governance Setup"
| 3. Select APIs: governance-1, governance-2
| 4. Define order: gov-1 → gov-2
| 5. Save workflow
| 6. Verify: SELECT * FROM orchestration_runs WHERE title LIKE '%Governance Setup%'
| RESULT: ✅ Workflow created and persisted
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 6: ORCHESTRATION EXECUTION                             │
├─────────────────────────────────────────────────────────────┤
| 1. Click "Execute" on workflow
| 2. Monitor execution progress
| 3. Watch each API complete in sequence
| 4. Wait for final completion
| 5. Verify: SELECT status, completed_at FROM orchestration_runs WHERE title LIKE '%Governance Setup%'
| RESULT: ✅ Orchestration executed successfully
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 7: REPLAY GENERATION                                   │
├─────────────────────────────────────────────────────────────┤
| 1. Click "Generate Replay" on completed orchestration
| 2. Wait for generation
| 3. Verify: SELECT * FROM replay_events LIMIT 1
| 4. Check ledger: ls -lah .cintent-runtime/runtime-ledger.jsonl
| RESULT: ✅ Replay generated and persisted
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 8: TELEMETRY STREAMING                                 │
├─────────────────────────────────────────────────────────────┤
| 1. Open telemetry/monitoring page
| 2. Watch real-time events stream
| 3. Check WebSocket connection in DevTools
| 4. Verify: SELECT COUNT(*) FROM runtime_events
| RESULT: ✅ Telemetry streaming and persisting
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 9: BROWSER REFRESH RECOVERY                            │
├─────────────────────────────────────────────────────────────┤
| 1. Press F5 to refresh browser
| 2. Wait for page reload
| 3. Verify user is still logged in
| 4. Workspace state is restored
| 5. Can see previous workflow and execution
| RESULT: ✅ Session and state survive refresh
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 10: SESSION RESTORATION                                │
├─────────────────────────────────────────────────────────────┤
| 1. Check Redis for session:
|    docker exec cintent-redis redis-cli GET "session:<id>"
| 2. Verify session still active with TTL > 0
| 3. Can continue operations without re-login
| RESULT: ✅ Session properly restored
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 11: REPLAY RECONSTRUCTION                              │
├─────────────────────────────────────────────────────────────┤
| 1. Click "Reconstruct Replay"
| 2. Monitor reconstruction progress
| 3. Verify results match original execution
| 4. Confirm reconstruction_status = "completed"
| RESULT: ✅ Replay reconstructs successfully
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 12: DOMAIN SWITCH                                      │
├─────────────────────────────────────────────────────────────┤
| 1. Change domain from "governance" to "orchestration"
| 2. Watch available APIs update
| 3. Ask COGNI with new domain context
| 4. Verify different results for new domain
| 5. Verify: SELECT domain FROM workspaces WHERE workspace_id='<id>'
| RESULT: ✅ Domain switch works seamlessly
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 13: WORKSPACE RESET                                    │
├─────────────────────────────────────────────────────────────┤
| 1. Click "Reset Workspace"
| 2. Confirm reset
| 3. Workspace cleared of all configuration
| 4. Same workspace ID maintained
| 5. Can reconfigure fresh
| RESULT: ✅ Workspace reset and ready for reuse
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 14: LOGOUT                                             │
├─────────────────────────────────────────────────────────────┤
| 1. Click "Logout" button
| 2. Confirm logout
| 3. Redirected to login page
| 4. Verify: docker exec cintent-redis redis-cli GET "session:<id>"
|    ← Should return (nil)
| 5. Verify cannot access protected endpoints
| RESULT: ✅ Logout clean, session deleted
└─────────────────────────────────────────────────────────────┘

OVERALL: ✅ COMPLETE FLOW SUCCEEDS WITHOUT BREAKING
```

---

## FAILURE SCENARIO TESTING (90 minutes)

### Failure 1: Browser Refresh During Orchestration
```
ACTION:
1. Start orchestration
2. Wait for step 2 of 5
3. Press F5 (refresh)

VALIDATE:
✅ Orchestration continues in background
✅ User remains logged in
✅ Can see execution progress after refresh
✅ Execution completes normally
✅ No duplicate execution of steps
```

### Failure 2: WebSocket Disconnect
```
ACTION:
1. Real-time telemetry streaming
2. DevTools Network → Close ws connection
3. Wait 5 seconds
4. Observe reconnect

VALIDATE:
✅ WebSocket disconnect detected
✅ Automatic reconnect attempted
✅ Missing events caught up
✅ Telemetry continues
```

### Failure 3: Redis Restart
```
ACTION:
1. Redis running normally
2. docker-compose restart cintent-redis
3. Wait for restart

VALIDATE:
✅ Session survives (if TTL not expired)
✅ Cache repopulates
✅ No forced logout
✅ Operations continue
```

### Failure 4: PostgreSQL Connection Loss
```
ACTION:
1. docker-compose stop cintent-postgres
2. User tries to perform operation
3. docker-compose start cintent-postgres
4. User tries again

VALIDATE:
✅ Clear error during downtime
✅ Not generic "500 error"
✅ Session still valid in Redis
✅ Operations resume after recovery
```

### Failure 5: API Server Restart
```
ACTION:
1. docker-compose restart cintent-api
2. Monitor impact

VALIDATE:
✅ API recovers in ~10 seconds
✅ User not forced to login again
✅ In-flight requests fail gracefully
✅ Can continue operations
```

---

## EVIDENCE COLLECTION CHECKLIST

### Screenshots to Capture (50+)
- [ ] Login page
- [ ] Dashboard after login
- [ ] Governance popup
- [ ] Ask COGNI query and response
- [ ] Workflow creation
- [ ] Orchestration execution (start, progress, complete)
- [ ] Replay generation and reconstruction
- [ ] Telemetry streaming
- [ ] After browser refresh
- [ ] Domain switch
- [ ] Workspace reset
- [ ] Logout confirmation
- [ ] Error messages (if any issues)
- [ ] Each failure scenario

### Database Queries to Run and Save
```bash
# Users
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM users; SELECT email, created_at FROM users LIMIT 5;"

# Sessions
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM sessions WHERE deleted_at IS NULL;"

# Workspaces
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM workspaces; SELECT workspace_id, domain, updated_at FROM workspaces LIMIT 5;"

# Governance
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM governance_events; SELECT event_type, created_at FROM governance_events LIMIT 10;"

# Ask COGNI Sessions
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM ask_cogni_sessions; SELECT query, created_at FROM ask_cogni_sessions LIMIT 5;"

# Orchestrations
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM orchestration_runs; SELECT title, status, started_at, completed_at FROM orchestration_runs LIMIT 5;"

# Replays
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM replay_events; SELECT orchestration_id, reconstruction_status, created_at FROM replay_events LIMIT 5;"

# Runtime Events
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM runtime_events;"

# Redis Session Check
docker exec cintent-redis redis-cli KEYS "session:*" | head -5
docker exec cintent-redis redis-cli TTL "session:<sample-id>"
```

### Logs to Collect
```bash
# API logs
docker-compose logs cintent-api | tail -200 > api-logs.txt

# Database logs
docker-compose logs cintent-postgres | tail -200 > postgres-logs.txt

# Redis logs
docker-compose logs cintent-redis | tail -200 > redis-logs.txt

# Browser console logs
DevTools → Console → Screenshot
```

---

## MANDATORY QA REPORTS (Generate after all testing)

### Report 1: Launch QA Report
- Executive summary of validation
- Test completion percentage (X/Y tests passed)
- Critical issues found (if any)
- Go/No-Go recommendation

### Report 2: Runtime Stability Report
- Uptime during testing
- Failure scenarios encountered
- Recovery success rate
- Performance metrics

### Report 3: Ask COGNI Quality Report
- Retrieval quality assessment
- Contextual awareness validation
- Honest positioning verification
- No false semantic claims

### Report 4: Governance Validation Report
- Popup functionality
- Acceptance/rejection handling
- Bypass attempt results (MUST FAIL)
- Audit trail completeness

### Report 5: Replay Validation Report
- Generation success rate
- Reconstruction accuracy
- Independence from original (CRITICAL)
- Persistence verification

### Report 6: Persistence Validation Report
- Database durability
- Redis cache functionality
- Session persistence
- Data consistency

### Report 7: UX Validation Report
- No internal IDs exposed
- No stale data
- No broken modals
- Professional appearance

### Report 8: Security Validation Report
- Authentication enforcement
- Governance enforcement
- No bypass vulnerabilities
- Audit logging

### Report 9: Remaining Launch Risks
- Any issues found
- Workarounds if any
- Risk scores
- Mitigation plans

### Report 10: Final Launch Readiness Score
```
Category                Pass Rate    Score
─────────────────────────────────────────
Authentication         X/X tests    __/100
Governance            X/X tests    __/100
Workspace Lifecycle   X/X tests    __/100
Ask COGNI             X/X tests    __/100
Orchestration         X/X tests    __/100
Replay                X/X tests    __/100
Telemetry             X/X tests    __/100
Persistence           X/X tests    __/100
UX Consistency        X/X tests    __/100
API Runtime           X/X tests    __/100
Deployment            X/X tests    __/100
─────────────────────────────────────────
OVERALL SCORE: ___/100

GO/NO-GO: [ ]
```

---

## SUCCESS CRITERIA FOR LAUNCH

### LAUNCH APPROVED IF:
✅ Overall score ≥ 90/100  
✅ All critical tests pass (governance bypass blocked, replay independent, etc.)  
✅ No data loss on any failure  
✅ No false semantic claims in Ask COGNI  
✅ UX professional and honest  
✅ Complete flow test succeeds  

### LAUNCH BLOCKED IF:
❌ Overall score < 85/100  
❌ Any critical test fails  
❌ Governance can be bypassed  
❌ Replay only works with original (cosmetic)  
❌ False semantic claims found  
❌ Data loss on failure scenario  
❌ Broken modals or exposed IDs  

---

**Framework Complete - Ready for Enterprise QA Execution**

This is a comprehensive guide for validating api-cintent.cognivantalabs.com as a real enterprise cognitive platform. Execute systematically, capture evidence at each step, and report findings without optimistic bias.

