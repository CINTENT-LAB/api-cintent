#!/bin/bash

# ============================================================
# CINTENT Platform v2 - Start Local Development Server
# ============================================================
# This script starts the complete CINTENT stack on localhost:3000
# ============================================================

echo ""
echo "============================================================"
echo "CINTENT Platform v2 - Local Development Server"
echo "============================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js 22.x from https://nodejs.org/"
    exit 1
fi

echo "[✓] Node.js detected:"
node --version

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed or not in PATH"
    exit 1
fi

echo "[✓] npm detected:"
npm --version

# Check if required files exist
if [ ! -f "server.js" ]; then
    echo "ERROR: server.js not found"
    echo "Please run this script from the api-cintent directory"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found"
    exit 1
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "============================================================"
    echo "Creating .env file with default local development values..."
    echo "============================================================"
    echo ""

    cat > .env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=cintent_dev
DB_PASSWORD=dev-password-123
DB_NAME=cintent_dev

# Server Configuration
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-local-dev-only-12345

# Stripe Configuration (test keys for demo)
STRIPE_PUBLIC_KEY=pk_test_dummy_local_dev
STRIPE_SECRET_KEY=sk_test_dummy_local_dev
STRIPE_WEBHOOK_SECRET=whsec_test_dummy_local_dev

# OpenAI/Claude Configuration (for Ask COGNI)
OPENAI_API_KEY=sk-dummy-for-local-dev
CLAUDE_API_KEY=sk-ant-dummy-for-local-dev

# Feature Flags
ENABLE_SIMULATED_EXECUTION=true
ENABLE_REPLAY_SERVICE=true
ENABLE_GOVERNANCE_ENFORCEMENT=true
ENABLE_OBSERVABILITY_METRICS=true

# Logging
LOG_LEVEL=debug
EOF

    echo "[✓] Created .env file"
    echo ""
fi

# Check if PostgreSQL is running
echo ""
echo "Checking PostgreSQL connectivity..."
echo "Note: PostgreSQL must be running locally or accessible at localhost:5432"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo ""
    echo "============================================================"
    echo "Installing npm dependencies..."
    echo "This may take a few minutes on first run"
    echo "============================================================"
    echo ""

    npm install

    if [ $? -ne 0 ]; then
        echo "ERROR: npm install failed"
        exit 1
    fi

    echo "[✓] Dependencies installed"
    echo ""
fi

# Display startup information
echo ""
echo "============================================================"
echo "Server Configuration"
echo "============================================================"
echo ""
echo "API Server:        http://localhost:3000"
echo "Health Check:      http://localhost:3000/api/health"
echo "API Catalog:       http://localhost:3000/api/catalog"
echo "Documentation:     See LOCAL-DEVELOPMENT-SETUP.md"
echo ""
echo "============================================================"
echo "Starting CINTENT Platform v2..."
echo "============================================================"
echo ""

# Start the server
npm start

# If we get here, the server exited
echo ""
echo "============================================================"
echo "Server stopped"
echo "============================================================"
