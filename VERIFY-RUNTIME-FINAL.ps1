$ErrorActionPreference = "Continue"
$WarningPreference = "SilentlyContinue"

$PASS = 0
$FAIL = 0
$TESTS = @()

function Test-Item {
    param([string]$Name, [scriptblock]$Check)
    Write-Host "[TEST] $Name" -ForegroundColor Cyan
    try {
        $result = & $Check
        if ($result -eq $true) {
            Write-Host "[PASS] $Name" -ForegroundColor Green
            $script:PASS += 1
            $script:TESTS += @{Name=$Name; Status="PASS"}
            return $true
        } else {
            Write-Host "[FAIL] $Name" -ForegroundColor Red
            $script:FAIL += 1
            $script:TESTS += @{Name=$Name; Status="FAIL"}
            return $false
        }
    }
    catch {
        Write-Host "[FAIL] $Name - Exception: $_" -ForegroundColor Red
        $script:FAIL += 1
        $script:TESTS += @{Name=$Name; Status="FAIL"}
        return $false
    }
}

Write-Host ""
Write-Host "=================================================================================="
Write-Host "PHASE-X.10 RUNTIME INTEGRITY VERIFICATION - FINAL"
Write-Host "=================================================================================="
Write-Host ""

Write-Host "SECTION 1: DOCKER CONTAINERS"
Write-Host "=================================================================================="

Test-Item "PostgreSQL container running" {
    $container = docker-compose ps -q postgres
    $status = docker inspect --format='{{.State.Running}}' $container
    return ($status -eq "true")
}

Test-Item "Redis container running" {
    $container = docker-compose ps -q redis
    $status = docker inspect --format='{{.State.Running}}' $container
    return ($status -eq "true")
}

Test-Item "cintent-api container running" {
    $container = docker-compose ps -q cintent-api
    $status = docker inspect --format='{{.State.Running}}' $container
    return ($status -eq "true")
}

Write-Host ""
Write-Host "SECTION 2: POSTGRESQL CORE OPERATIONS"
Write-Host "=================================================================================="

Test-Item "PostgreSQL accepts connections" {
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT 1;" 2>&1
    return ($result -match "1")
}

Test-Item "pgvector extension installed" {
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT extname FROM pg_extension WHERE extname='vector';" 2>&1
    return ($result -match "vector")
}

Write-Host ""
Write-Host "SECTION 3: CRITICAL TABLES EXIST"
Write-Host "=================================================================================="

Test-Item "Table: api_metadata exists" {
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT 1 FROM information_schema.tables WHERE table_name='api_metadata';" 2>&1
    return ($result -match "1")
}

Test-Item "Table: api_categories exists" {
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT 1 FROM information_schema.tables WHERE table_name='api_categories';" 2>&1
    return ($result -match "1")
}

Test-Item "Table: user_subscriptions exists" {
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT 1 FROM information_schema.tables WHERE table_name='user_subscriptions';" 2>&1
    return ($result -match "1")
}

Test-Item "Table: users exists" {
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT 1 FROM information_schema.tables WHERE table_name='users';" 2>&1
    return ($result -match "1")
}

Test-Item "Table: user_api_access exists" {
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT 1 FROM information_schema.tables WHERE table_name='user_api_access';" 2>&1
    return ($result -match "1")
}

Test-Item "Table: api_executions exists" {
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT 1 FROM information_schema.tables WHERE table_name='api_executions';" 2>&1
    return ($result -match "1")
}

Test-Item "Table: cogni_knowledge_base exists" {
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT 1 FROM information_schema.tables WHERE table_name='cogni_knowledge_base';" 2>&1
    return ($result -match "1")
}

Test-Item "Table: audit_logs exists" {
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT 1 FROM information_schema.tables WHERE table_name='audit_logs';" 2>&1
    return ($result -match "1")
}

Test-Item "Table: replay_events exists" {
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT 1 FROM information_schema.tables WHERE table_name='replay_events';" 2>&1
    return ($result -match "1")
}

Test-Item "Table: governance_policies exists" {
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT 1 FROM information_schema.tables WHERE table_name='governance_policies';" 2>&1
    return ($result -match "1")
}

