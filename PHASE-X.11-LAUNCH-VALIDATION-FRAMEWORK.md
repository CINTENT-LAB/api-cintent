# PHASE-X.11 CINTENT LAUNCH VALIDATION FRAMEWORK
## Complete End-to-End Runtime Simulation & Failure Recovery Testing

**Status:** FRAMEWORK READY FOR EXECUTION  
**Validation Scope:** 10 test groups, 5 user personas, comprehensive failure scenarios  
**Expected Duration:** 4-6 hours for complete validation  
**Evidence Type:** Screenshots, runtime logs, replay evidence  

---

## CRITICAL MANDATE

This is **NOT** feature development. This is **PRODUCTION LAUNCH HARDENING**.

**DO NOT assume:** Features work because code exists.  
**ONLY trust:** Runtime execution evidence from actual platform operation.

---

## PRE-VALIDATION CHECKLIST

### Step 1: Verify Docker Environment

```bash
# Run from Windows Command Prompt or PowerShell in C:\Users\rpm_T\RAJA_REP\api-cintent

# Check all containers are running
docker-compose ps

# Expected output:
# NAME                COMMAND               STATUS
# cintent-postgres    "postgres -c ..."     Up 2 hours
# cintent-redis       "redis-server"        Up 2 hours
# cintent-api         "node server.js"      Up 2 hours
# trace-streamer      "node trace-str..."   Up 2 hours
# (additional containers may be listed)
```

**VALIDATION PASS:** All containers show "Up" status  
**VALIDATION FAIL:** Any container not running → Run `docker-compose up -d`

### Step 2: Verify PostgreSQL Connectivity

```bash
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c "SELECT COUNT(*) FROM users;"
```

**EXPECTED OUTPUT:** A number (count of users, likely 0 for fresh start)  
**VALIDATION PASS:** SQL query executes successfully  
**VALIDATION FAIL:** Connection error → Database not ready

### Step 3: Verify Redis Connectivity

```bash
docker exec cintent-redis redis-cli PING
```

**EXPECTED OUTPUT:** PONG  
**VALIDATION PASS:** Redis responds  
**VALIDATION FAIL:** Error or timeout

### Step 4: Verify API Health Endpoint

```bash
curl -s http://localhost:3000/api/health
```

**EXPECTED OUTPUT:** HTTP 200 with JSON response  
**VALIDATION PASS:** API responds  
**VALIDATION FAIL:** Connection refused or error

---

## TEST GROUP 1: AUTHENTICATION (30 minutes)

### Objective
Validate login, logout, session creation, and session restoration.

### Test Setup
- Open browser to: http://localhost:3000
- Have ready: email/password for test account

### TEST 1.1: Login Flow

```
ACTIONS:
1. Navigate to http://localhost:3000
2. See login page (not already authenticated)
3. Enter email: testuser@example.com
4. Enter password: test_password_123
5. Click "Sign In"

VALIDATE:
✅ Login form appears
✅ Email/password fields work
✅ No network errors in console
✅ Redirects to dashboard on success
✅ User info displayed (email/name)
✅ Session cookie set in browser

FAILURE SCENARIOS:
❌ Login form doesn't appear
❌ Fields not accepting input
❌ Submit button doesn't work
❌ No redirect to dashboard
❌ Error message but no action taken
```

**EVIDENCE TO CAPTURE:** Screenshot of dashboard after login

### TEST 1.2: Session Persistence in Redis

```bash
# After successful login, check Redis for session

docker exec cintent-redis redis-cli KEYS "session:*" | head -5

# Check session content
docker exec cintent-redis redis-cli GET "session:<session-id>"
```

**VALIDATE:**
✅ Session key exists in Redis  
✅ Session contains user data  
✅ Session TTL is set (2 hours)  
**FAILURE:** No session in Redis or corrupted data

### TEST 1.3: Session Restoration After Browser Refresh

```
ACTIONS:
1. User is logged in (from TEST 1.1)
2. Press F5 to refresh browser
3. Wait for page to load

VALIDATE:
✅ User remains logged in (no redirect to login)
✅ Dashboard appears with user info
✅ No flash of login page
✅ Workspace state preserved

FAILURE SCENARIOS:
❌ Redirected back to login page
❌ White screen on refresh
❌ User info missing
❌ Session lost error
```

**EVIDENCE TO CAPTURE:** Screenshot after refresh showing logged-in state

### TEST 1.4: Session Expiry Simulation

```
ACTIONS:
1. User is logged in
2. Wait 2+ hours OR manually clear session in Redis:

docker exec cintent-redis redis-cli DEL "session:<session-id>"

3. Try to access protected endpoint:

curl -s http://localhost:3000/api/workspaces \
  -H "Cookie: sessionId=<expired-session>"

VALIDATE:
✅ Request returns 401 Unauthorized
✅ User redirected to login if in browser
✅ No stale data returned

FAILURE SCENARIOS:
❌ Protected endpoint returns data despite expired session
❌ No redirect to login
❌ 500 error instead of 401
```

### TEST 1.5: Invalid Login Handling

```
ACTIONS:
1. Navigate to login page
2. Enter invalid email: invalid@fake.com
3. Enter wrong password: wrong_password
4. Click "Sign In"

VALIDATE:
✅ Error message appears: "Invalid credentials"
✅ No session created
✅ Stays on login page
✅ Can retry login

FAILURE SCENARIOS:
❌ Error message not shown
❌ Session created despite invalid credentials
❌ Redirects to dashboard
❌ Application crashes
```

### TEST 1.6: Logout and Session Cleanup

```
ACTIONS:
1. User is logged in
2. Click "Logout" button (top right)
3. Confirm logout

VALIDATE:
✅ Redirected to login page
✅ Session removed from Redis:
   docker exec cintent-redis redis-cli KEYS "session:*"
   # Should not contain previous session ID
✅ Cannot access protected endpoints

FAILURE SCENARIOS:
❌ Logout button missing
❌ Session not deleted from Redis
❌ Stale cookies persist
❌ Can still access protected endpoints
```

---

## TEST GROUP 2: GOVERNANCE (45 minutes)

### Objective
Validate governance policies, terms/license acceptance, and policy enforcement.

### TEST 2.1: Governance Popup on Fresh Login

```
SETUP:
- Create fresh user account OR clear previous governance data

ACTIONS:
1. New user logs in for first time
2. Before workspace appears, governance popup should appear

VALIDATE:
✅ Modal popup appears
✅ Title: "Platform Governance & Terms"
✅ Shows:
   - Terms of Service
   - License Agreement
   - Privacy Policy
   - Governance Compliance Statement
✅ "Accept All" button present
✅ "Decline" button present
✅ Cannot close without choosing

FAILURE SCENARIOS:
❌ No popup appears
❌ Popup has missing sections
❌ Can close without accepting
❌ Accept button doesn't work
```

**EVIDENCE TO CAPTURE:** Screenshot of governance popup

### TEST 2.2: Terms & License Acceptance

```
ACTIONS:
1. Governance popup is displayed
2. Read through all sections (user should verify content)
3. Click "Accept All" button

VALIDATE:
✅ Modal closes
✅ Workspace appears
✅ Governance acceptance recorded in database:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT * FROM governance_events WHERE user_id = 'test-user' AND event_type = 'acceptance';"

✅ Record has timestamp, user ID, acceptance type
✅ User can now access APIs

FAILURE SCENARIOS:
❌ Modal doesn't close
❌ No record in database
❌ Cannot access APIs after acceptance
❌ Repeated acceptance required on refresh
```

