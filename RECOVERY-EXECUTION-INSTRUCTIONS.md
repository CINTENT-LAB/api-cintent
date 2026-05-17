# POSTGRESQL RECOVERY - EXECUTION INSTRUCTIONS

**Status:** READY TO EXECUTE  
**Environment:** Requires Docker running on your machine  
**Time Required:** 15-20 minutes

---

## CRITICAL REQUIREMENT

**You MUST execute this in your Docker environment (your Windows/Mac/Linux machine with Docker installed).**

The analysis was done in a sandbox that doesn't have Docker access. The actual recovery MUST happen in your Docker environment.

---

## STEP-BY-STEP EXECUTION

### STEP 1: Verify You Have Docker

```bash
docker --version
docker-compose --version
```

**Expected:** Both commands return version numbers
**If not:** Install Docker Desktop from https://www.docker.com/products/docker-desktop

---

### STEP 2: Navigate to Project Directory

```bash
cd /path/to/api-cintent
```

Replace `/path/to/api-cintent` with your actual project path.

**Windows Example:**
```cmd
cd C:\Users\YourName\RAJA_REP\api-cintent
```

**Mac/Linux Example:**
```bash
cd ~/RAJA_REP/api-cintent
```

---

### STEP 3: Verify .env File is Correct

```bash
cat .env | grep -E "^DB_USER|^DB_NAME|^POSTGRES_PASSWORD"
```

**Must show:**
```
DB_USER=cintent
DB_NAME=cintent
POSTGRES_PASSWORD=cintent_dev_password
```

**If not correct:** Edit `.env` file manually to match above values.

---

### STEP 4: Execute Recovery Script

```bash
chmod +x EXECUTE-POSTGRESQL-RECOVERY.sh
./EXECUTE-POSTGRESQL-RECOVERY.sh 2>&1 | tee recovery-log.txt
```

**On Windows (PowerShell):**
```powershell
bash ./EXECUTE-POSTGRESQL-RECOVERY.sh 2>&1 | tee recovery-log.txt
```

---

### STEP 5: Wait for Completion

The script will execute 17 phases. This takes approximately 15-20 minutes.

**Watch for:**
- ✅ Green checkmarks (PASS)
- ❌ Red X marks (FAIL) - Stop and debug
- ⚠️  Yellow warnings - May be okay, verify output

---

### STEP 6: Review Final Summary

At the end of script execution, you'll see:

```
========== RECOVERY EXECUTION SUMMARY ==========
✅ PostgreSQL Connection: OPERATIONAL
✅ Schema Initialization: COMPLETE
✅ Persistence: VERIFIED
✅ API Server: OPERATIONAL
✅ Runtime: RECOVERY COMPLETE
============================================
```

**If you see all ✅:** RECOVERY SUCCESSFUL

**If you see any ❌:** Recovery failed, see troubleshooting section below.

---

### STEP 7: Fill Out Execution Report

```bash
cat recovery-log.txt
```

Copy the output and fill in `POSTGRESQL-RECOVERY-EXECUTION-REPORT.md` with:
- All test results
- Actual database output
- Any errors encountered
- Final status

---

## MANUAL VERIFICATION (If Script Fails)

If the script encounters issues, run these commands manually to debug:

### Test 1: PostgreSQL Connection

```bash
docker exec cintent-postgres psql -U cintent -d cintent -c "SELECT version();"
```

**Expected:** PostgreSQL version output

**If fails:** PostgreSQL not running or credentials wrong

---

### Test 2: List Tables

```bash
docker exec cintent-postgres psql -U cintent -d cintent -c "\dt"
```

**Expected:** 14 tables listed

**If shows no tables:** Migrations didn't execute

---

### Test 3: Test Data Insertion

```bash
docker exec cintent-postgres psql -U cintent -d cintent << 'SQL'
INSERT INTO tenants VALUES ('test', 'Test', 'demo', 'active', '{}', now(), now());
INSERT INTO users VALUES ('test-user', 'test', 'test@test.com', 'Test', 'viewer', NULL, false, '{}', now(), now());
SELECT email FROM users WHERE user_id='test-user';
SQL
```

**Expected:** Returns `test@test.com`

**If fails:** Database connection working but insert failed

---

### Test 4: API Health Check

```bash
curl -s http://localhost:3000/api/health | jq '.'
```

**Expected:** JSON response with `"database": "connected"`

**If fails:** API not running or database not accessible to API

---

## TROUBLESHOOTING

### Issue: "docker: command not found"

**Solution:** Docker is not installed or not in PATH
```bash
# Install Docker Desktop: https://www.docker.com/products/docker-desktop
```

### Issue: "role 'postgres' does not exist"

**Solution:** Database credentials still wrong
```bash
# Check .env
grep "^DB_USER=" .env
# Must be: DB_USER=cintent

# Fix if wrong
echo "DB_USER=cintent" >> .env
docker-compose down postgres
docker-compose up -d postgres
sleep 15
```

### Issue: "no relations found"

**Solution:** Migrations didn't execute
```bash
# Check postgres logs
docker logs cintent-postgres | tail -50 | grep -i "error\|migration"

# If migrations failed, restart
docker-compose down postgres
docker volume rm api-cintent_postgres-data  # WARNING: Deletes data
docker-compose up -d postgres
sleep 15
```

