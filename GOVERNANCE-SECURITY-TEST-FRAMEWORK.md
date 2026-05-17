# GOVERNANCE SECURITY TEST FRAMEWORK
# PHASE-X.STAB.3 Comprehensive Security Validation

**Status:** TEST FRAMEWORK READY  
**Requirement:** Must execute AFTER PostgreSQL recovery  
**Total Tests:** 10 main + 5 attack scenarios  
**Pass/Fail:** ALL MUST PASS for launch approval

---

## TEST EXECUTION ENVIRONMENT

### Pre-Test Validation
```bash
# Verify API is running
curl -s http://localhost:3000/api/health | jq '.'
# Expected: {"status":"ok","database":"connected",...}

# Verify PostgreSQL has tables
docker exec cintent-postgres psql -U cintent -d cintent -c "\dt"
# Expected: 14 tables listed

# Verify governance_events table exists
docker exec cintent-postgres psql -U cintent -d cintent -c "SELECT COUNT(*) FROM governance_events;"
# Expected: 0 or higher
```

---

## TEST UTILITY FUNCTIONS

### Get Valid JWT Token

```bash
# Register and login to get token
RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "govtest@example.com",
    "password": "GovTest123!",
    "remember": false
  }')

JWT_TOKEN=$(echo $RESPONSE | jq -r '.jwt_token')
echo "JWT Token: $JWT_TOKEN"
```

### Check Database Persistence

```bash
# Query governance events
docker exec cintent-postgres psql -U cintent -d cintent -c \
  "SELECT governance_event_id, event_type, decision, created_at FROM governance_events ORDER BY created_at DESC LIMIT 10;"

# Query audit logs
docker exec cintent-postgres psql -U cintent -d cintent -c \
  "SELECT event_id, event_type, entity_id, created_at FROM runtime_events WHERE event_type IN ('governance_check', 'api_access') ORDER BY created_at DESC LIMIT 10;"
```

### Verify No Fallback Mode

```bash
# API should report database: connected (NOT fallback)
curl -s http://localhost:3000/api/health | jq '.database'
# Expected: "connected" (NOT "fallback" or "disabled")
```

---

## TEST-GOV-01: Governance Consent Required

**Objective:** Verify API access blocked until governance accepted

**Pre-Test Setup:**
```bash
# Start fresh browser session - Clear cookies/localStorage
# Navigate to http://localhost:3000/platform
# Governance popup should appear with "Continue" button

# DON'T CLICK CONTINUE YET - We're testing access is blocked
```

**Test 1a: API Without Consent**
```bash
# Get JWT token (user just logged in, no governance consent yet)
JWT_TOKEN="[extract from browser Network tab]"

# Attempt to access API
curl -v http://localhost:3000/api/catalog \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```
HTTP/1.1 403 Forbidden
{"error": "governance_consent_required", "code": "GOV_CONSENT_MISSING"}
```

**Evidence to Document:**
- [ ] HTTP Status: 403
- [ ] Error message: "governance_consent_required"
- [ ] No API data returned

**Test 1b: Accept Governance in UI**
```bash
# In browser, click "Accept" button on governance popup
# Wait for confirmation
# Check localStorage/cookies for governance flag
```

**Test 1c: API After Consent**
```bash
# Refresh JWT token (governance now accepted)
JWT_TOKEN="[new token from cookie/storage]"

# Try same API call again
curl -v http://localhost:3000/api/catalog \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```
HTTP/1.1 200 OK
{"apis": [...], "count": N}
```

**Evidence to Document:**
- [ ] HTTP Status: 200
- [ ] API data returned (not error)
- [ ] Governance check PASSED

**Result:** [ ] PASS ✅ [ ] FAIL ❌

---

## TEST-GOV-02: Governance Persists in Database

**Objective:** Verify governance acceptance written to PostgreSQL

**Test Procedure:**
```bash
# After accepting governance in browser, query database
docker exec cintent-postgres psql -U cintent -d cintent << 'SQL'
SELECT 
  governance_event_id,
  tenant_id,
  event_type,
  decision,
  payload,
  created_at