### TEST 2.3: Governance Bypass Attempt

```
ACTIONS:
1. New user attempts to bypass governance popup
2. Method 1: Try to navigate directly to /api/ask via curl without governance token:

curl -s http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "show me APIs"}'

3. Method 2: Try to manipulate acceptance status in browser dev tools

VALIDATE:
✅ API call blocked with 403 Forbidden OR 401 Unauthorized
✅ Response message indicates governance not accepted
✅ No data returned despite attempt
✅ Attempt logged for audit:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT * FROM audit_logs WHERE action = 'governance_bypass_attempt';"

FAILURE SCENARIOS:
❌ API call succeeds despite governance not accepted
❌ Data returned
❌ No audit log of bypass attempt
❌ Security boundary broken
```

**CRITICAL VALIDATION:** Governance cannot be bypassed programmatically

### TEST 2.4: Policy Persistence Across Sessions

```
SETUP:
- User has accepted governance

ACTIONS:
1. User logs out
2. User logs back in
3. Check if governance popup appears again

VALIDATE:
✅ Governance popup does NOT appear second time
✅ User goes straight to workspace
✅ Previous acceptance still in database with same timestamp
✅ Governance_events table shows only ONE acceptance record for this user

FAILURE SCENARIOS:
❌ Popup appears again on second login (acceptance not persisted)
❌ Multiple acceptance records created
❌ User forced to re-accept
❌ Policy state not preserved
```

### TEST 2.5: Governance Rejection Handling

```
SETUP:
- Fresh user, governance popup showing

ACTIONS:
1. Click "Decline" button instead of "Accept All"

VALIDATE:
✅ Modal closes
✅ User is returned to login page OR shown a rejection message
✅ User is logged out OR cannot access workspace
✅ Rejection recorded:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT * FROM governance_events WHERE user_id = 'test-user' AND event_type = 'rejection';"

✅ No workspace access granted
✅ User can attempt login again later

FAILURE SCENARIOS:
❌ Rejection not recorded
❌ User can still access workspace
❌ No clear indication of rejection
❌ Cannot login again
```

---

## TEST GROUP 3: WORKSPACE LIFECYCLE (45 minutes)

### Objective
Validate fresh workspace creation, resumption, reset, and sandbox mode.

### TEST 3.1: Fresh Workspace Initialization

```
SETUP:
- User is logged in
- First time accessing platform

ACTIONS:
1. After governance acceptance, workspace page loads
2. Observe initial state

VALIDATE:
✅ Workspace ID generated and persisted:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT workspace_id, tenant_id, created_at FROM workspaces LIMIT 1;"

✅ Workspace state stored in Redis:

docker exec cintent-redis redis-cli GET "workspace:<workspace-id>"

✅ UI shows:
   - Empty domain selection (or default)
   - No active APIs selected
   - Sandbox mode enabled (indicated in UI)
   - No previous state visible
✅ Templates available for domain selection

FAILURE SCENARIOS:
❌ Workspace ID not created
❌ Stale state from previous user shown
❌ Templates don't load
❌ No persistence in database or Redis
```

**EVIDENCE TO CAPTURE:** Screenshot of fresh workspace

### TEST 3.2: Workspace Resume After Refresh

```
SETUP:
- User has created and configured a workspace:
  - Selected domain: "governance"
  - Selected APIs: ["governance-1", "governance-2"]
  - Active workflow: "policy-setup"

ACTIONS:
1. User configures workspace as described above
2. Press F5 to refresh browser
3. Wait for page to load

VALIDATE:
✅ Same workspace ID appears:
   - Check browser URL or workspace header
✅ Previous configuration restored:
   - Same domain is selected
   - Same APIs are shown as active
   - Same workflow appears active
✅ User can continue without re-configuration
✅ State retrieved from either Redis (fast) or PostgreSQL (durable)

Verify Redis cache:
docker exec cintent-redis redis-cli GET "workspace:<workspace-id>"

FAILURE SCENARIOS:
❌ Different workspace ID appears
❌ Configuration lost (domain/APIs reset)
❌ Stale state from different session mixed in
❌ Slow load because not cached in Redis
❌ Users forced to reconfigure every refresh
```

**EVIDENCE TO CAPTURE:** Screenshot after refresh showing resumed state

### TEST 3.3: Workspace Reset

```
SETUP:
- User has configured workspace

ACTIONS:
1. Click "Reset Workspace" button (or similar reset function)
2. Confirm reset

VALIDATE:
✅ Workspace state cleared:
   - Domain selection reset
   - All selected APIs deselected
   - Active workflow cleared
   - UI returns to empty state
✅ Same workspace ID maintained (not deleted, just reset)
✅ Reset recorded in database:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT * FROM runtime_events WHERE event_type = 'workspace_reset' AND workspace_id = '<id>';"

✅ User can reconfigure fresh workspace

FAILURE SCENARIOS:
❌ State not cleared
❌ Reset option not available
❌ Cannot reconfigure after reset
❌ Workspace deleted instead of reset
❌ No audit record of reset
```

### TEST 3.4: Sandbox Mode Validation

```
SETUP:
- User is in workspace

ACTIONS:
1. Check UI for sandbox mode indicator
2. Execute an Ask COGNI query
3. Check if execution is sandboxed

VALIDATE:
✅ UI shows clear indication: "SANDBOX MODE" or similar
✅ All executions are non-destructive
✅ No real data written to production systems
✅ Ask COGNI results labeled as "sandbox"
✅ Orchestration executions don't affect real APIs
✅ Workspace configured for dev/test tier (not production)

FAILURE SCENARIOS:
❌ Sandbox mode not indicated
❌ Changes appear to affect production
❌ Data persistence occurs outside sandbox
❌ Real APIs are called
❌ Users unaware they're in sandbox
```

### TEST 3.5: Domain Switching

```
SETUP:
- Workspace with domain "governance" selected

ACTIONS:
1. Click domain selector
2. Change domain to "orchestration"
3. Observe workspace update

VALIDATE:
✅ Domain dropdown shows all available domains
✅ Domain change immediately updates:
   - Available APIs filtered to new domain
   - Templates updated to new domain
   - Previous domain's selections cleared
✅ New domain state persisted:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT domain FROM workspaces WHERE workspace_id = '<id>';"

✅ Browser refresh maintains new domain

FAILURE SCENARIOS:
❌ Domain selector doesn't work
❌ APIs from old domain still visible
❌ Domain not persisted
❌ Refresh reverts to old domain
❌ No visual indication of domain change
```

### TEST 3.6: Stale State Bleed Check

```
SETUP:
- User 1 creates workspace with domain "governance" and selects specific APIs

ACTIONS:
1. Log in as User 2 (different user account)
2. Check workspace state for User 2

VALIDATE:
✅ User 2 gets fresh empty workspace
✅ User 2's workspace ID is different from User 1's
✅ User 2 cannot see User 1's configuration
✅ No stale state from User 1 visible
✅ Tenant isolation maintained (different tenant_id in database)

Database check:
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT DISTINCT tenant_id, workspace_id FROM workspaces LIMIT 10;"

FAILURE SCENARIOS:
❌ User 2 sees User 1's workspace
❌ Same workspace ID shared across users
❌ Stale configuration visible
❌ Data leakage between users
❌ Tenant isolation broken
```

