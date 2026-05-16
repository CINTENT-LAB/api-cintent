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
            Write-Host "[FAIL] $Name - Check returned false" -ForegroundColor Red
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
Write-Host "PHASE-X.10 RUNTIME INTEGRITY VERIFICATION - FIXED"
Write-Host "=================================================================================="
Write-Host ""

Write-Host "SECTION 1: DOCKER CONTAINERS"
Write-Host "=================================================================================="

Test-Item "PostgreSQL container exists and running" {
    $container = docker-compose ps -q postgres 2>$null
    if ($container) {
        $status = docker inspect --format='{{.State.Running}}' $container 2>$null
        return ($status -eq "true")
    }
    return $false
}

Test-Item "Redis container exists and running" {
    $container = docker-compose ps -q redis 2>$null
    if ($container) {
        $status = docker inspect --format='{{.State.Running}}' $container 2>$null
        return ($status -eq "true")
    }
    return $false
}

Test-Item "cintent-api container exists and running" {
    $container = docker-compose ps -q cintent-api 2>$null
    if ($container) {
        $status = docker inspect --format='{{.State.Running}}' $container 2>$null
        return ($status -eq "true")
    }
    return $false
}

Write-Host ""
Write-Host "SECTION 2: POSTGRESQL CORE OPERATIONS"
Write-Host "=================================================================================="

Test-Item "PostgreSQL accepts connections" {
    try {
        $result = docker exec cintent-postgres psql -U cintent -d cintent -c "SELECT 1;" 2>$null
        return ($result -match "1")
    }
    catch { return $false }
}

Test-Item "pgvector extension installed" {
    try {
        $result = docker exec cintent-postgres psql -U cintent -d cintent -c "SELECT extname FROM pg_extension WHERE extname='vector';" 2>$null
        return ($result -match "vector")
    }
    catch { return $false }
}

Write-Host ""
Write-Host "SECTION 3: CRITICAL TABLES EXIST"
Write-Host "=================================================================================="

Test-Item "Table: api_metadata exists" {
    try {
        $result = docker exec cintent-postgres psql -U cintent -d cintent -c "\dt api_metadata" 2>$null
        return ($result -match "api_metadata")
    }
    catch { return $false }
}

Test-Item "Table: api_categories exists" {
    try {
        $result = docker exec cintent-postgres psql -U cintent -d cintent -c "\dt api_categories" 2>$null
        return ($result -match "api_categories")
    }
    catch { return $false }
}

Test-Item "Table: user_subscriptions exists" {
    try {
        $result = docker exec cintent-postgres psql -U cintent -d cintent -c "\dt user_subscriptions" 2>$null
        return ($result -match "user_subscriptions")
    }
    catch { return $false }
}

Test-Item "Table: users exists" {
    try {
        $result = docker exec cintent-postgres psql -U cintent -d cintent -c "\dt users" 2>$null
        return ($result -match "users")
    }
    catch { return $false }
}

Test-Item "Table: user_api_access exists" {
    try {
        $result = docker exec cintent-postgres psql -U cintent -d cintent -c "\dt user_api_access" 2>$null
        return ($result -match "user_api_access")
    }
    catch { return $false }
}

Test-Item "Table: api_executions exists" {
    try {
        $result = docker exec cintent-postgres psql -U cintent -d cintent -c "\dt api_executions" 2>$null
        return ($result -match "api_executions")
    }
    catch { return $false }
}

Test-Item "Table: cogni_knowledge_base exists" {
    try {
        $result = docker exec cintent-postgres psql -U cintent -d cintent -c "\dt cogni_knowledge_base" 2>$null
        return ($result -match "cogni_knowledge_base")
    }
    catch { return $false }
}

Test-Item "Table: audit_logs exists" {
    try {
        $result = docker exec cintent-postgres psql -U cintent -d cintent -c "\dt audit_logs" 2>$null
        return ($result -match "audit_logs")
    }
    catch { return $false }
}

Test-Item "Table: replay_events exists" {
    try {
        $result = docker exec cintent-postgres psql -U cintent -d cintent -c "\dt replay_events" 2>$null
        return ($result -match "replay_events")
    }
    catch { return $false }
}

Test-Item "Table: governance_policies exists" {
    try {
        $result = docker exec cintent-postgres psql -U cintent -d cintent -c "\dt governance_policies" 2>$null
        return ($result -match "governance_policies")
    }
    catch { return $false }
}

Write-Host ""
Write-Host "SECTION 4: SCHEMA INITIALIZATION DATA"
Write-Host "=================================================================================="

