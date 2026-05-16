Write-Host "================================================================================"
Write-Host "MANUALLY LOADING MIGRATIONS INTO CINTENT DATABASE"
Write-Host "================================================================================"
Write-Host ""

$env:PGPASSWORD = "cintent_dev_password"

Write-Host "[1] Loading migration 001_enterprise_persistence.sql"
Get-Content "./migrations/001_enterprise_persistence.sql" | docker exec -i -e PGPASSWORD=cintent_dev_password cintent-postgres psql -U cintent -d cintent
Write-Host "Migration 001 loaded"
Write-Host ""

Write-Host "[2] Loading migration 002_api_metadata_registry.sql"
Get-Content "./migrations/002_api_metadata_registry.sql" | docker exec -i -e PGPASSWORD=cintent_dev_password cintent-postgres psql -U cintent -d cintent
Write-Host "Migration 002 loaded"
Write-Host ""

Write-Host "[3] Loading migration 003_canonical_data_governance.sql"
Get-Content "./migrations/003_canonical_data_governance.sql" | docker exec -i -e PGPASSWORD=cintent_dev_password cintent-postgres psql -U cintent -d cintent
Write-Host "Migration 003 loaded"
Write-Host ""

Write-Host "[4] Loading migration 004_license_governance.sql"
Get-Content "./migrations/004_license_governance.sql" | docker exec -i -e PGPASSWORD=cintent_dev_password cintent-postgres psql -U cintent -d cintent
Write-Host "Migration 004 loaded"
Write-Host ""

Write-Host "[5] Verifying tables exist in cintent database"
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -U cintent -d cintent -c "\dt"
Write-Host ""

Write-Host "[6] Counting total tables"
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -U cintent -d cintent -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
Write-Host ""

Write-Host "================================================================================"
Write-Host "Migrations loaded. Running integrity verification..."
Write-Host "================================================================================"
Write-Host ""

.\VERIFY-INTEGRITY-FIXED.ps1