**CRITICAL VALIDATION:** No stale state bleed between users

---

## TEST GROUP 4: ASK COGNI (60 minutes)

### Objective
Validate contextual retrieval, orchestration awareness, replay awareness, and honest positioning.

### TEST 4.1: Contextual Retrieval

```
SETUP:
- User is in "governance" domain workspace
- User has selected APIs: ["governance-1", "governance-2"]

ACTIONS:
1. Click "Ask COGNI" or similar button
2. Type query: "How do I set up governance policies?"
3. Submit query

VALIDATE:
✅ Ask COGNI responds (no timeout)
✅ Response includes:
   - Result set (up to 6 APIs)
   - Each result shows: name, description, lifecycle, governance support
✅ Results are contextual to "governance" domain:
   - Governance APIs ranked higher
   - Non-governance APIs ranked lower or absent
✅ Response includes transparency metadata:

Check response JSON:
{
  "architecture": {
    "retrieval_method": "contextual-keyword-weighting (NOT semantic)",
    "vector_search_enabled": false,
    "vector_search_planned": "PHASE-X.11"
  },
  "transparency_metadata": {
    "retrieval_method": "hybrid-contextual-keyword-weighting",
    "scoring_breakdown": "keyword(35%) + orchestration(25%) + replay(15%) + ..."
  }
}

✅ NO claims of "pgvector semantic search"
✅ NO false "embeddings" claims

FAILURE SCENARIOS:
❌ Ask COGNI doesn't respond or times out
❌ Results not filtered by domain
❌ Irrelevant APIs ranked high
❌ False semantic claims in response
❌ Transparency metadata missing
❌ No indication of actual retrieval method
```

**EVIDENCE TO CAPTURE:** Screenshot of Ask COGNI response with results

### TEST 4.2: Orchestration Awareness

```
SETUP:
- User has configured workspace:
  - Domain: "orchestration"
  - Selected workflow: "api-chain-execution"
  - Selected APIs: ["api-1", "api-2", "api-3"]

ACTIONS:
1. Execute Ask COGNI query: "What orchestration examples are available?"
2. Check if Ask COGNI recommends APIs that work well together

VALIDATE:
✅ Results include APIs that work in orchestration chains
✅ Recommended APIs align with selected workflow type
✅ Scoring reflects orchestration context:
   - APIs used in recent successful orchestrations ranked higher
   - APIs in active workflow ranked higher
✅ Response includes explanation of orchestration awareness

Verify in response: "Based on your active workflow 'api-chain-execution'..."

FAILURE SCENARIOS:
❌ No orchestration awareness in results
❌ Random APIs recommended
❌ Workflow context ignored
❌ Poor API combinations suggested
❌ No explanation of orchestration factors
```

### TEST 4.3: Replay Awareness

```
SETUP:
- System has executed some orchestrations and replayed them
- Replay events stored in replay_events table

ACTIONS:
1. Execute Ask COGNI query: "Which APIs work well together based on my history?"
2. Check if results reflect replay patterns

VALIDATE:
✅ Ask COGNI scores consider replay history:
   - APIs that appeared together in successful replays ranked higher
   - Success rate from past executions factors into scores
✅ Response indicates replay learning:

Check for text like: "Based on your replay history..."
or "These APIs have worked well together in past executions..."

✅ Scoring details show replay_awareness factor:

{
  "scoring_details": [
    {
      "api_key": "api-1",
      "scores": {
        "keyword": 0.85,
        "orchestration": 0.75,
        "replay": 0.65,  // ← This factor shows replay awareness
        "governance": 0.90,
        "domain": 0.80,
        "recency": 0.50
      }
    }
  ]
}

FAILURE SCENARIOS:
❌ Replay history not considered
❌ No scoring breakdown shown
❌ Past successful patterns ignored
❌ Static results regardless of history
❌ No explanation of how history influences recommendations
```

### TEST 4.4: Memory Continuity

```
SETUP:
- User has previously asked Ask COGNI: "Show me governance APIs"
- System stored response in ask_cogni_sessions table

ACTIONS:
1. Ask same query again: "Show me governance APIs"
2. Check if previous similar query is referenced

VALIDATE:
✅ Ask COGNI recognizes similar past query:
   - May show: "Similar query 2 days ago recommended..."
   - Provides continuity across sessions
✅ Previous responses accessible:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT query, response_summary, created_at FROM ask_cogni_sessions WHERE query LIKE '%governance%' LIMIT 5;"

✅ User can see query history
✅ Memory helps with repeated questions

FAILURE SCENARIOS:
❌ No memory of previous queries
❌ Treats similar queries as completely new
❌ No history access for user
❌ Memory queries return irrelevant results
❌ No session persistence
```

### TEST 4.5: No Repetitive Metadata Dumping

```
SETUP:
- Execute Ask COGNI query

ACTIONS:
1. Observe response structure
2. Check response doesn't contain repetitive metadata

VALIDATE:
✅ Response is structured and concise:
   - Top 6 results listed
   - Each result shows: name, description, key metadata
   - NO endless repetition of same metadata
   - NO template-like response (same for every query)
✅ Response adapts to query:
   - Governance query shows governance-specific info
   - Orchestration query shows orchestration-specific info
   - Different queries produce different response structures
✅ Natural language answer provided

FAILURE SCENARIOS:
❌ Response is repetitive boilerplate
❌ Same metadata repeated for each result
❌ Response identical for different queries
❌ Metadata dump with no context
❌ Template-like generation obvious
```

### TEST 4.6: Domain Adaptation

```
SETUP:
- User switches domain from "governance" to "robotics"

ACTIONS:
1. Change domain selector to "robotics"
2. Execute Ask COGNI query: "Show me available APIs"
3. Compare results to previous governance domain query

VALIDATE:
✅ Results immediately adapt to new domain:
   - Robotics APIs ranked high
   - Governance APIs not shown or ranked low
✅ Response adapts to domain context:
   - References robotics terminology
   - Robotics-specific examples
✅ No stale results from previous domain

FAILURE SCENARIOS:
❌ Results don't change after domain switch
❌ Governance APIs still show with high ranking
❌ Response content unchanged
❌ Old domain context persists
❌ Multiple domains' data mixed
```

---

## TEST GROUP 5: ORCHESTRATION (60 minutes)

### Objective
Validate workflow creation, execution, transitions, persistence, and restart recovery.

### TEST 5.1: Workflow Creation

```
SETUP:
- User is in workspace with domain selected

ACTIONS:
1. Click "Create Workflow" or "New Orchestration"
2. Give workflow name: "Test Governance Setup"
3. Select APIs: governance-1, governance-2
4. Set execution order: governance-1 → governance-2
5. Save workflow

VALIDATE:
✅ Workflow ID generated and persisted:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT id, title, api_keys FROM orchestration_runs WHERE title LIKE '%Test Governance%' LIMIT 1;"

✅ Workflow appears in UI with:
   - Name displayed
   - API sequence shown
   - Status indicator (draft/ready)
✅ Can edit workflow after creation
✅ Workflow configuration persisted

FAILURE SCENARIOS:
❌ No workflow created
❌ Workflow ID not saved
❌ Configuration lost on page refresh
❌ Cannot edit workflow
❌ UI doesn't reflect created workflow
```

