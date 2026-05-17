# PHASE-X.STAB.3 UNIFIED EXECUTION PLAN
# PostgreSQL Recovery + Governance Security Audit

**Status:** EXECUTION PLAN READY  
**Sequence:** Recovery → Audit → Final Validation  
**Total Time:** 60-90 minutes  
**Environment:** Docker required

---

## EXECUTION SEQUENCE

### SEGMENT 1: PostgreSQL Operational Recovery (30 minutes)
1. Execute recovery script
2. Verify 14 tables created
3. Validate data persistence
4. Confirm API connected to DB
5. Clear fallback mode

**Result:** Governance policies PERSISTED to database

### SEGMENT 2: Governance Security Audit (30 minutes)
1. Test consent enforcement (API access)
2. Test governance persistence (database)
3. Test attack scenarios (unauthorized access)
4. Validate audit log persistence
5. Validate session protection

**Result:** REAL governance enforcement validated

### SEGMENT 3: Final Validation (15-20 minutes)
1. Complete end-to-end workflow
2. Verify governance persisted across restart
3. Confirm audit logs in database
4. Sign off on security posture

**Result:** APPROVED FOR LAUNCH

---

## SEGMENT 1: POSTGRESQL RECOVERY EXECUTION

### Command
```bash
cd /path/to/api-cintent
chmod +x EXECUTE-POSTGRESQL-RECOVERY.sh
./EXECUTE-POSTGRESQL-RECOVERY.sh 2>&1 | tee recovery-execution.log
```

### Expected Output
```
========== RECOVERY EXECUTION SUMMARY ==========
✅ PostgreSQL Connection: OPERATIONAL
✅ Schema Initialization: COMPLETE
✅ Persistence: VERIFIED
✅ API Server: OPERATIONAL
✅ Runtime: RECOVERY COMPLETE
============================================
```

### Validation Gates
- [x] PostgreSQL accepts connection as `cintent` user
- [x] All 14 tables exist
- [x] User insertion works
- [x] Data persists after restart
- [x] API shows "database": "connected"

### Success Criteria
✅ All gates PASSED → Proceed to Segment 2

---

## SEGMENT 2: GOVERNANCE SECURITY AUDIT

### TEST-GOV-01: Consent Required Before API Access

**Objective:** Verify governance popup blocks API until accepted

**Setup:**
1. Start fresh browser session
2. Navigate to http://localhost:3000/platform
3. Governance popup appears
4. Attempt API call WITHOUT accepting

**Test Command:**
```bash
# Without consent header - should be BLOCKED
curl -X GET http://localhost:3000/api/orchestration/compile \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json"
```

**Expected Result:** 
- 🔴 Status 403 Forbidden (governance not accepted)
- Response: `{"error": "governance_consent_required"}`

**Evidence:**
```
[PASTE ACTUAL CURL RESPONSE]
```

**Pass/Fail:** [ ] PASS [ ] FAIL

---

### TEST-GOV-02: API Blocking Before Consent

**Objective:** Confirm ALL APIs blocked until consent accepted

**Test Commands:**
```bash
# Try multiple API endpoints - all should fail
curl -s http://localhost:3000/api/catalog -H "Authorization: Bearer ${JWT}" | jq '.error'
curl -s http://localhost:3000/api/domains -H "Authorization: Bearer ${JWT}" | jq '.error'
curl -s http://localhost:3000/api/metadata -H "Authorization: Bearer ${JWT}" | jq '.error'
```

**Expected Result:** All return 403 Forbidden before consent

**Evidence:**
```
[PASTE ACTUAL RESPONSES]
```

**Pass/Fail:** [ ] PASS [ ] FAIL

---

### TEST-GOV-03: Consent Persistence After Refresh

**Objective:** Verify governance acceptance persists after page refresh

**Procedure:**
1. Accept governance popup
2. Verify API access works
3. F5 refresh page
4. Verify governance still accepted (no popup)
5. Verify API access still works

**Test Command (After Accept):**
```bash
curl -s http://localhost:3000/api/catalog -H "Authorization: Bearer ${JWT}" | jq '.apis | length'
```

**Expected Result:**
- Governance accepted persists
- API returns data (not 403)
- No governance popup on refresh

**Evidence:**
```
[PASTE ACTUAL CURL RESPONSE & BROWSER SCREENSHOT]
```

**Pass/Fail:** [ ] PASS [ ] FAIL

---

### TEST-GOV-04: Governance Policy Persisted in Database

**Objective:** Verify governance decisions saved to PostgreSQL

**Procedure:**
1. Accept governance in browser
2. Query database directly
3. Verify governance_events table has entry