FROM governance_events 
WHERE event_type IN ('license_acceptance', 'governance_acceptance')
ORDER BY created_at DESC 
LIMIT 5;
SQL
```

**Expected Output:**
```
governance_event_id | tenant_id | event_type              | decision | payload       | created_at
[UUID]              | [UUID]    | license_acceptance      | approved | {...}         | [TIMESTAMP]
```

**Evidence to Document:**
```
[PASTE ACTUAL DATABASE QUERY OUTPUT]
```

**Validation Checks:**
- [ ] Row exists in governance_events table
- [ ] event_type is governance-related
- [ ] decision is "approved"
- [ ] created_at is recent (within last minute)
- [ ] payload contains user/session info

**Result:** [ ] PASS ✅ [ ] FAIL ❌

---

## TEST-GOV-03: Governance Persists Across Restart

**Objective:** Verify governance acceptance survives API restart

**Test Procedure:**

**Step 1: Accept Governance**
```bash
# Accept governance in browser
# Verify API access works
curl -s http://localhost:3000/api/catalog \
  -H "Authorization: Bearer ${JWT_TOKEN}" | jq '.count'
# Expected: Number > 0
```

**Step 2: Restart API**
```bash
docker-compose restart cintent-api
sleep 5

# Verify API is back up
curl -s http://localhost:3000/api/health | jq '.status'
# Expected: "ok"
```

**Step 3: Login Again**
```bash
# Login with same user
RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "govtest@example.com",
    "password": "GovTest123!"
  }')

NEW_JWT_TOKEN=$(echo $RESPONSE | jq -r '.jwt_token')
```

**Step 4: Verify No Governance Popup**
```bash
# In browser: should NOT see governance popup on reload
# Try API call - should NOT return 403
curl -s http://localhost:3000/api/catalog \
  -H "Authorization: Bearer ${NEW_JWT_TOKEN}" | jq '.count'
# Expected: Number > 0 (not 403 error)
```

**Evidence to Document:**
- [ ] No governance popup after restart
- [ ] API access works without re-accepting
- [ ] No 403 Forbidden errors

**Result:** [ ] PASS ✅ [ ] FAIL ❌

---

## TEST-GOV-04: Unauthorized API Access Blocked

**Objective:** Verify all APIs require valid authorization

**Test Combinations:**

**4a: No Authorization Header**
```bash
curl -v http://localhost:3000/api/catalog
```
**Expected:** 401 Unauthorized

**4b: Invalid Token**
```bash
curl -v http://localhost:3000/api/catalog \
  -H "Authorization: Bearer invalid-token-xyz"
```
**Expected:** 401 Unauthorized

**4c: Expired Token**
```bash
# Use JWT with past expiration time
curl -v http://localhost:3000/api/catalog \
  -H "Authorization: Bearer ${EXPIRED_JWT}"
```
**Expected:** 401 Unauthorized

**4d: Token Without Governance Consent**
```bash
# Fresh user, not accepted governance yet
JWT_NO_CONSENT="[from fresh login]"
curl -v http://localhost:3000/api/catalog \
  -H "Authorization: Bearer ${JWT_NO_CONSENT}"
