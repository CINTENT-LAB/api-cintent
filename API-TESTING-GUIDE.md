# CINTENT Platform v2 - API Testing & Demonstration Guide

**Purpose:** Test and demonstrate CINTENT API locally  
**Base URL:** http://localhost:3000  
**Status:** Ready for testing after LOCAL-DEVELOPMENT-SETUP.md

---

## Quick Start

```bash
# 1. Start the server
cd C:\Users\rpm_T\RAJA_REP\api-cintent
./START-LOCALHOST-DEV.bat    # Windows
# or
bash ./start-localhost-dev.sh  # macOS/Linux

# 2. In another terminal, run these tests
curl http://localhost:3000/api/health
```

---

## API Endpoints Reference

### Health & Status

#### GET /api/health
Check server status

```bash
curl http://localhost:3000/api/health
```

Response (200 OK):
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "environment": "development",
  "timestamp": "2026-05-13T12:34:56.789Z",
  "uptime": 345.123
}
```

---

### Authentication

#### POST /api/auth/register
Register a new user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@cintent.local",
    "password": "Demo@123456",
    "name": "Demo User"
  }'
```

Response (201 Created):
```json
{
  "success": true,
  "user": {
    "id": "user_abc123",
    "email": "demo@cintent.local",
    "name": "Demo User",
    "created_at": "2026-05-13T12:34:56.789Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/auth/login
Login existing user

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@cintent.local",
    "password": "Demo@123456"
  }'
```

Response (200 OK):
```json
{
  "success": true,
  "user": {
    "id": "user_abc123",
    "email": "demo@cintent.local",
    "name": "Demo User"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### API Catalog

#### GET /api/catalog
List all available APIs

```bash
curl http://localhost:3000/api/catalog
```

Query parameters:
- `category` - Filter by category (Travel, Drone, Replay, Governance)
- `search` - Full-text search across name and description
- `status` - Filter by status (production, beta, deprecated)
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset (default: 0)

```bash
# Example with filters
curl "http://localhost:3000/api/catalog?category=Travel&status=production&limit=10"
```

Response (200 OK):
```json
{
  "apis": [
    {
      "id": "api_123",
      "api_key": "travel_orchestration_v2",
      "name": "Travel Orchestration Engine",
      "version": "2.1.0",
      "category": "Travel",
      "status": "production",
      "short_description": "Orchestrate complex travel bookings across multiple providers",
      "tier_access": "developer",
      "created_at": "2026-05-13T12:34:56.789Z"
    },
    // ... more APIs
  ],
  "total": 4,
  "limit": 20,
  "offset": 0
}
```

#### GET /api/catalog/:apiKey
Get detailed API metadata

```bash
curl http://localhost:3000/api/catalog/travel_orchestration_v2
```

Response (200 OK):
```json
{
  "api_key": "travel_orchestration_v2",
  "name": "Travel Orchestration Engine",
  "version": "2.1.0",
  "category": "Travel",
  "status": "production",
  "short_description": "Orchestrate complex travel bookings across multiple providers",
  "full_description": "Complete travel booking orchestration with...",
  "use_cases": ["flight_booking", "hotel_coordination", "itinerary_planning"],
  "capabilities": {
    "orchestration": true,
    "replay": true,
    "governance": true,
    "distributed": true,
    "multimodal": false,
    "explainability": true
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/orchestrate",
      "description": "Execute orchestrated travel booking",
      "request_schema": {...},
      "response_schema": {...}
    }
  ],
  "code_examples": {
    "typescript": "const result = await cintent.apis.travel.orchestrate({...});",
    "python": "result = cintent.apis.travel.orchestrate(...)",
    "rest": "POST /api/travel_orchestration_v2/orchestrate"
  },
  "tier_access": "developer",
  "quota_limit": 10000
}
```

---

### Playground (Simulated Execution)

#### POST /api/playground/execute
Execute an API in simulated mode

```bash
# First get an auth token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@local","password":"demo123","name":"Demo"}' \
  | jq -r '.token')

# Then execute
curl -X POST http://localhost:3000/api/playground/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "travel_orchestration_v2",
    "parameters": {
      "trip_type": "round_trip",
      "origin": "SFO",
      "destination": "NYC",
      "departure_date": "2026-06-01",
      "return_date": "2026-06-10"
    }
  }'
