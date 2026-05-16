Write-Host "================================================================================"
Write-Host "RESTART DOCKER STACK WITH NEW MIGRATIONS"
Write-Host "================================================================================"
Write-Host ""

Write-Host "[1] Stopping all containers..." -ForegroundColor Cyan
docker-compose down

Write-Host ""
Write-Host "[2] Removing PostgreSQL volume to reload migrations..." -ForegroundColor Cyan
docker volume rm api-cintent_postgres-data 2>$null
Write-Host "PostgreSQL data volume removed - migrations will reload on next start"

Write-Host ""
Write-Host "[3] Starting fresh PostgreSQL with all migrations..." -ForegroundColor Cyan
docker-compose up -d postgres
Write-Host "Waiting 15 seconds for PostgreSQL initialization..."
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "[4] Verifying PostgreSQL is ready..." -ForegroundColor Cyan
docker-compose ps postgres

Write-Host ""
Write-Host "[5] Checking migration logs..." -ForegroundColor Cyan
docker-compose logs postgres | Select-Object -Last 50

Write-Host ""
Write-Host "[6] Starting full stack..." -ForegroundColor Cyan
docker-compose up -d

Write-Host ""
Write-Host "[7] Waiting for all services..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "[8] Running integrity verification..." -ForegroundColor Cyan
.\VERIFY-INTEGRITY-FIXED.ps1

Write-Host ""
Write-Host "================================================================================"
Write-Host "Docker restart and verification complete"
Write-Host "================================================================================"
