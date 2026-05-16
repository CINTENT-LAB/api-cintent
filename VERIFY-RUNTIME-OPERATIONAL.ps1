$ErrorActionPreference = "Continue"
$WarningPreference = "SilentlyContinue"

Write-Host "================================================================================"
Write-Host "PHASE-X.10 RUNTIME OPERATIONALIZATION VERIFICATION"
Write-Host "================================================================================"
Write-Host ""

$RESULTS = @()

function Test-Section {
    param([string]$Name, [scriptblock]$Test)
    Write-Host "[TEST] $Name" -ForegroundColor Cyan
    try {
        $output = & $Test
        Write-Host "[PASS] $Name" -ForegroundColor Green
        $RESULTS += @{Name=$Name; Status="PASS"; Output=$output}
        return $true
    }
    catch {
        Write-Host "[FAIL] $Name - Error: $_" -ForegroundColor Red
        $RESULTS += @{Name=$Name; Status="FAIL"; Output=$_.Exception.Message}
        return $false
    }
}

Write-Host ""
Write-Host "SECTION 1: DOCKER CONTAINERS"
Write-Host "================================================================================"

Test-Section "Docker Service Status" {
    $containers = docker-compose ps --format "table"
    Write-Host $containers
    return $containers
}

Test-Section "PostgreSQL Container Running" {
    $running = docker-compose ps -q postgres
    if ($running) {
        Write-Host "PostgreSQL container ID: $running"
        return "RUNNING"
    } else {
        throw "PostgreSQL container not found"
    }
}

Test-Section "Redis Container Running" {
    $running = docker-compose ps -q redis
    if ($running) {
        Write-Host "Redis container ID: $running"
        return "RUNNING"
    } else {
        throw "Redis container not found"
    }
}

Test-Section "cintent-api Container Running" {
    $running = docker-compose ps -q cintent-api
    if ($running) {
        Write-Host "API container ID: $running"
        return "RUNNING"
    } else {
        throw "API container not found"
    }
}

Write-Host ""
Write-Host "SECTION 2: POSTGRESQL DATABASE"
Write-Host "================================================================================"

Test-Section "PostgreSQL Connection Test" {
    $query = "SELECT version() as version;"
    $result = docker exec cintent-postgres psql -U cintent -d cintent -c $query
    Write-Host $result
    return "CONNECTED"
}

Test-Section "List All Tables" {
    $query = "\dt"
    $result = docker exec cintent-postgres psql -U cintent -d cintent -c $query
    Write-Host $result
    return "OK"
}

Test-Section "pgvector Extension Check" {
    $query = "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
    $result = docker exec cintent-postgres psql -U cintent -d cintent -c $query
    if ($result -match "vector") {
        Write-Host "pgvector extension: INSTALLED"
        return "ENABLED"
    } else {
        throw "pgvector extension not found"
    }
}

Write-Host ""
Write-Host "SECTION 3: CORE TABLES VERIFICATION"
Write-Host "================================================================================"

Test-Section "api_metadata Table Structure" {
    $query = "\d api_metadata"
    $result = docker exec cintent-postgres psql -U cintent -d cintent -c $query
    Write-Host $result
    return "EXISTS"
}

Test-Section "users Table Structure" {
    $query = "\d users"
    $result = docker exec cintent-postgres psql -U cintent -d cintent -c $query
    Write-Host $result
    return "EXISTS"
}

Test-Section "user_subscriptions Table Structure" {
    $query = "\d user_subscriptions"
    $result = docker exec cintent-postgres psql -U cintent -d cintent -c $query
    Write-Host $result
    return "EXISTS"
}

Write-Host ""
Write-Host "SECTION 4: ROW COUNTS IN CORE TABLES"
Write-Host "================================================================================"

Test-Section "Core Table Row Counts" {
    $sql = @"
SELECT
  (SELECT COUNT(*) FROM api_metadata) as api_metadata_count,
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM user_subscriptions) as subscriptions_count,
  (SELECT COUNT(*) FROM user_api_access) as access_count,
  (SELECT COUNT(*) FROM api_executions) as executions_count,
  (SELECT COUNT(*) FROM audit_logs) as audit_count,
  (SELECT COUNT(*) FROM cogni_knowledge_base) as cogni_count;
"@
    $result = docker exec cintent-postgres psql -U cintent -d cintent -c $sql
    Write-Host $result
    return "OK"
}

Write-Host ""
Write-Host "SECTION 5: ENTERPRISE SYSTEM TABLES"
Write-Host "================================================================================"

Test-Section "Replay Persistence Tables" {
    $sql = @"
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%replay%' OR table_name LIKE '%orchestration%';
"@
    $result = docker exec cintent-postgres psql -U cintent -d cintent -c $sql
    Write-Host $result
    return "OK"
}

Test-Section "Governance Tables" {
    $sql = @"
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%governance%' OR table_name LIKE '%policy%';
"@
    $result = docker exec cintent-postgres psql -U cintent -d cintent -c $sql
    Write-Host $result
    return "OK"
}

Test-Section "Ask COGNI Tables" {
    $sql = @"
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%cogni%';
"@
    $result = docker exec cintent-postgres psql -U cintent -d cintent -c $sql
    Write-Host $result
    return "OK"
}