```

Response (200 OK):
```json
{
  "execution_id": "exec_abc123def456",
  "status": "success",
  "timestamp": "2026-05-13T12:34:56.789Z",
  
  "orchestration_trace": {
    "root": {
      "api": "travel_orchestration_v2",
      "status": "completed",
      "duration_ms": 1234,
      "timestamp": "2026-05-13T12:34:56.789Z"
    },
    "steps": [
      {
        "step_id": 1,
        "name": "Flight Search",
        "duration_ms": 500,
        "status": "completed",
        "result": {
          "flights_found": 45,
          "cheapest": "$250",
          "fastest": "4h 20m"
        }
      },
      {
        "step_id": 2,
        "name": "Hotel Search",
        "duration_ms": 400,
        "status": "completed",
        "result": {
          "hotels_found": 128,
          "cheapest": "$80/night",
          "best_rated": 4.8
        }
      },
      {
        "step_id": 3,
        "name": "Booking Coordination",
        "duration_ms": 334,
        "status": "completed",
        "result": {
          "booking_id": "BOOK_123456",
          "total_cost": "$1500",
          "confirmation_sent": true
        }
      }
    ],
    "edges": [
      {"from": 0, "to": 1},
      {"from": 1, "to": 2},
      {"from": 2, "to": 3}
    ]
  },

  "replay_trace": {
    "checkpoints": [
      {
        "checkpoint_id": 1,
        "step": "Flight Search",
        "timestamp": "2026-05-13T12:34:56.789Z",
        "state": {...}
      },
      {
        "checkpoint_id": 2,
        "step": "Hotel Search",
        "timestamp": "2026-05-13T12:34:57.289Z",
        "state": {...}
      }
    ],
    "divergences": []
  },

  "governance_events": [
    {
      "event_id": 1,
      "policy": "max_booking_value",
      "status": "compliant",
      "value": 1500,
      "limit": 5000,
      "timestamp": "2026-05-13T12:34:56.789Z"
    },
    {
      "event_id": 2,
      "policy": "vendor_approved",
      "status": "compliant",
      "vendor": "Expedia",
      "approved": true
    }
  ],

  "confidence_evolution": [
    {"step": "Flight Search", "confidence": 0.92},
    {"step": "Hotel Search", "confidence": 0.88},
    {"step": "Booking Coordination", "confidence": 0.95},
    {"step": "Final", "confidence": 0.92}
  ],

  "explainability_output": {
    "decision_points": [
      {
        "point": "Selected United Airlines flight",
        "reasoning": "Lowest price + shortest duration",
        "alternatives_considered": 45,
        "confidence": 0.92
      },
      {
        "point": "Selected Marriott hotel",
        "reasoning": "Best rating at reasonable price",
        "alternatives_considered": 128,
        "confidence": 0.88
      }
    ]
  }
}
```

#### GET /api/playground/history
Get execution history

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/playground/history?limit=10
```

---

### Ask COGNI (RAG-Based Assistance)

#### POST /api/cogni/ask
Ask COGNI intelligent questions about APIs

```bash
curl -X POST http://localhost:3000/api/cogni/ask \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How do I book a round-trip flight using the Travel API?"
  }'
```

Response (200 OK):
```json
{
  "answer": "To book a round-trip flight using the Travel Orchestration Engine, follow these steps: 1) Call the /orchestrate endpoint with trip_type='round_trip', 2) Specify origin and destination cities, 3) Provide departure and return dates, 4) The API will automatically search flights, hotels, and coordin...",
  "confidence": 0.92,
  "related_apis": [
    {
      "api_key": "travel_orchestration_v2",
      "name": "Travel Orchestration Engine",
      "relevance_score": 0.98
    }
  ],
  "code_example": {
    "language": "typescript",
    "code": "const result = await cintent.apis.travel.orchestrate({\n  trip_type: 'round_trip',\n  origin: 'SFO',\n  destination: 'NYC',\n  departure_date: '2026-06-01',\n  return_date: '2026-06-10'\n});"
  },
  "related_docs": [
    {
      "title": "Travel API Documentation",
      "url": "/docs/travel-orchestration"
    }
  ]
}
```

---

### Dashboard & Metrics

#### GET /api/dashboard/metrics
Get platform-wide cognitive metrics

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/dashboard/metrics
```

Response (200 OK):
```json
{
  "user_id": "user_abc123",
  "timestamp": "2026-05-13T12:34:56.789Z",
  
  "orchestration_metrics": {
    "total_orchestrations": 15,
    "success_rate": 0.93,
    "avg_duration_ms": 1234,
    "avg_complexity": 3.2,
    "max_depth": 5
  },

  "replay_metrics": {
    "total_replays": 8,
    "avg_time_travel_steps": 3.5,
    "divergence_findings": 2
  },

  "explainability_metrics": {
    "confidence_avg": 0.91,
    "confidence_min": 0.82,
    "confidence_max": 0.98,
    "alternative_paths_explored": 145
  },

  "governance_metrics": {
    "policies_applied": 8,
    "violations": 0,
    "events_triggered": 24,
    "compliance_rate": 1.0
  },

  "api_usage": {
    "total_executions": 15,
    "by_category": {
      "Travel": 8,
      "Drone": 5,
      "Governance": 2
    },
    "by_status": {
      "success": 14,
      "failed": 1
    }
  }
}
```

---

### Billing

#### GET /api/billing/plans
Get available billing plans

```bash
curl http://localhost:3000/api/billing/plans
```

Response (200 OK):
```json
{
  "plans": [
    {
      "tier": "free",
      "name": "Free",
      "price": 0,
      "billing_period": "monthly",
      "quota_limit": 100,
      "rate_limit": 10,
      "features": ["API Catalog", "Simulated Execution", "Basic Dashboard"]
    },
    {
      "tier": "developer",
      "name": "Developer",
      "price": 29,
      "billing_period": "monthly",
      "quota_limit": 10000,
      "rate_limit": 100,
      "features": ["API Catalog", "Simulated Execution", "Full Dashboard", "Ask COGNI", "Replay Service"]
    },
    {
      "tier": "professional",
      "name": "Professional",
      "price": 99,
      "billing_period": "monthly",
      "quota_limit": 100000,
      "rate_limit": 1000,
      "features": ["Everything in Developer", "Production APIs", "Custom Governance", "Priority Support"]
    },
    {
      "tier": "enterprise",
      "name": "Enterprise",
      "price": null,
      "billing_period": "custom",
      "quota_limit": null,
      "rate_limit": null,
      "features": ["Everything in Professional", "Dedicated Support", "Custom Integration", "SLA Guarantee"]
    }
  ]
}
```

#### GET /api/billing/status
Get user's current subscription status

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/billing/status
```

