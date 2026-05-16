@echo off
cd /d C:\Users\rpm_T\RAJA_REP\api-cintent
echo Starting PostgreSQL container...
docker-compose up -d postgres
echo.
echo Waiting for container to initialize...
timeout /t 5 /nobreak
echo.
echo Container logs:
docker-compose logs postgres
pause