Write-Host ""
Write-Host "SECTION 4: SCHEMA INITIALIZATION DATA"
Write-Host "=================================================================================="

Test-Item "api_statuses initialized (min 5 records)" {
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT COUNT(*) FROM api_statuses;" 2>&1
    $count = [int]($result.Trim())
    Write-Host "  api_statuses: $count records"
    return ($count -ge 5)
}

Test-Item "api_categories initialized (min 7 records)" {
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT COUNT(*) FROM api_categories;" 2>&1
    $count = [int]($result.Trim())
    Write-Host "  api_categories: $count records"
    return ($count -ge 7)
}

Write-Host ""
Write-Host "SECTION 5: DATA PERSISTENCE (INSERT/SELECT)"
Write-Host "=================================================================================="

Test-Item "Write and read api_categories record" {
    $testName = "TEST-$(Get-Random)"
    docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -c "INSERT INTO api_categories (name, description) VALUES ('$testName', 'Test');" 2>&1 | Out-Null
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT name FROM api_categories WHERE name='$testName';" 2>&1
    return ($result -match $testName)
}

Test-Item "Write and read user_subscriptions record" {
    $testId = [guid]::NewGuid().ToString()
    docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -c "INSERT INTO user_subscriptions (id, user_id, tier, status) VALUES ('$testId'::uuid, '$testId'::uuid, 'dev', 'active');" 2>&1 | Out-Null
    $result = docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -t -c "SELECT COUNT(*) FROM user_subscriptions WHERE id='$testId'::uuid;" 2>&1
    return ($result -match "1")
}

Write-Host ""
Write-Host "SECTION 6: REDIS OPERATIONALIZATION"
Write-Host "=================================================================================="

Test-Item "Redis responds to PING" {
    $result = docker exec cintent-redis redis-cli PING 2>&1
    return ($result -eq "PONG")
}

Test-Item "Redis SET/GET persistence" {
    $key = "test-$(Get-Random)"
    docker exec cintent-redis redis-cli SET $key "value" >$null 2>&1
    $result = docker exec cintent-redis redis-cli GET $key 2>&1
    return ($result -eq "value")
}

Test-Item "Redis TTL support" {
    $key = "ttl-$(Get-Random)"
    docker exec cintent-redis redis-cli SET $key "val" EX 300 >$null 2>&1
    $ttl = docker exec cintent-redis redis-cli TTL $key 2>&1
    $ttlInt = [int]($ttl)
    return ($ttlInt -gt 0 -and $ttlInt -le 300)
}

Write-Host ""
Write-Host "SECTION 7: API HEALTH"
Write-Host "=================================================================================="

Test-Item "API health endpoint responds" {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5
        return ($response.StatusCode -eq 200)
    }
    catch { return $false }
}

Write-Host ""
Write-Host "SECTION 8: RUNTIME LEDGER"
Write-Host "=================================================================================="

Test-Item "Runtime ledger file exists" {
    return (Test-Path ".cintent-runtime/runtime-ledger.jsonl")
}

Write-Host ""
Write-Host "=================================================================================="
Write-Host "VERIFICATION SUMMARY"
Write-Host "=================================================================================="
Write-Host ""
Write-Host "Total Tests:  $($TESTS.Count)"
Write-Host "Passed:       $PASS" -ForegroundColor Green
Write-Host "Failed:       $FAIL" -ForegroundColor $(if ($FAIL -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($FAIL -gt 0) {
    Write-Host "FAILED TESTS:"
    foreach ($test in $TESTS | Where-Object {$_.Status -eq "FAIL"}) {
        Write-Host "[FAIL] $($test.Name)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "=================================================================================="

if ($FAIL -eq 0) {
    Write-Host "RESULT: ALL VERIFICATIONS PASSED" -ForegroundColor Green
    Write-Host "STATUS: RUNTIME OPERATIONAL" -ForegroundColor Green
    Write-Host "CONFIDENCE: VERIFIED" -ForegroundColor Green
} else {
    Write-Host "RESULT: $FAIL VERIFICATIONS FAILED" -ForegroundColor Red
    Write-Host "STATUS: RUNTIME COMPROMISED" -ForegroundColor Red
}

Write-Host "=================================================================================="