Test-Item "api_statuses initialized (min 5 records)" {
    try {
        $result = docker exec cintent-postgres psql -U cintent -d cintent -t -c "SELECT COUNT(*) FROM api_statuses;" 2>$null
        $count = [int]($result.Trim())
        Write-Host "  api_statuses count: $count"
        return ($count -ge 5)
    }
    catch { return $false }
}

Test-Item "api_categories initialized (min 7 records)" {
    try {
        $result = docker exec cintent-postgres psql -U cintent -d cintent -t -c "SELECT COUNT(*) FROM api_categories;" 2>$null
        $count = [int]($result.Trim())
        Write-Host "  api_categories count: $count"
        return ($count -ge 7)
    }
    catch { return $false }
}

Write-Host ""
Write-Host "SECTION 5: DATA PERSISTENCE (INSERT/SELECT)"
Write-Host "=================================================================================="

Test-Item "Write and read api_categories record" {
    try {
        $testName = "TEST-CAT-$(Get-Random)"
        $insertSQL = "INSERT INTO api_categories (name, description) VALUES ('$testName', 'Test category') RETURNING id;"
        $id = docker exec cintent-postgres psql -U cintent -d cintent -t -c $insertSQL 2>$null | Select-Object -First 1

        $selectSQL = "SELECT name FROM api_categories WHERE id = '$id';"
        $result = docker exec cintent-postgres psql -U cintent -d cintent -t -c $selectSQL 2>$null

        return ($result -match $testName)
    }
    catch { return $false }
}

Test-Item "Write and read user_subscriptions record" {
    try {
        $testId = [guid]::NewGuid().ToString()
        $insertSQL = "INSERT INTO user_subscriptions (id, user_id, tier, status) VALUES ('$testId'::uuid, '$testId'::uuid, 'developer', 'active') RETURNING id;"
        $result = docker exec cintent-postgres psql -U cintent -d cintent -t -c $insertSQL 2>$null

        return ($result -match $testId)
    }
    catch { return $false }
}

Write-Host ""
Write-Host "SECTION 6: REDIS OPERATIONALIZATION"
Write-Host "=================================================================================="

Test-Item "Redis responds to PING" {
    try {
        $result = docker exec cintent-redis redis-cli PING 2>$null
        return ($result -eq "PONG")
    }
    catch { return $false }
}

Test-Item "Redis SET/GET persistence" {
    try {
        $key = "test-key-$(Get-Random)"
        $value = "test-value-$(Get-Random)"

        docker exec cintent-redis redis-cli SET $key $value >$null 2>&1
        $getResult = docker exec cintent-redis redis-cli GET $key 2>$null

        return ($getResult -eq $value)
    }
    catch { return $false }
}

Test-Item "Redis TTL support" {
    try {
        $key = "ttl-key-$(Get-Random)"
        docker exec cintent-redis redis-cli SET $key "value" EX 300 >$null 2>&1
        $ttl = docker exec cintent-redis redis-cli TTL $key 2>$null

        $ttlInt = [int]($ttl.Trim())
        return ($ttlInt -gt 0 -and $ttlInt -le 300)
    }
    catch { return $false }
}

Write-Host ""
Write-Host "SECTION 7: API HEALTH"
Write-Host "=================================================================================="

Test-Item "API health endpoint responds" {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        return ($response.StatusCode -eq 200)
    }
    catch { return $false }
}

Write-Host ""
Write-Host "SECTION 8: RUNTIME LEDGER"
Write-Host "=================================================================================="

Test-Item "Runtime ledger file exists" {
    $ledger = ".cintent-runtime/runtime-ledger.jsonl"
    return (Test-Path $ledger)
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

Write-Host "DETAILED RESULTS:"
Write-Host ""
foreach ($test in $TESTS) {
    if ($test.Status -eq "PASS") {
        Write-Host "[PASS] $($test.Name)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $($test.Name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=================================================================================="

if ($FAIL -eq 0) {
    Write-Host "RESULT: ALL VERIFICATIONS PASSED" -ForegroundColor Green
    Write-Host "STATUS: RUNTIME OPERATIONAL" -ForegroundColor Green
    Write-Host "CONFIDENCE: HIGH" -ForegroundColor Green
} else {
    Write-Host "RESULT: $FAIL VERIFICATIONS FAILED" -ForegroundColor Red
    Write-Host "STATUS: RUNTIME COMPROMISED" -ForegroundColor Red
    Write-Host "ACTION: Fix failed sections before proceeding" -ForegroundColor Yellow
}

Write-Host "=================================================================================="