**EVIDENCE TO CAPTURE:** Screenshot of workflow creation interface and created workflow

### TEST 5.2: Orchestration Execution

```
SETUP:
- Workflow created and ready to execute

ACTIONS:
1. Click "Execute" or "Run" button on workflow
2. Monitor execution in real-time (if UI supports it)
3. Wait for completion

VALIDATE:
✅ Execution starts immediately
✅ Execution tracked in database:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT id, status, started_at, completed_at FROM orchestration_runs WHERE title LIKE '%Test Governance%' LIMIT 1;"

✅ Execution status updates:
   - "running" → "completed" or "failed"
   - Timestamps recorded (started_at, completed_at)
✅ Each API in workflow executes (mock or real)
✅ Results stored for each step
✅ Total execution time calculated

FAILURE SCENARIOS:
❌ Execution doesn't start
❌ Status never updates
❌ No database record of execution
❌ Errors not captured
❌ No indication of progress
❌ Execution hangs indefinitely
```

### TEST 5.3: Workflow State Persistence

```
SETUP:
- Workflow has been executed

ACTIONS:
1. Note current workflow state
2. Refresh browser (F5)
3. Navigate back to workflows

VALIDATE:
✅ Workflow state persists across refresh:
   - Same workflow ID visible
   - Same execution history shown
   - Same results available
✅ Execution history complete:
   - Each step's status
   - Timestamps for each step
   - Output from each step
✅ Can retry or re-execute same workflow

FAILURE SCENARIOS:
❌ Workflow doesn't appear after refresh
❌ Execution history lost
❌ Results cleared
❌ Cannot re-execute
❌ State corrupted on refresh
```

### TEST 5.4: API Transitions in Workflow

```
SETUP:
- Workflow with 3 APIs in sequence: A → B → C

ACTIONS:
1. Execute workflow
2. Monitor transitions between APIs:
   - API A executes
   - API B starts (receives output from A)
   - API C starts (receives output from B)

VALIDATE:
✅ Each API completes before next starts
✅ Data flows between APIs:
   - Output of API A becomes input to API B
   - Output of API B becomes input to API C
✅ No data loss between transitions
✅ All transitions logged:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT * FROM workflow_states WHERE orchestration_id = '<id>' ORDER BY created_at;"

FAILURE SCENARIOS:
❌ APIs execute in parallel instead of sequence
❌ Data not passed between APIs
❌ Transitions fail with error
❌ API B doesn't start after A completes
❌ Data corruption between steps
❌ Wrong data passed to next API
```

### TEST 5.5: Restart Recovery

```
SETUP:
- Workflow was interrupted mid-execution (simulate by stopping docker or API)

ACTIONS:
1. Restart Docker containers:
   docker-compose restart cintent-api
2. Navigate back to workflow
3. Check recovery status

VALIDATE:
✅ Workflow recovers from checkpoint:
   - Can resume from last completed step (not restart from beginning)
   - Data from completed steps preserved
   - Can complete remaining steps
✅ Execution log shows:
   - Original start time
   - Restart time
   - Resumed status
✅ Final result includes full execution history

FAILURE SCENARIOS:
❌ Workflow restarts from beginning on recovery
❌ Previous progress lost
❌ Cannot resume
❌ Data from completed steps erased
❌ Error on recovery attempt
❌ Duplicate execution of earlier steps
```

---

## TEST GROUP 6: REPLAY (60 minutes)

### Objective
Validate replay generation, reconstruction, persistence, and continuity.

### TEST 6.1: Replay Generation

```
SETUP:
- Orchestration has been executed and completed

ACTIONS:
1. Click "Generate Replay" or similar button on execution
2. Review replay generation output

VALIDATE:
✅ Replay generated and stored:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT id, orchestration_id, status, created_at FROM replay_events LIMIT 5;"

✅ Replay contains:
   - Complete event sequence from original orchestration
   - API call sequence
   - Input/output for each step
   - Timestamps for each event
   - User context information
✅ Replay marked as "recorded" in database
✅ Replay available for reconstruction

FAILURE SCENARIOS:
❌ No replay generated
❌ Replay data incomplete
❌ Events in wrong order
❌ Missing API call data
❌ No timestamp information
❌ Replay not accessible later
```

**EVIDENCE TO CAPTURE:** Screenshot showing generated replay

### TEST 6.2: Replay Reconstruction

```
SETUP:
- Replay has been generated from previous orchestration

ACTIONS:
1. Click "Reconstruct Replay" or similar button
2. System replays the recorded event sequence
3. Monitor reconstruction process

VALIDATE:
✅ Reconstruction starts immediately
✅ Events replay in original order:
   - Event 1 fires
   - Event 2 fires
   - Event 3 fires
   - etc.
✅ Reconstruction status tracked:
   - "replaying" → "completed" or "failed"
   - Progress indicator if available
✅ Each replayed event produces same output as original:
   - API A returns same result
   - API B receives correct input
   - Final result matches original
✅ Reconstruction distinguished from original:
   - UI shows "Reconstructed execution" not new execution
   - Timeline shows reconstruction timestamp
   - Original and reconstruction both accessible

Verify in database:
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT reconstruction_status FROM replay_events WHERE id = '<replay-id>';"

FAILURE SCENARIOS:
❌ Reconstruction doesn't start
❌ Events replay out of order
❌ Results differ from original
❌ API calls made to real systems (should be mocked in replay)
❌ Reconstruction treated as new orchestration
❌ Cannot distinguish from original execution
❌ Stale replay data used
```

### TEST 6.3: Replay Persistence

```
SETUP:
- Multiple orchestrations have been executed and replayed

ACTIONS:
1. Check replay ledger file:

ls -lah .cintent-runtime/runtime-ledger.jsonl

2. Check database replay_events table:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT COUNT(*) as total_replays FROM replay_events;"

VALIDATE:
✅ Ledger file size > 1MB (substantial replay data)
✅ Ledger file contains valid JSONL (each line is valid JSON)

Check ledger integrity:
head -1 .cintent-runtime/runtime-ledger.jsonl | jq .

✅ Database contains replay records:
   - Count > 0
   - Old replays still present
   - New replays added
✅ Both ledger and database in sync:
   - Same events recorded in both
   - Database serves as durable storage
   - Ledger serves as fast cache

FAILURE SCENARIOS:
❌ Ledger file missing or empty
❌ Invalid JSON in ledger (cannot parse)
❌ Database has no replay records
❌ Ledger and database out of sync
❌ Recent replays not persisted
❌ Old replays disappearing
❌ File grows unbounded
```

### TEST 6.4: Replay Continuity Across Sessions

```
SETUP:
- User 1 executes orchestration and generates replay
- User logs out

ACTIONS:
1. User logs back in
2. Navigate to replay section
3. Click on previously generated replay

VALIDATE:
✅ Previous replay still available
✅ Reconstruction can still be executed
✅ Replay data unchanged:
   - Same event sequence
   - Same input/output
   - Same timestamps
✅ Can reconstruct multiple times
✅ Each reconstruction independent

Verify:
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM replay_events WHERE user_id = '<user-id>';"

FAILURE SCENARIOS:
❌ Replays disappear on logout
❌ Replay data corrupted
❌ Cannot reconstruct after session loss
❌ Reconstruction fails on second attempt
❌ Stale replay data returned
```

