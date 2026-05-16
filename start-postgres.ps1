# Start PostgreSQL Docker container
cd C:\Users\rpm_T\RAJA_REP\api-cintent
docker-compose up -d postgres
Write-Host "PostgreSQL container starting..."
Start-Sleep -Seconds 5
docker-compose logs postgres