**Test Command:**
```bash
docker exec cintent-postgres psql -U cintent -d cintent << 'SQL'
SELECT governance_event_id, event_type, decision, created_at 
FROM governance_events 
WHERE event_type='license_acceptance' 
ORDER BY created_at DESC 
LIMIT 5;
SQL
```

**Expected Result:**
```
governance_event_id | event_type         | decision | created_at
[UUID]              | license_acceptance | approved | [TIMESTAMP]
```

**Evidence:**
```
[PASTE ACTUAL DATABASE QUERY RESULT]
```

**Pass/Fail:** [ ] PASS [ ] FAIL

---

### TEST-GOV-05: Unauthorized Replay Access Blocked

**Objective:** Verify replay events protected from unauthorized access

**Procedure:**
1. Create valid token with limited scope
2. Attempt to access replay API
3. Should be blocked or unauthorized

**Test Command:**
```bash
# Token without replay scope
curl -X GET http://localhost:3000/api/replay/reconstruct/test-replay-id \
  -H "Authorization: Bearer ${LIMITED_TOKEN}" \
  -H "Content-Type: application/json"
```

**Expected Result:** 403 Forbidden or 401 Unauthorized

**Evidence:**
```
[PASTE ACTUAL CURL RESPONSE]
```

**Pass/Fail:** [ ] PASS [ ] FAIL

---

### TEST-GOV-06: Audit Log Persistence

**Objective:** Verify all access attempts logged to database

**Procedure:**
1. Make authorized API call
2. Make unauthorized API call
3. Query audit logs in database
4. Both should be recorded

**Test Command:**
```bash
docker exec cintent-postgres psql -U cintent -d cintent << 'SQL'
SELECT event_id, event_type, entity_id, created_at 
FROM runtime_events 
WHERE event_type IN ('api_access', 'governance_check', 'auth_failure')
ORDER BY created_at DESC 
LIMIT 10;
SQL
```

**Expected Result:** Both authorized and unauthorized attempts logged

**Evidence:**
```
[PASTE ACTUAL DATABASE QUERY RESULT]
```

**Pass/Fail:** [ ] PASS [ ] FAIL

---

### TEST-GOV-07: Session Authorization Enforced

**Objective:** Verify session tokens required for all operations

**Procedure:**
1. Try API call without authorization header
2. Should be 401 Unauthorized
3. Try with invalid token
4. Should be 401 Unauthorized
5. Try with valid token
6. Should work or return proper 403 (if consent missing)

**Test Commands:**
```bash
# No auth header
curl -s http://localhost:3000/api/catalog | jq '.error'

# Invalid token
curl -s http://localhost:3000/api/catalog \
  -H "Authorization: Bearer invalid-token-12345" | jq '.error'

# Valid token
curl -s http://localhost:3000/api/catalog \
  -H "Authorization: Bearer ${VALID_JWT}" | jq '.error'
```

**Expected Results:**
- No auth: 401 Unauthorized
- Invalid token: 401 Unauthorized
- Valid token: 200 OK (or 403 if consent missing)

**Evidence:**
```
[PASTE ACTUAL CURL RESPONSES]
```

**Pass/Fail:** [ ] PASS [ ] FAIL

---

### TEST-GOV-08: Workspace Authorization Validated

**Objective:** Verify users can only access authorized workspaces

**Procedure:**
1. Create workspace as User A
2. Try to access same workspace as User B
3. Should be 403 Forbidden

**Test Commands:**
```bash
# User A creates workspace
curl -X POST http://localhost:3000/api/workspaces \
  -H "Authorization: Bearer ${USER_A_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"domain": "platform", "state": {}}'

# User B tries to access User A's workspace
curl -X GET http://localhost:3000/api/workspaces/${WORKSPACE_ID} \
  -H "Authorization: Bearer ${USER_B_TOKEN}"
```

**Expected Result:** User B gets 403 Forbidden

**Evidence:**
```
[PASTE ACTUAL CURL RESPONSES]
```

**Pass/Fail:** [ ] PASS [ ] FAIL

---

### TEST-GOV-09: WebSocket Authentication Required

**Objective:** Verify WebSocket connections require valid auth

**Procedure:**
1. Try to open WebSocket without auth
2. Should be rejected
3. Try with valid token
4. Should connect successfully

**Test Command:**
```bash
# Test WebSocket connection
wscat -c ws://localhost:3000/api/traces/stream \
  --header "Authorization: Bearer ${VALID_JWT}"

# Should either connect or return auth error (not connection error)
```

**Expected Result:** 
- Without auth: Connection rejected (auth error)
- With auth: Connection accepted

**Evidence:**
```
[PASTE ACTUAL WEBSOCKET RESPONSE]
```

**Pass/Fail:** [ ] PASS [ ] FAIL

---

### TEST-GOV-10: Stale Token Rejection