### TEST 6.5: Replay Cosmetic vs. Reconstructive

```
CRITICAL VALIDATION: Is replay TRULY reconstructive or just cosmetic?

SETUP:
- Original orchestration modified or removed
- Replay from that orchestration still available

ACTIONS:
1. Delete or modify original orchestration configuration
2. Attempt to reconstruct replay
3. Check if reconstruction works without original

VALIDATE:
✅ Replay reconstruction succeeds even if original deleted
✅ Replay is self-contained (doesn't depend on original)
✅ Event sequence replays from stored data, not recreating from original
✅ Results match original execution

EVIDENCE:
- Replay contains complete state (not just references)
- Reconstruction works offline
- Modification of original doesn't affect replay

FAILURE SCENARIOS:
❌ Reconstruction fails if original deleted
❌ Replay just references original (cosmetic)
❌ Cannot reconstruct independently
❌ Results differ when original changed
❌ Replay is only documentation, not executable
```

**CRITICAL FINDING:** This reveals whether replay is truly reconstructive or cosmetic

### TEST 6.6: Replay Export

```
SETUP:
- Replay has been generated

ACTIONS:
1. Click "Export Replay" or similar option
2. Select export format (JSON, CSV, etc.)
3. Download replay file

VALIDATE:
✅ Export option available
✅ Download succeeds
✅ File format correct:
   - Valid JSON if JSON format
   - Valid CSV if CSV format
   - Readable in text editor
✅ Exported data complete:
   - All events included
   - Metadata included
   - Timestamps included
✅ Can re-import exported replay

FAILURE SCENARIOS:
❌ Export option not available
❌ Download fails
❌ File format invalid
❌ Data incomplete
❌ Cannot re-import
```

---

## TEST GROUP 7: REDIS PERSISTENCE (45 minutes)

### Objective
Validate session persistence, cache continuity, reconnection recovery, and websocket continuity.

### TEST 7.1: Session Persistence in Redis

```
SETUP:
- User is logged in with active session

ACTIONS:
1. Check Redis for session data:

docker exec cintent-redis redis-cli KEYS "session:*"
docker exec cintent-redis redis-cli GET "session:<session-id>"

2. Verify session TTL:

docker exec cintent-redis redis-cli TTL "session:<session-id>"

VALIDATE:
✅ Session key exists in Redis
✅ Session data contains:
   - User ID
   - Tenant ID
   - User metadata
   - Creation timestamp
✅ TTL is set to ~2 hours (7200 seconds):
   - Not permanent (TTL should be positive number)
   - Long enough for normal session
✅ Session survives Redis restart (persisted to RDB/AOF):

docker-compose restart cintent-redis
# Wait a few seconds
docker exec cintent-redis redis-cli GET "session:<session-id>"
# Should still exist

FAILURE SCENARIOS:
❌ Session not in Redis
❌ Session data incomplete
❌ TTL not set (expires immediately)
❌ Session lost after Redis restart
❌ Corrupted session data
```

### TEST 7.2: Cache Continuity

```
SETUP:
- System has cached data (APIs catalog, user preferences, etc.)

ACTIONS:
1. Monitor Redis cache keys:

docker exec cintent-redis redis-cli KEYS "*" | wc -l

2. Perform operations that use cache
3. Verify cache is serving requests

VALIDATE:
✅ Cache keys populated:
   - "api:*" keys for API catalog
   - "user:*" keys for user data
   - Other domain-specific cache
✅ Cache is actually used (not just stored):
   - First request: cache miss, fetch from DB
   - Second request: cache hit, fast return
   - Observable in response times
✅ Cache consistency maintained:
   - No stale data returned
   - Updates reflected in cache

FAILURE SCENARIOS:
❌ No cache keys present
❌ Cache keys but not used
❌ Stale data from cache
❌ Cache never invalidates
❌ Performance same as without cache
```

### TEST 7.3: Reconnection Recovery

```
SETUP:
- User is logged in
- Redis connection is active

ACTIONS:
1. Disconnect Redis:

docker-compose stop cintent-redis

2. User performs action (e.g., Ask COGNI query)
3. Restart Redis:

docker-compose start cintent-redis

4. User performs another action

VALIDATE:
✅ First action (Redis down):
   - Returns error OR
   - Falls back to database OR
   - Shows "service temporarily unavailable"
✅ Second action (Redis restarted):
   - Succeeds without user re-login
   - Session still valid
   - Cache repopulated
✅ No data corruption:
   - Database still consistent
   - Session still valid in PostgreSQL
   - User experience recovers gracefully

FAILURE SCENARIOS:
❌ User forced to login again
❌ Data corruption after Redis restart
❌ No fallback without Redis
❌ Cryptic error messages
❌ Cannot recover after reconnection
```

### TEST 7.4: WebSocket Continuity

```
SETUP:
- WebSocket connection established for real-time updates

ACTIONS:
1. Open browser dev tools → Network → WS filter
2. Execute long-running orchestration
3. Observe WebSocket connection
4. Simulate disconnect:
   - Disconnect network OR
   - Kill browser dev tools connection
5. Restore connection

VALIDATE:
✅ WebSocket connects on page load
✅ Real-time updates received during execution:
   - Step 1 complete → update
   - Step 2 complete → update
   - etc.
✅ After disconnect:
   - WebSocket reconnection attempted
   - Automatic retry with backoff
   - User receives notifications
✅ After restore:
   - WebSocket reconnects
   - Missing updates caught up
   - Execution continues normally

FAILURE SCENARIOS:
❌ WebSocket doesn't connect
❌ No real-time updates
❌ No reconnection after disconnect
❌ User unaware of disconnect
❌ Missing updates not caught up
❌ Page becomes unresponsive
```

---

## TEST GROUP 8: FAILURE RECOVERY (90 minutes)

### Objective
Validate recovery from browser refresh, API failure, stale sessions, and database reconnection.

### TEST 8.1: Browser Refresh During Execution

```
SETUP:
- Orchestration is executing

ACTIONS:
1. Start orchestration execution
2. While still running, press F5 (refresh)
3. Page reloads

VALIDATE:
✅ Execution continues in background (not interrupted):

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT status, completed_at FROM orchestration_runs WHERE id = '<execution-id>';"
# Should show "running" or "completed"

✅ After page reload:
   - User is still logged in (session preserved)
   - Can see execution status in progress page
   - Can view partial results
   - Execution completes normally
✅ No execution duplicate (doesn't restart, resumes)

FAILURE SCENARIOS:
❌ Execution stops on refresh
❌ User forced to login again
❌ Execution restarted (duplicate)
❌ Results lost
❌ Cannot see status after refresh
```

### TEST 8.2: WebSocket Disconnect and Reconnect

