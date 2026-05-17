@echo off
REM ============================================================
REM CINTENT Platform v2 - Start Local Development Server
REM ============================================================
REM This script starts the complete CINTENT stack on localhost:3000
REM ============================================================

echo.
echo ============================================================
echo CINTENT Platform v2 - Local Development Server
echo ============================================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 22.x from https://nodejs.org/
    pause
    exit /b 1
)

echo [✓] Node.js detected:
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo [✓] npm detected:
npm --version

REM Check if required files exist
if not exist "server.js" (
    echo ERROR: server.js not found
    echo Please run this script from the api-cintent directory
    pause
    exit /b 1
)

if not exist "package.json" (
    echo ERROR: package.json not found
    pause
    exit /b 1
)

if not exist ".env" (
    echo.
    echo ============================================================
    echo WARNING: .env file not found
    echo ============================================================
    echo A .env file is needed for configuration.
    echo.
    echo Creating .env with default local development values...
    echo.

    (
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_USER=cintent_dev
        echo DB_PASSWORD=dev-password-123
        echo DB_NAME=cintent_dev
        echo.
        echo # Server Configuration
        echo NODE_ENV=development
        echo PORT=3000
        echo API_BASE_URL=http://localhost:3000
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=your-super-secret-jwt-key-for-local-dev-only-12345
        echo.
        echo # Stripe Configuration (test keys for demo)
        echo STRIPE_PUBLIC_KEY=pk_test_dummy_local_dev
        echo STRIPE_SECRET_KEY=sk_test_dummy_local_dev
        echo STRIPE_WEBHOOK_SECRET=whsec_test_dummy_local_dev
        echo.
        echo # OpenAI/Claude Configuration (for Ask COGNI)
        echo OPENAI_API_KEY=sk-dummy-for-local-dev
        echo CLAUDE_API_KEY=sk-ant-dummy-for-local-dev
        echo.
        echo # Feature Flags
        echo ENABLE_SIMULATED_EXECUTION=true
        echo ENABLE_REPLAY_SERVICE=true
        echo ENABLE_GOVERNANCE_ENFORCEMENT=true
        echo ENABLE_OBSERVABILITY_METRICS=true
        echo.
        echo # Logging
        echo LOG_LEVEL=debug
    ) > .env

    echo [✓] Created .env file
    echo.
)

REM Check if PostgreSQL is accessible
echo.
echo Checking PostgreSQL connectivity...
echo Note: PostgreSQL must be running locally or accessible at localhost:5432
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo.
    echo ============================================================
    echo Installing npm dependencies...
    echo This may take a few minutes on first run
    echo ============================================================
    echo.

    call npm install

    if errorlevel 1 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )

    echo [✓] Dependencies installed
    echo.
)

REM Display startup information
echo.
echo ============================================================
echo Server Configuration
echo ============================================================
echo.
echo API Server:        http://localhost:3000
echo Health Check:      http://localhost:3000/api/health
echo API Catalog:       http://localhost:3000/api/catalog
echo Documentation:     See LOCAL-DEVELOPMENT-SETUP.md
echo.
echo ============================================================
echo Starting CINTENT Platform v2...
echo ============================================================
echo.

REM Start the server
call npm start

REM If we get here, the server exited
echo.
echo ============================================================
echo Server stopped
echo ============================================================
pause
exit /b 0