### Issue: API health returns "database": "fallback"

**Solution:** API not connected to database despite PostgreSQL running
```bash
# Check API logs for connection errors
docker logs cintent-api | grep -i "postgres\|database\|error" | head -20

# Restart API with fresh connection
docker-compose down cintent-api
docker-compose up -d cintent-api
sleep 5
curl -s http://localhost:3000/api/health | jq '.database'
```

### Issue: Data doesn't survive restart

**Solution:** Data is still in RAM (fallback mode)
```bash
# Verify tables exist and have data
docker exec cintent-postgres psql -U cintent -d cintent -c \
  "SELECT COUNT(*) FROM users;"

# If shows 0 rows: inserts worked in RAM but not in DB
# If shows error: connection issue

# Check API connection method
grep "DATABASE_URL\|DB_HOST" .env
```

---

## EXPECTED TIMELINE

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Pre-flight checks | 30s | ⏱️  |
| 2 | Stop containers | 1m | ⏱️  |
| 3 | Start PostgreSQL | 20s | ⏱️  |
| 4 | Verify connection | 1m | ⏱️  |
| 5 | Verify users | 1m | ⏱️  |
| 6 | Verify databases | 1m | ⏱️  |
| 7 | Verify tables | 2m | ⏱️  |
| 8 | Verify extensions | 1m | ⏱️  |
| 9 | Test user insert | 2m | ⏱️  |
| 10 | Test orchestration | 2m | ⏱️  |
| 11 | Test replay | 2m | ⏱️  |
| 12 | Test governance | 2m | ⏱️  |
| 13 | Test persistence | 3m | ⏱️  |
| 14 | Verify Redis | 1m | ⏱️  |
| 15 | Start API | 10s | ⏱️  |
| 16 | Test health | 1m | ⏱️  |
| 17 | Summary | 1m | ⏱️  |
| **TOTAL** | | **~20m** | ⏱️  |

---

## SUCCESS CRITERIA

### You Have Successfully Recovered PostgreSQL If:

✅ All 14 tables exist in database  
✅ User insertion and selection works  
✅ Orchestration data persists  
✅ Replay events recorded in database  
✅ Governance events persisted  
✅ Data survives PostgreSQL restart  
✅ API health shows "database": "connected"  
✅ No "fallback" mode in API logs  
✅ First page load < 2 seconds  
✅ API responding without errors  

---

## WHAT HAPPENS NEXT

### If Recovery SUCCESSFUL ✅

1. **Database operational:** All data now persists
2. **API connected:** Using database, not RAM
3. **Ready for testing:** Run end-to-end workflows
4. **Ready for launch:** Production-safe state

### If Recovery FAILED ❌

1. **Review logs:** Check recovery-log.txt for errors
2. **Identify issue:** Use troubleshooting section
3. **Fix and retry:** Execute recovery script again
4. **Contact support:** If issues persist

---

## AFTER SUCCESSFUL RECOVERY

Once recovery completes successfully:

```bash
# 1. Run end-to-end test
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "e2e-test@example.com",
    "password": "Test123!",
    "name": "E2E Test"
  }'

# 2. Verify in database
docker exec cintent-postgres psql -U cintent -d cintent \
  -c "SELECT email FROM users WHERE email='e2e-test@example.com';"

# 3. Restart server and verify session
docker-compose restart cintent-api
sleep 5

# 4. Login and verify session persists
curl -s http://localhost:3000/api/health | jq '.database'
# Must show: "connected" (not "fallback")

# ✅ APPROVED FOR PRODUCTION LAUNCH
```

---

## CRITICAL: DO NOT SKIP

🔴 **MANDATORY:** Execute recovery before launching to production  
🔴 **MANDATORY:** Verify all 14 tables created  
🔴 **MANDATORY:** Test data persistence  
🔴 **MANDATORY:** Confirm API sees "database": "connected"  
🔴 **MANDATORY:** Fill out execution report  

---

## CONTACT & SUPPORT

**If you encounter issues:**

1. Check `EXECUTE-POSTGRESQL-RECOVERY.sh` for error messages
2. Review troubleshooting section above
3. Check `recovery-log.txt` for full output
4. Refer to `POSTGRESQL-RECOVERY-CRITICAL.md` for root cause analysis

**Expected after recovery:**
- All data persisted in database
- No more in-memory fallback mode
- Production-ready system
- Ready for enterprise launch

---

## QUICK CHECKLIST

- [ ] Docker installed and running
- [ ] In api-cintent directory
- [ ] .env has DB_USER=cintent and DB_NAME=cintent
- [ ] Executed: `./EXECUTE-POSTGRESQL-RECOVERY.sh`
- [ ] All phases completed
- [ ] All validation gates PASSED
- [ ] Filled out execution report
- [ ] Verified: `docker exec cintent-postgres psql -U cintent -d cintent -c "SELECT COUNT(*) FROM users;"`
- [ ] Verified: `curl http://localhost:3000/api/health`
- [ ] ✅ READY FOR PRODUCTION

---

*Instructions: May 16, 2026*  
*Status: READY FOR EXECUTION*  
*Next Step: Execute in your Docker environment*