```
SETUP:
- Real-time updates coming via WebSocket

ACTIONS:
1. Observe WebSocket in Network tab (dev tools)
2. Kill connection (close dev tools or disconnect network)
3. Wait 5 seconds
4. Restore connection

VALIDATE:
✅ WebSocket disconnect detected:
   - Browser realizes connection lost
   - Shows reconnection indicator (if available)
✅ Automatic reconnection:
   - Browser attempts to reconnect
   - Exponential backoff (1s, 2s, 4s...)
   - Max retries before giving up
✅ Missing updates handled:
   - Any updates during disconnect are caught up
   - UI syncs with server state
   - User doesn't miss critical updates

Verify in browser console: Should see reconnection logs

FAILURE SCENARIOS:
❌ No reconnection attempt
❌ Connection loss not detected
❌ User unaware of disconnect
❌ Missing updates not caught up
❌ Page hangs waiting for response
```

### TEST 8.3: Redis Restart Recovery

```
SETUP:
- Redis is running
- User has active session
- Cache is populated

ACTIONS:
1. Restart Redis:

docker-compose restart cintent-redis

2. Immediately perform action (e.g., Ask COGNI)
3. Monitor recovery

VALIDATE:
✅ Session survives restart:
   - User NOT logged out
   - Can continue working
   - No re-authentication required
✅ Cache repopulation:
   - First few requests might be slower (cache miss)
   - Subsequent requests are fast (cache hit)
   - Cache rebuilds automatically
✅ No data loss:
   - User data intact
   - Previous workspace state intact
   - No corruption

Verify:
docker exec cintent-redis redis-cli DBSIZE

FAILURE SCENARIOS:
❌ User logged out after restart
❌ Session lost
❌ Cache never repopulates
❌ Requests very slow even after recovery
❌ Data corruption
```

### TEST 8.4: PostgreSQL Connection Loss and Recovery

```
SETUP:
- PostgreSQL is running
- User is executing query (Ask COGNI, etc.)

ACTIONS:
1. Disconnect PostgreSQL (simulate failure):

docker-compose stop cintent-postgres

2. User tries to perform action (fails)
3. Restart PostgreSQL:

docker-compose start cintent-postgres

4. User performs action again

VALIDATE:
✅ First action (DB down):
   - Clear error message: "Database unavailable"
   - Not generic "500 error"
   - Actionable guidance provided
✅ Second action (DB recovered):
   - Works without user re-login
   - Session still valid (from Redis)
   - Query succeeds
✅ No persistent failure:
   - System recovers gracefully
   - User doesn't need manual recovery steps

FAILURE SCENARIOS:
❌ Cryptic error on DB failure
❌ User locked out after recovery
❌ No indication of what happened
❌ Manual recovery steps required
❌ Data corruption
```

### TEST 8.5: API Server Restart

```
SETUP:
- API server is running
- User has active session and active operations

ACTIONS:
1. Restart API server:

docker-compose restart cintent-api

2. Monitor impact on user session
3. Attempt operations after restart

VALIDATE:
✅ API restart takes ~5-10 seconds
✅ User experiences brief interruption (not catastrophic):
   - In-flight requests may fail but don't corrupt state
   - User session persists (stored in Redis)
✅ After restart:
   - User still logged in
   - Can resume operations
   - No data loss
✅ Long-running operations:
   - Can be resumed if interrupted
   - No duplicate execution
   - Results preserved

FAILURE SCENARIOS:
❌ User forced to login after restart
❌ In-flight requests corrupt data
❌ Operations restart instead of resume
❌ Long timeout during restart
❌ Session lost
```

### TEST 8.6: Stale Session Handling

```
SETUP:
- Simulate a stale session (manually set redis key)

ACTIONS:
1. Create stale session:

docker exec cintent-redis redis-cli SET "session:stale" '{"user_id":"test","expires":"2020-01-01"}'

2. Try to use stale session in API call:

curl -s http://localhost:3000/api/ask \
  -H "Cookie: sessionId=stale" \
  -H "Content-Type: application/json" \
  -d '{"query":"test"}'

VALIDATE:
✅ Stale session rejected:
   - Returns 401 Unauthorized (not 200)
   - Clear error message
✅ User prompted to re-login:
   - Browser redirects to login page
   - No stale data returned
✅ Fresh session created on re-login

FAILURE SCENARIOS:
❌ Stale session accepted
❌ Stale data returned
❌ No error indication
❌ User unaware session expired
```

### TEST 8.7: Invalid Workspace Handling

```
SETUP:
- Simulate invalid workspace ID

ACTIONS:
1. Try to access non-existent workspace:

curl -s http://localhost:3000/api/workspace/invalid-id-12345 \
  -H "Cookie: sessionId=<valid-session>" \
  -H "Content-Type: application/json"

2. Or modify URL to invalid workspace ID

VALIDATE:
✅ Returns 404 Not Found (not 500)
✅ Clear error: "Workspace not found"
✅ User can create new workspace or select existing
✅ No stale data returned
✅ System stays stable (no cascade failures)

FAILURE SCENARIOS:
❌ 500 error instead of 404
❌ Generic error message
❌ System crashes or becomes unstable
❌ Data from wrong workspace returned
❌ User confused about what happened
```

---

## TEST GROUP 9: UX INTEGRITY (45 minutes)

### Objective
Ensure UI is honest, no stale workflows, no fake data, no misleading claims.

### TEST 9.1: No Internal Runtime IDs

```
VALIDATION:
- Scan entire UI (all pages, all modals)
- Look for IDs like:
  - "persist-event-19f8a1b2"
  - "orchestration-abc123def456"
  - "session-token-xyz789"

Any internal IDs visible to user?

✅ PASS: No internal IDs visible
   - User sees: "Governance API 1"
   - NOT: "api-key-a1b2c3d4e5f6"

❌ FAIL: Internal IDs exposed
   - User sees UUID or database ID
   - Confusing and unprofessional
   - Security information leak
```

### TEST 9.2: No Stale Workflows

```
SETUP:
- Create multiple workflows
- Execute some
- Delete some (or mark as deleted)

ACTIONS:
1. Navigate to workflows section
2. Observe workflow list

VALIDATE:
✅ Only active workflows shown
✅ No deleted workflows in list
✅ No duplicate workflow entries
✅ Workflow count matches database:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM orchestration_runs WHERE deleted_at IS NULL AND workspace_id = '<id>';"

FAILURE SCENARIOS:
❌ Deleted workflows still shown
❌ Duplicate entries
❌ Stale data from cache
❌ UI count differs from database
```

### TEST 9.3: No Fake Data

```
VALIDATION:
- Observe data displayed in:
  - API catalog
  - Orchestration results
  - Ask COGNI responses
  - Workspace information

Check for obvious fake data:

❌ FAKE:
  - "lorem ipsum" text
  - "test data" labels
  - Placeholder values
  - Random IDs as descriptions

✅ REAL:
  - Actual API names and descriptions
  - Real schema information
  - Genuine configuration data
  - Actual execution results
```

### TEST 9.4: No Broken Modals

```
SETUP:
- Test all modal dialogs in UI

ACTIONS:
1. Open each modal (login, governance, workspace settings, etc.)
2. Check for rendering issues

VALIDATE:
✅ All modals render correctly:
   - Proper dimensions
   - Centered on screen
   - Content visible
   - Buttons functional
✅ Close button works (X or Cancel)
✅ Can interact with form fields
✅ No JavaScript console errors:

Check DevTools Console for red errors

FAILURE SCENARIOS:
❌ Modal doesn't appear
❌ Content cut off or hidden
❌ Broken styling
❌ Buttons don't respond
❌ Cannot close modal
❌ JavaScript errors in console
```