---

### Enterprise Systems

#### GET /api/versions/:apiKey
Get API version history

```bash
curl http://localhost:3000/api/versions/travel_orchestration_v2
```

#### GET /api/dependencies/:apiKey
Get API dependency graph

```bash
curl http://localhost:3000/api/dependencies/travel_orchestration_v2
```

#### GET /api/health/status/:apiKey
Get real-time API health status

```bash
curl http://localhost:3000/api/health/status/travel_orchestration_v2
```

---

## Complete Demo Scenario

Run this entire workflow to demonstrate CINTENT:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "1. Check server health..."
curl $BASE_URL/api/health | jq .

echo ""
echo "2. Register user..."
USER_RESPONSE=$(curl -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@cintent.local",
    "password": "Demo@123456",
    "name": "Demo User"
  }')

TOKEN=$(echo $USER_RESPONSE | jq -r '.token')
echo "User registered. Token: $TOKEN"

echo ""
echo "3. List available APIs..."
curl $BASE_URL/api/catalog | jq '.apis | length'

echo ""
echo "4. Get Travel API details..."
curl $BASE_URL/api/catalog/travel_orchestration_v2 | jq '.name, .version, .capabilities'

echo ""
echo "5. Execute simulated travel booking..."
curl -X POST $BASE_URL/api/playground/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "travel_orchestration_v2",
    "parameters": {
      "trip_type": "round_trip",
      "origin": "SFO",
      "destination": "NYC"
    }
  }' | jq '.orchestration_trace, .confidence_evolution'

echo ""
echo "6. View dashboard metrics..."
curl -H "Authorization: Bearer $TOKEN" \
  $BASE_URL/api/dashboard/metrics | jq '.orchestration_metrics, .api_usage'

echo ""
echo "7. Ask COGNI..."
curl -X POST $BASE_URL/api/cogni/ask \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I use the Travel API?"}' | jq '.answer, .confidence'

echo ""
echo "Demo complete!"
```

---

## Error Handling

### Common Errors

**401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "message": "Authentication token required",
  "code": "AUTH_MISSING"
}
```
Solution: Add `Authorization: Bearer <token>` header

**404 Not Found**
```json
{
  "error": "Not Found",
  "message": "API not found",
  "code": "API_NOT_FOUND"
}
```
Solution: Check api_key spelling

**422 Unprocessable Entity**
```json
{
  "error": "Validation Error",
  "message": "Invalid parameters",
  "details": {"parameters": "trip_type is required"}
}
```
Solution: Review request schema

---

## Performance Testing

### Load Testing (Simple)

```bash
# Install Apache Bench (ab) if needed
# macOS: brew install httpd
# Linux: sudo apt-get install apache2-utils

# Test API Catalog endpoint with 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:3000/api/catalog

# Test with authentication
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/dashboard/metrics
```

---

## Troubleshooting API Calls

### Enable Verbose Logging

```bash
# In terminal where server is running:
LOG_LEVEL=debug npm run start:metadata

# In API calls:
curl -v http://localhost:3000/api/health
```

### Check Database Connection

```bash
# Verify tables exist
psql -U cintent_dev -d cintent_dev -c "\dt"

# Verify data
psql -U cintent_dev -d cintent_dev -c "SELECT api_key, name FROM api_metadata LIMIT 5;"
```

---

## Next Steps

Once API testing is complete:
1. ✅ API endpoints working
2. ✅ Authentication functional
3. ✅ Simulated execution generating traces
4. ✅ Dashboard metrics displaying
5. ✅ Ask COGNI responding

**Then:** Connect professional frontend (CINTENT-PLATFORM-PROD.html) to localhost:3000

---

**Status: Ready for API Testing**

All endpoints documented and ready to test locally on http://localhost:3000
