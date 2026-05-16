Write-Host "================================================================================"
Write-Host "POSTGRESQL CONNECTION DIAGNOSTICS"
Write-Host "================================================================================"
Write-Host ""

Write-Host "[1] Container status"
docker-compose ps postgres
Write-Host ""

Write-Host "[2] Container logs (last 30 lines)"
docker-compose logs postgres | Select-Object -Last 30
Write-Host ""

Write-Host "[3] Test raw psql connection with explicit password"
$env:PGPASSWORD="cintent_dev_password"
Write-Host "Attempting: psql -h localhost -U cintent -d cintent -c 'SELECT 1;'"
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d cintent -c "SELECT 1;"
Write-Host ""

Write-Host "[4] List all databases"
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -c "\l"
Write-Host ""

Write-Host "[5] Check if cintent database exists"
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d postgres -c "\l" | Select-Object -Last 20
Write-Host ""

Write-Host "[6] Direct test without -d parameter"
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -c "SELECT version();"
Write-Host ""

Write-Host "[7] Check table existence in any database"
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d postgres -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' LIMIT 10;"
Write-Host ""

Write-Host "[8] Check migrations were actually loaded"
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres psql -h localhost -U cintent -d postgres -c "\dt"
Write-Host ""

Write-Host "================================================================================"