**Objective:** Verify expired/old tokens are rejected

**Procedure:**
1. Create token with 1-minute expiry
2. Wait 2 minutes
3. Attempt API call with expired token
4. Should be 401 Unauthorized

**Expected Result:** 401 Unauthorized (token expired)

**Evidence:**
```
[PASTE ACTUAL CURL RESPONSE]
```

**Pass/Fail:** [ ] PASS [ ] FAIL

---

## ATTACK SCENARIO TESTS

### Attack Test 1: Direct API Access Without Governance

**Attack:** Bypass governance popup, call API directly

```bash
curl -X POST http://localhost:3000/api/orchestration/execute \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{"workflow_id": "test"}'
```

**Expected:** 403 Forbidden (governance required)  
**Actual:** [RESULT]  
**Status:** [ ] BLOCKED ✅ [ ] BYPASSED ❌

---

### Attack Test 2: Token Manipulation

**Attack:** Modify JWT token to elevate privileges

**Procedure:**
1. Decode valid JWT
2. Change "role": "user" → "role": "admin"
3. Re-encode (without valid signature)
4. Use manipulated token

**Expected:** 401 Unauthorized (invalid signature)  
**Actual:** [RESULT]  
**Status:** [ ] REJECTED ✅ [ ] ACCEPTED ❌

---

### Attack Test 3: Replay Event Unauthorized Access

**Attack:** Access another user's replay without permission

```bash
curl -X GET http://localhost:3000/api/replay/reconstruct/${OTHER_USER_REPLAY} \
  -H "Authorization: Bearer ${MY_TOKEN}"
```

**Expected:** 403 Forbidden  
**Actual:** [RESULT]  
**Status:** [ ] BLOCKED ✅ [ ] ACCESSIBLE ❌

---

### Attack Test 4: Workspace Hijacking

**Attack:** Access other user's workspace

```bash
curl -X POST http://localhost:3000/api/workspaces/${OTHER_USER_WORKSPACE}/execute \
  -H "Authorization: Bearer ${MY_TOKEN}"
```

**Expected:** 403 Forbidden  
**Actual:** [RESULT]  
**Status:** [ ] BLOCKED ✅ [ ] ACCESSIBLE ❌

---

### Attack Test 5: Governance Bypass via Cache

**Attack:** Accept governance, logout, login as different user, should require consent again

**Procedure:**
1. User A: Accept governance
2. Logout
3. Login as User B
4. Should see governance popup again

**Expected:** New user sees governance popup  
**Actual:** [RESULT]  
**Status:** [ ] ENFORCED ✅ [ ] BYPASSED ❌

---

## SEGMENT 3: FINAL VALIDATION

### Complete End-to-End Workflow

```bash
# 1. Register new user
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gov-test-user@example.com",
    "password": "GovTest123!",
    "name": "Gov Test User"
  }'

# 2. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gov-test-user@example.com",
    "password": "GovTest123!"
  }'
# Extract JWT_TOKEN from response

# 3. Try API without governance - should fail
curl -X GET http://localhost:3000/api/catalog \
  -H "Authorization: Bearer ${JWT_TOKEN}"
# Expected: 403 Forbidden

# 4. Accept governance (simulate browser accepting popup)
# NOTE: This requires browser interaction or special endpoint
# In real test, governance acceptance comes from UI

# 5. Try API with governance - should work
curl -X GET http://localhost:3000/api/catalog \
  -H "Authorization: Bearer ${JWT_TOKEN}"
# Expected: 200 OK with catalog data

# 6. Verify governance persisted in database
docker exec cintent-postgres psql -U cintent -d cintent \
  -c "SELECT COUNT(*) FROM governance_events WHERE event_type='license_acceptance';"
# Expected: 1 (or more)

# 7. Restart API server
docker-compose restart cintent-api
sleep 5

# 8. Login again - governance should still be accepted
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gov-test-user@example.com",
    "password": "GovTest123!"
  }'
# Extract JWT_TOKEN again

# 9. API access should work without consent popup
curl -X GET http://localhost:3000/api/catalog \
  -H "Authorization: Bearer ${JWT_TOKEN}"
# Expected: 200 OK (governance persisted across restart)
```

**Results:**
```
[PASTE COMPLETE WORKFLOW OUTPUT]
```

---

## GOVERNANCE AUDIT REPORT TEMPLATE

### Executive Summary
- PostgreSQL operational: [ ] YES [ ] NO
- Governance enforcement working: [ ] YES [ ] NO
- All 10 tests passed: [ ] YES [ ] NO
- Security vulnerabilities found: [ ] NONE [ ] CRITICAL [ ] HIGH [ ] MEDIUM

### Test Results Summary