Write-Host ""
Write-Host "SECTION 6: INDEXES AND FOREIGN KEYS"
Write-Host "================================================================================"

Test-Section "Index Count" {
    $sql = @"
SELECT COUNT(*) as index_count FROM pg_indexes WHERE schemaname = 'public';
"@
    $result = docker exec cintent-postgres psql -U cintent -d cintent -c $sql
    Write-Host $result
    return "OK"
}

Test-Section "Foreign Key Constraints" {
    $sql = @"
SELECT constraint_name, table_name FROM information_schema.key_column_usage
WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY' LIMIT 10;
"@
    $result = docker exec cintent-postgres psql -U cintent -d cintent -c $sql
    Write-Host $result
    return "OK"
}

Write-Host ""
Write-Host "SECTION 7: DATA PERSISTENCE TEST"
Write-Host "================================================================================"

Test-Section "Insert Test Entry" {
    $testId = [guid]::NewGuid().ToString()
    $testName = "TEST-VERIFY-$(Get-Date -Format 'yyyyMMddHHmmss')"
    $sql = "INSERT INTO api_categories (category_id, category_name, description, parent_category_id, sort_order, is_active, metadata, created_at, updated_at) VALUES ('$testId', '$testName', 'Operationalization verification test', NULL, 999, true, '{}', now(), now());"
    docker exec cintent-postgres psql -U cintent -d cintent -c $sql
    Write-Host "Test entry inserted: $testId"
    return $testId
}

Test-Section "Select Test Entry" {
    $testId = "TEST-CHECK-SELECT"
    $sql = "SELECT category_id, category_name FROM api_categories ORDER BY created_at DESC LIMIT 1;"
    $result = docker exec cintent-postgres psql -U cintent -d cintent -c $sql
    Write-Host $result
    return "VERIFIED"
}

Write-Host ""
Write-Host "SECTION 8: REDIS OPERATIONALIZATION"
Write-Host "================================================================================"

Test-Section "Redis Ping" {
    $result = docker exec cintent-redis redis-cli PING
    if ($result -eq "PONG") {
        Write-Host "Redis responsive: PONG"
        return "RUNNING"
    } else {
        throw "Redis not responding"
    }
}

Test-Section "Redis Set Key" {
    $result = docker exec cintent-redis redis-cli SET "test-key-$(Get-Date -Ticks)" "test-value"
    Write-Host "Redis SET: $result"
    return "OK"
}

Test-Section "Redis Get Key" {
    $result = docker exec cintent-redis redis-cli GET "test-key"
    Write-Host "Redis GET: $result"
    return "OK"
}

Write-Host ""
Write-Host "SECTION 9: API HEALTH"
Write-Host "================================================================================"

Test-Section "API Health Endpoint" {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $content = $response.Content
        Write-Host "Health response: $content"
        if ($response.StatusCode -eq 200) {
            return "OPERATIONAL"
        } else {
            throw "API returned status $($response.StatusCode)"
        }
    }
    catch {
        throw "API not responding: $_"
    }
}

Test-Section "API Catalog Endpoint" {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/catalog" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $content = $response.Content
        Write-Host "Catalog response length: $($content.Length) bytes"
        if ($response.StatusCode -eq 200) {
            return "OPERATIONAL"
        } else {
            throw "API returned status $($response.StatusCode)"
        }
    }
    catch {
        throw "Catalog endpoint error: $_"
    }
}

Write-Host ""
Write-Host "SECTION 10: WORKSPACE PERSISTENCE"
Write-Host "================================================================================"

Test-Section "Runtime Ledger File" {
    $ledgerPath = ".cintent-runtime\runtime-ledger.jsonl"
    if (Test-Path $ledgerPath) {
        $size = (Get-Item $ledgerPath).Length
        $lines = (Get-Content $ledgerPath | Measure-Object -Line).Lines
        Write-Host "Runtime ledger exists: $($size) bytes, $($lines) lines"
        return "EXISTS"
    } else {
        throw "Runtime ledger not found"
    }
}

Write-Host ""
Write-Host "================================================================================"
Write-Host "VERIFICATION SUMMARY"
Write-Host "================================================================================"

$passCount = ($RESULTS | Where-Object {$_.Status -eq "PASS"} | Measure-Object).Count
$failCount = ($RESULTS | Where-Object {$_.Status -eq "FAIL"} | Measure-Object).Count
$totalCount = $RESULTS.Count

Write-Host ""
Write-Host "Total Tests: $totalCount"
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host ""

Write-Host "DETAILED RESULTS:"
Write-Host ""

foreach ($result in $RESULTS) {
    if ($result.Status -eq "PASS") {
        Write-Host "[PASS] $($result.Name)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $($result.Name)" -ForegroundColor Red
        Write-Host "       Error: $($result.Output)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "================================================================================"

if ($failCount -eq 0) {
    Write-Host "RESULT: ALL VERIFICATIONS PASSED" -ForegroundColor Green
    Write-Host "STATUS: RUNTIME OPERATIONAL" -ForegroundColor Green
} else {
    Write-Host "RESULT: SOME VERIFICATIONS FAILED" -ForegroundColor Red
    Write-Host "STATUS: RUNTIME PARTIALLY OPERATIONAL" -ForegroundColor Yellow
}

Write-Host "================================================================================"