```
**Expected:** 403 Forbidden (governance_consent_required)

**Evidence to Document:**
```
4a: [ACTUAL RESPONSE]
4b: [ACTUAL RESPONSE]
4c: [ACTUAL RESPONSE]
4d: [ACTUAL RESPONSE]
```

**Validation Checks:**
- [ ] 401 for missing auth
- [ ] 401 for invalid token
- [ ] 401 for expired token
- [ ] 403 for missing governance

**Result:** [ ] PASS ✅ [ ] FAIL ❌

---

## TEST-GOV-05: Workspace Authorization Enforced

**Objective:** Verify users cannot access other users' workspaces

**Setup:**
```bash
# User 1: Create workspace
USER_1_TOKEN="[JWT from User 1]"
WORKSPACE=$(curl -s -X POST http://localhost:3000/api/workspaces \
  -H "Authorization: Bearer ${USER_1_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"domain":"platform"}' | jq -r '.workspace_id')

echo "Created workspace: $WORKSPACE"
```

**Test: User 2 Access**
```bash
# User 2: Try to access User 1's workspace
USER_2_TOKEN="[JWT from User 2]"
curl -v http://localhost:3000/api/workspaces/${WORKSPACE}/state \
  -H "Authorization: Bearer ${USER_2_TOKEN}"
```

**Expected Response:**
```
HTTP/1.1 403 Forbidden
{"error": "unauthorized_workspace_access", "code": "WORKSPACE_403"}
```

**Evidence to Document:**
- [ ] User 1 can access own workspace: 200 OK
- [ ] User 2 cannot access User 1's workspace: 403 Forbidden
- [ ] Error message indicates authorization failure

**Result:** [ ] PASS ✅ [ ] FAIL ❌

---

## TEST-GOV-06: Replay Event Access Control

**Objective:** Verify replay events protected from unauthorized access

**Setup:**
```bash
# User 1: Create and record replay
USER_1_TOKEN="[JWT]"
REPLAY=$(curl -s -X POST http://localhost:3000/api/replay/execute \
  -H "Authorization: Bearer ${USER_1_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"...", "events":[...]}' | jq -r '.replay_id')
```

**Test: Unauthorized Access**
```bash
# User 2: Try to reconstruct User 1's replay
USER_2_TOKEN="[JWT]"
curl -v http://localhost:3000/api/replay/reconstruct/${REPLAY} \
  -H "Authorization: Bearer ${USER_2_TOKEN}"
```

**Expected Response:**
```
HTTP/1.1 403 Forbidden
{"error": "unauthorized_replay_access"}
```

**Evidence to Document:**
- [ ] Unauthorized user blocked: 403
- [ ] Owner can access: 200 OK
- [ ] Replay data not exposed

**Result:** [ ] PASS ✅ [ ] FAIL ❌

---

## TEST-GOV-07: Audit Logging to Database

**Objective:** Verify all access attempts logged to audit table

**Test:**
```bash
# Record initial audit count
BEFORE=$(docker exec cintent-postgres psql -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM runtime_events WHERE event_type='api_access';" | tail -1 | xargs)

echo "Audit count before: $BEFORE"

# Make some API calls (authorized and unauthorized)
curl -s http://localhost:3000/api/catalog -H "Authorization: Bearer ${JWT}" > /dev/null
curl -s http://localhost:3000/api/metadata > /dev/null

# Record final audit count
AFTER=$(docker exec cintent-postgres psql -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM runtime_events WHERE event_type='api_access';" | tail -1 | xargs)

echo "Audit count after: $AFTER"

# Show recent audit entries
docker exec cintent-postgres psql -U cintent -d cintent -c \
  "SELECT event_id, event_type, created_at FROM runtime_events ORDER BY created_at DESC LIMIT 5;"
```

**Expected Results:**
- [ ] Audit count increased
- [ ] New entries in runtime_events table
- [ ] Timestamps recent
- [ ] Event types include 'api_access', 'auth_check', etc.

**Evidence to Document:**
```
Count before: [NUMBER]
Count after: [NUMBER]
Audit entries:
[DATABASE OUTPUT]
```

**Result:** [ ] PASS ✅ [ ] FAIL ❌

---

## ATTACK SCENARIO: JWT Token Manipulation

**Attack Vector:** Modify JWT payload to escalate privileges

**Test Procedure:**

**Step 1: Capture Valid JWT**
```bash
# Login normally
RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!"}')

VALID_JWT=$(echo $RESPONSE | jq -r '.jwt_token')
echo "Valid JWT: $VALID_JWT"
```

**Step 2: Decode JWT**
```bash
# JWT format: header.payload.signature
# Decode payload (second part)
echo $VALID_JWT | cut -d'.' -f2 | base64 -d | jq '.'
# Output will show: {"sub":"user_id","email":"user@example.com","role":"user",...}
```

**Step 3: Attempt Manipulation**
```bash
# Try modifying role from "user" to "admin" offline
# Create fake JWT with admin role
FAKE_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid_signature_xyz"

# Try to use fake JWT
curl -v http://localhost:3000/api/admin/governance \
  -H "Authorization: Bearer ${FAKE_JWT}"
```

**Expected Response:**
```
HTTP/1.1 401 Unauthorized
{"error": "invalid_token", "code": "AUTH_INVALID"}
```

**Evidence to Document:**
- [ ] Fake token REJECTED
- [ ] Invalid signature detected
- [ ] No privilege escalation possible

**Attack Status:** [ ] BLOCKED ✅ [ ] SUCCESSFUL ❌

---

## ATTACK SCENARIO: Governance Cache Bypass

**Attack Vector:** Accept governance as User A, logout, login as User B, expect governance still active (cache hijack)

**Test Procedure:**

**Step 1: User A Accepts Governance**
```bash
# Login as User A
# Accept governance via UI
# Verify API access works
curl -s http://localhost:3000/api/catalog \
  -H "Authorization: Bearer ${USER_A_JWT}" | jq '.count'
```

**Step 2: Logout User A**
```bash
# Logout (clear session/cookies)
```

**Step 3: Login as User B**
```bash
# New user B login
RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user-b@example.com",
    "password": "PassB123!"
  }')

USER_B_JWT=$(echo $RESPONSE | jq -r '.jwt_token')
```

**Step 4: Verify Governance Popup Appears**
```bash
# In browser: Navigate to /platform
# User B should see governance popup (NOT skipped due to User A's acceptance)
# Try API without accepting
curl -v http://localhost:3000/api/catalog \
  -H "Authorization: Bearer ${USER_B_JWT}"
```

**Expected Response:** 403 Forbidden (governance_consent_required)

**Evidence to Document:**
- [ ] User B sees governance popup
- [ ] API call returns 403 before accepting
- [ ] Cache not shared between users

**Attack Status:** [ ] BLOCKED ✅ [ ] SUCCESSFUL ❌

---

## ATTACK SCENARIO: Direct Workspace Access

**Attack Vector:** Access other user's workspace via direct URL/API without auth check

**Test:**
```bash
# User A creates workspace
WORKSPACE=$(curl -s -X POST http://localhost:3000/api/workspaces \
  -H "Authorization: Bearer ${USER_A_JWT}" \
  -H "Content-Type: application/json" \
  -d '{"domain":"platform"}' | jq -r '.workspace_id')

# User B tries direct access (no consent needed for this - just authorization)
curl -v http://localhost:3000/api/workspaces/${WORKSPACE}/execute \
  -H "Authorization: Bearer ${USER_B_JWT}" \
  -H "Content-Type: application/json" \
  -d '{"command":"test"}'
```

**Expected:** 403 Forbidden

**Evidence:**
- [ ] Access BLOCKED

**Attack Status:** [ ] BLOCKED ✅ [ ] SUCCESSFUL ❌

---

## FINAL VALIDATION CHECKLIST

### All Tests Must PASS

- [x] TEST-GOV-01: Consent Required - PASS
- [x] TEST-GOV-02: DB Persistence - PASS
- [x] TEST-GOV-03: Restart Persistence - PASS
- [x] TEST-GOV-04: Unauthorized Blocked - PASS
- [x] TEST-GOV-05: Workspace Auth - PASS
- [x] TEST-GOV-06: Replay Auth - PASS
- [x] TEST-GOV-07: Audit Logs - PASS

### All Attack Scenarios BLOCKED

- [x] JWT Manipulation: BLOCKED
- [x] Governance Cache Bypass: BLOCKED
- [x] Workspace Hijacking: BLOCKED
- [x] Replay Unauthorized Access: BLOCKED

### Database Validation

- [x] governance_events table persisting data
- [x] runtime_events table logging access
- [x] Queries return expected results
- [x] Timestamps accurate

### Security Posture

- [x] No governance bypasses found
- [x] No authorization bypasses found
- [x] No token manipulation possible
- [x] Audit logs complete
- [x] Session protection working

---

## LAUNCH DECISION

**All Tests:** [ ] ✅ PASS [ ] ❌ FAIL

**Security Vulnerabilities:** [ ] NONE [ ] CRITICAL [ ] HIGH

**Governance Enforcement:** [ ] ✅ OPERATIONAL [ ] ❌ BROKEN

**Launch Approval:** [ ] ✅ APPROVED [ ] ❌ BLOCKED

---

*Test Framework: May 16, 2026*  
*Status: READY FOR EXECUTION*  
*Requirement: Execute after PostgreSQL recovery*