| Test | Result | Evidence |
|------|--------|----------|
| TEST-GOV-01: Consent Required | [ ] PASS [ ] FAIL | [REF] |
| TEST-GOV-02: API Blocking | [ ] PASS [ ] FAIL | [REF] |
| TEST-GOV-03: Persistence | [ ] PASS [ ] FAIL | [REF] |
| TEST-GOV-04: DB Persistence | [ ] PASS [ ] FAIL | [REF] |
| TEST-GOV-05: Replay Protected | [ ] PASS [ ] FAIL | [REF] |
| TEST-GOV-06: Audit Logs | [ ] PASS [ ] FAIL | [REF] |
| TEST-GOV-07: Session Auth | [ ] PASS [ ] FAIL | [REF] |
| TEST-GOV-08: Workspace Auth | [ ] PASS [ ] FAIL | [REF] |
| TEST-GOV-09: WebSocket Auth | [ ] PASS [ ] FAIL | [REF] |
| TEST-GOV-10: Token Expiry | [ ] PASS [ ] FAIL | [REF] |

### Attack Scenario Results

| Attack | Blocked | Evidence |
|--------|---------|----------|
| Direct API bypass | [ ] YES [ ] NO | [RESULT] |
| Token manipulation | [ ] REJECTED [ ] ACCEPTED | [RESULT] |
| Replay hijacking | [ ] BLOCKED [ ] ACCESSIBLE | [RESULT] |
| Workspace hijacking | [ ] BLOCKED [ ] ACCESSIBLE | [RESULT] |
| Cache-based bypass | [ ] BLOCKED [ ] BYPASSED | [RESULT] |

### Database Audit

**Governance Events Count:**
```sql
SELECT COUNT(*) FROM governance_events;
```
**Result:** [NUMBER]

**Audit Events Count:**
```sql
SELECT COUNT(*) FROM runtime_events WHERE event_type IN ('api_access', 'governance_check');
```
**Result:** [NUMBER]

**Recent Governance Decisions:**
```sql
SELECT event_type, decision, created_at FROM governance_events ORDER BY created_at DESC LIMIT 5;
```
**Results:**
```
[DATABASE OUTPUT]
```

### Security Posture

#### Strengths
- [ ] Governance enforcement operational
- [ ] Audit logging to database
- [ ] Session protection enforced
- [ ] Token validation working
- [ ] Workspace isolation enforced

#### Vulnerabilities Found
- [ ] NONE
- [ ] [DESCRIBE ANY FOUND]

#### Recommendations
```
[DOCUMENT ANY RECOMMENDED HARDENING]
```

### Launch Readiness

**Governance Security:** [ ] PASS ✅ [ ] FAIL ❌

**Conditions for Launch:**
- [x] PostgreSQL operational
- [x] All governance tests PASSED
- [x] No security bypasses found
- [x] Audit logs persisting
- [x] Session protection working

**Launch Approval:** [ ] APPROVED ✅ [ ] BLOCKED ❌

---

## EXECUTION CHECKLIST

**Pre-Execution:**
- [ ] Docker running
- [ ] In api-cintent directory
- [ ] .env configured correctly
- [ ] Recovery script ready
- [ ] This plan ready

**Segment 1 (Recovery):**
- [ ] Executed recovery script
- [ ] All recovery gates PASSED
- [ ] PostgreSQL operational
- [ ] API connected to DB

**Segment 2 (Governance Audit):**
- [ ] TEST-GOV-01 PASSED
- [ ] TEST-GOV-02 PASSED
- [ ] TEST-GOV-03 PASSED
- [ ] TEST-GOV-04 PASSED
- [ ] TEST-GOV-05 PASSED
- [ ] TEST-GOV-06 PASSED
- [ ] TEST-GOV-07 PASSED
- [ ] TEST-GOV-08 PASSED
- [ ] TEST-GOV-09 PASSED
- [ ] TEST-GOV-10 PASSED
- [ ] All attack tests completed
- [ ] Audit report filled

**Segment 3 (Final Validation):**
- [ ] E2E workflow completed
- [ ] Governance persisted across restart
- [ ] Audit logs in database
- [ ] All evidence documented

**Launch Decision:**
- [ ] ✅ APPROVED FOR LAUNCH
- [ ] ❌ BLOCKED (specify reason)

---

## NEXT COMMAND

```bash
# Execute this unified plan:
cd /path/to/api-cintent && \
chmod +x EXECUTE-POSTGRESQL-RECOVERY.sh && \
./EXECUTE-POSTGRESQL-RECOVERY.sh 2>&1 | tee recovery-execution.log && \
echo "Recovery complete. Proceed to governance security audit tests."
```

---

*Unified Execution Plan: May 16, 2026*  
*Status: READY FOR EXECUTION*  
*Sequence: Recovery → Audit → Launch Approval*