### TEST 9.5: No Misleading Semantic Claims

```
CRITICAL VALIDATION:

SCAN ALL UI TEXT FOR:
- "Semantic search"
- "AI-powered"
- "Vector search"
- "Embeddings"
- "Neural network"
- "LLM"
- "GPT" (if not about OpenAI)

Check:
1. Ask COGNI response text
2. Architecture descriptions shown to user
3. Feature marketing copy
4. Help text and tooltips

✅ PASS: No misleading claims
   - Honest descriptions like "Contextual retrieval"
   - "Based on your workspace context"
   - "Learned from your execution history"

❌ FAIL: Misleading claims found
   - "Semantic vector search"
   - "AI-powered intelligent retrieval"
   - False pgvector claims
   - Overstated capabilities
```

---

## TEST GROUP 10: DEPLOYMENT STABILITY (60 minutes)

### Objective
Validate complete system restart, environment restoration, and deployment resilience.

### TEST 10.1: Docker Compose Full Restart

```
ACTIONS:
1. Bring down entire environment:

docker-compose down

2. Wait for all containers to stop
3. Bring everything back up:

docker-compose up -d

4. Wait for initialization (~30 seconds)

VALIDATE:
✅ All containers restart successfully:

docker-compose ps
# All containers should show "Up"

✅ Services are healthy:
- PostgreSQL accepting connections
- Redis responding to PING
- API responding on port 3000
✅ No data loss:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c "SELECT COUNT(*) FROM users;"
# Should show pre-restart count

✅ Migrations run successfully (if needed)
✅ Database schema intact

FAILURE SCENARIOS:
❌ Containers don't start
❌ Services unhealthy after restart
❌ Data loss
❌ Schema corruption
❌ Stuck in restart loop
```

### TEST 10.2: Individual Service Restart

```
SETUP:
- All services running normally

ACTIONS:
1. Restart PostgreSQL:

docker-compose restart cintent-postgres

2. Monitor system behavior during restart
3. Repeat with Redis, API separately

VALIDATE:
✅ Service restarts in ~3-5 seconds
✅ Other services remain running
✅ System degrades gracefully:
   - Requests fail with clear error (not timeout)
   - User notified of issue
   - System recovers when service returns
✅ No cascade failures:
   - API doesn't crash when DB restarts
   - Other services continue operating
   - No stuck processes

FAILURE SCENARIOS:
❌ Cascading failures
❌ Hanging connections
❌ Long timeout (>30s)
❌ Zombie processes
❌ Manual restart required
```

### TEST 10.3: PostgreSQL Data Durability

```
SETUP:
- System has data (users, workspaces, replays, etc.)

ACTIONS:
1. Record initial data counts:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM replay_events;"

2. Perform disruptive operations:
   - docker-compose restart cintent-postgres
   - docker-compose down
   - System reload

3. Check data counts after each operation

VALIDATE:
✅ Data counts unchanged:
   - Same number of users
   - Same number of replays
   - Same number of orchestrations
✅ Data integrity:
   - No null unexpected fields
   - Foreign keys still valid
   - Timestamps unchanged
✅ No data corruption visible:

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT * FROM users LIMIT 1 \gx"
# Data should be readable and sensible

FAILURE SCENARIOS:
❌ Data loss on restart
❌ Corrupted records
❌ Broken foreign keys
❌ NULL fields appearing
❌ Data inconsistency
```

### TEST 10.4: Redis Data Durability

```
SETUP:
- Redis is running with data

ACTIONS:
1. Record Redis keys:

docker exec cintent-redis redis-cli KEYS "*" | wc -l

2. Restart Redis:

docker-compose restart cintent-redis

3. Check keys still present:

docker exec cintent-redis redis-cli KEYS "*" | wc -l

VALIDATE:
✅ Key count unchanged or reasonable:
   - Session keys lost (expected, short TTL)
   - Other cache keys preserved
✅ Session data if TTL not expired:

docker exec cintent-redis redis-cli GET "session:<id>"
# Should exist if < 2 hours old

FAILURE SCENARIOS:
❌ All Redis data lost
❌ RDB/AOF not persisting
❌ Sessions constantly regenerated
❌ No persistence configured
```

### TEST 10.5: Environment Restoration

```
SETUP:
- Note current environment state

ACTIONS:
1. Check environment variables:

docker exec cintent-api env | grep PGPASSWORD
docker exec cintent-api env | grep NODE_ENV

2. Verify correct values loaded:
   - Database password correct
   - Environment set to correct stage
   - API tokens configured
   - Port settings correct

VALIDATE:
✅ All critical env vars set:
   - PGPASSWORD
   - NODE_ENV
   - DATABASE_URL
   - API_PORT
   - Any other required vars
✅ Values are correct (not defaults or debug values)
✅ Configs consistent across containers

FAILURE SCENARIOS:
❌ Missing environment variables
❌ Wrong values (debug vs. production)
❌ Inconsistent config across services
❌ Secrets exposed in logs
```

### TEST 10.6: Deployment Workflow Validation

```
ACTIONS:
1. Simulate clean deployment:

cd /c/Users/rpm_T/RAJA_REP/api-cintent
docker-compose down -v   # Remove volumes
docker-compose up -d      # Fresh start

2. Monitor initialization
3. Run basic smoke tests after startup

VALIDATE:
✅ Clean deployment succeeds:
   - All containers start from scratch
   - Migrations run without error
   - Initial data loaded (if needed)
   - API responds on first request
✅ No initialization delays:
   - API ready within 30 seconds
   - Database accessible within 10 seconds
✅ Smoke tests pass:

curl -s http://localhost:3000/api/health
# Returns 200

docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c "SELECT 1;"
# Returns 1

FAILURE SCENARIOS:
❌ Deployment doesn't complete
❌ Long initialization delay
❌ Services not ready
❌ Migrations fail
❌ Connectivity issues
```

---

## MANDATORY COMPREHENSIVE FLOW TEST

### Complete End-to-End Scenario

Execute the following complete flow **WITHOUT** breaking at any step:

```
STEP 1: AUTHENTICATION
  ├─ Navigate to http://localhost:3000
  ├─ See login page
  ├─ Login with testuser@example.com / test_password_123
  └─ ✅ Logged in, session created in Redis

STEP 2: GOVERNANCE ACCEPTANCE
  ├─ Governance popup appears
  ├─ Accept all terms and policies
  └─ ✅ Governance recorded, popup dismissed

STEP 3: WORKSPACE INITIALIZATION
  ├─ Fresh workspace created
  ├─ Select domain: "governance"
  └─ ✅ Workspace persisted, domain selected

STEP 4: ASK COGNI - CONTEXTUAL RETRIEVAL
  ├─ Execute Ask COGNI query: "governance APIs"
  ├─ Receive contextually filtered results
  └─ ✅ Results relevant to governance domain

STEP 5: WORKFLOW CREATION
  ├─ Create workflow: "Governance Setup"
  ├─ Select APIs: governance-1, governance-2
  └─ ✅ Workflow saved, ID persisted

STEP 6: ORCHESTRATION EXECUTION
  ├─ Execute workflow
  ├─ Monitor execution progress
  └─ ✅ Execution completes, results stored

STEP 7: REPLAY GENERATION
  ├─ Generate replay from orchestration
  ├─ Verify replay recorded
  └─ ✅ Replay persisted in ledger

STEP 8: REPLAY RECONSTRUCTION
  ├─ Reconstruct the recorded replay
  ├─ Compare results to original
  └─ ✅ Reconstruction succeeds, results match

STEP 9: BROWSER REFRESH
  ├─ Press F5
  ├─ Wait for page reload
  └─ ✅ User still logged in, workspace state preserved

STEP 10: SESSION RESTORATION
  ├─ After refresh, check Redis for session
  ├─ Verify session TTL still valid
  └─ ✅ Session continues, not recreated

STEP 11: WORKSPACE SWITCH
  ├─ Change domain to "orchestration"
  ├─ Ask COGNI with new context
  └─ ✅ Results adapt to new domain

STEP 12: WORKSPACE RESET
  ├─ Reset workspace
  ├─ Verify state cleared
  └─ ✅ Workspace empty, ready for reconfiguration

STEP 13: LOGOUT
  ├─ Click logout
  ├─ Confirm logout
  └─ ✅ Redirected to login, session cleared from Redis

FINAL VALIDATION:
  ✅ No stale state bleed between steps
  ✅ No crashes or errors
  ✅ All persistence working (DB + Redis)
  ✅ Governance not bypassed
  ✅ Replay truly reconstructive (not cosmetic)
  ✅ UX honest and clear
  ✅ System stable throughout
```

---

## FAILURE RECOVERY TEST MATRIX

### For each failure scenario, validate recovery:

| Failure | Recovery | Validation |
|---------|----------|------------|
| Browser refresh | Session persists | User logged in after F5 |
| WebSocket disconnect | Auto-reconnect | Updates resume |
| Redis restart | Graceful fallback + recovery | DB fallback, cache rebuild |
| PostgreSQL down | Clear error + recovery | User notified, works after restart |
| API restart | Session survives | User continues without re-login |
| Stale session | Clear rejection | 401 Unauthorized, prompt re-login |
| Invalid workspace | 404 + guidance | User can create new or select existing |
| Network outage | Graceful degradation | Clear error, can retry |
| Orchestration interrupt | Resume capability | Can continue from checkpoint |

---

## EVIDENCE COLLECTION REQUIREMENTS

For each test group, capture:

### Screenshots (50+ total)
1. Login page
2. Dashboard after login
3. Governance popup
4. Workspace setup
5. Ask COGNI response
6. Workflow creation
7. Orchestration execution (in progress and completed)
8. Replay generation
9. Replay reconstruction
10. Browser refresh recovery
11. Error handling screens
12. Logout confirmation
13. Any failures encountered

### Database Queries
```bash
# Key queries to capture output:
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -h localhost -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM users; \
   SELECT COUNT(*) FROM ask_cogni_sessions; \
   SELECT COUNT(*) FROM orchestration_runs; \
   SELECT COUNT(*) FROM replay_events; \
   SELECT COUNT(*) FROM governance_events;"
```

### Runtime Logs
```bash
# API logs during tests
docker-compose logs cintent-api | tail -100 > api-logs.txt

# Database logs
docker-compose logs cintent-postgres | tail -100 > postgres-logs.txt

# Redis logs
docker-compose logs cintent-redis | tail -100 > redis-logs.txt
```

### Browser Console Logs
- Check DevTools Console for any errors
- Screenshot any console warnings/errors
- Record network tab for failed requests

---

## REPORTING STRUCTURE

After completing all tests, produce:

### 1. **Launch Acceptance Report**
- Executive summary
- Test completion status (X/Y tests passed)
- Critical failures (if any)
- Overall launch readiness

### 2. **Runtime Stability Report**
- Uptime statistics
- Failure scenarios encountered
- Recovery success rate
- Performance metrics

### 3. **Ask COGNI Validation Report**
- Retrieval quality assessment
- Contextual accuracy
- No false semantic claims
- User experience

### 4. **Governance Validation Report**
- Governance popup functionality
- Policy acceptance/rejection handling
- Bypass attempt results
- Audit trail completeness

### 5. **Replay Validation Report**
- Replay generation success rate
- Reconstruction accuracy
- Is replay truly reconstructive or cosmetic?
- Evidence from testing

### 6. **Persistence Validation Report**
- Database durability
- Redis cache functionality
- Session persistence
- Data consistency

### 7. **Failure Recovery Report**
- Browser refresh recovery: ✅ / ❌
- WebSocket disconnect recovery: ✅ / ❌
- Service restart recovery: ✅ / ❌
- Stale session handling: ✅ / ❌

### 8. **UX Integrity Report**
- No internal IDs exposed
- No stale data
- No fake data
- No misleading claims
- UI stability

### 9. **Remaining Launch Risks**
- Unresolved issues
- Known limitations
- Mitigation strategies
- Risk scores

### 10. **Launch Readiness Score**
```
Category                  Score    Evidence
────────────────────────────────────────────
Authentication:           __/100   [test results]
Governance:              __/100   [test results]
Workspace Lifecycle:     __/100   [test results]
Ask COGNI Quality:       __/100   [test results]
Orchestration:           __/100   [test results]
Replay System:           __/100   [test results]
Persistence:             __/100   [test results]
Failure Recovery:        __/100   [test results]
UX Integrity:            __/100   [test results]
Deployment Stability:    __/100   [test results]
────────────────────────────────────────────
OVERALL LAUNCH READINESS: __/100

GO / NO-GO DECISION: [ ]
```

---

## EXECUTION TIMELINE

**Estimated Duration:** 4-6 hours for complete validation

| Test Group | Duration | Start | End |
|-----------|----------|-------|-----|
| Authentication | 30 min | | |
| Governance | 45 min | | |
| Workspace Lifecycle | 45 min | | |
| Ask COGNI | 60 min | | |
| Orchestration | 60 min | | |
| Replay | 60 min | | |
| Redis Persistence | 45 min | | |
| Failure Recovery | 90 min | | |
| UX Integrity | 45 min | | |
| Deployment Stability | 60 min | | |
| Comprehensive Flow | 30 min | | |
| **TOTAL** | **540 min** | | |

---

## SUCCESS CRITERIA FOR LAUNCH

### ✅ LAUNCH APPROVED IF:

1. **All 10 test groups:** ≥90% tests pass
2. **Critical tests:** 100% pass
   - Authentication
   - Governance (bypass attempt fails)
   - Replay reconstruction (works independently)
   - Failure recovery (graceful handling)
3. **No data loss:** All persistence validations pass
4. **No false claims:** Ask COGNI honest positioning verified
5. **User experience:** UX integrity intact, no misleading claims
6. **Overall readiness score:** ≥85/100

### ❌ LAUNCH BLOCKED IF:

1. Any test group <75% pass rate
2. Any critical test fails
3. Governance can be bypassed
4. Data loss on any failure
5. Ask COGNI false claims remain
6. Replay is only cosmetic (not reconstructive)
7. Overall readiness score <75/100

---

**Framework Complete - Ready for Execution**

This framework provides comprehensive guidance for complete end-to-end platform validation. Execute systematically, capture evidence, and report findings without optimistic assumptions.

The goal is **REAL LAUNCH READINESS** based on **ACTUAL RUNTIME EVIDENCE**, not theoretical assumptions.

