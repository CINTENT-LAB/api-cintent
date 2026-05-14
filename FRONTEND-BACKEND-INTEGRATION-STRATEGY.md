# CINTENT Platform v2 - Frontend-Backend Integration Strategy

**Date:** May 13, 2026  
**Status:** Integration Planning  
**Objective:** Connect professional frontend to metadata-driven backend

---

## Current State

### Frontend (Existing - Professional)
- **URL:** https://api-cintent.cognivantalabs.com/CINTENT-PLATFORM-PROD.html
- **Built by:** Codex
- **Status:** Polished, production-grade UI
- **Layout:** Professional and detailed
- **Features:** Comprehensive feature set
- **Constraint:** **DO NOT change layout and features**

### Backend (New - Just Completed)
- **Files:** server-metadata-driven.js, enterprise-endpoints.js
- **Architecture:** Metadata-driven (100% configurable)
- **APIs:** RESTful endpoints for catalog, playground, Ask COGNI, billing, dashboard
- **Database:** PostgreSQL + pgvector
- **Status:** Ready to deploy

---

## Integration Strategy

### Philosophy
Keep the **beautiful frontend as-is**. Wire it to the **powerful backend**.

The frontend HTML/CSS/JS remains unchanged. We create a **thin integration layer** that:
1. Calls the new backend APIs
2. Populates the existing frontend UI with real data
3. Maintains all existing layout and features
4. Adds new capabilities (Ask COGNI, playground execution, replay, etc.)

---

## Step 1: Analyze Frontend Structure

**Before integration, we need to understand:**

1. **Where does the frontend currently get data?**
   - Hardcoded JSON?
   - Static arrays?
   - API calls to old backend?

2. **What API endpoints does it currently call?**
   - List them all
   - Understand request/response structure

3. **What data does each UI component need?**
   - API listing
   - Playground execution
   - Dashboard metrics
   - User profile/subscription
   - Billing information

4. **What interactive features exist?**
   - API search/filter
   - Playground execution
   - Code examples
   - Dashboard views
   - Account settings

---

## Step 2: Map Frontend Components to Backend APIs

We'll create a mapping document showing which frontend component calls which backend endpoint:

| Frontend Component | Current Data Source | New Backend API | Notes |
|-------------------|-------------------|-----------------|-------|
| API Catalog | ? | GET /api/catalog | Filterable by category, search |
| API Details | ? | GET /api/catalog/:apiKey | Single API metadata |
| Playground | ? | POST /api/playground/execute | Simulated execution with traces |
| Code Examples | ? | Derived from metadata | Auto-generated code snippets |
| Dashboard Metrics | ? | GET /api/dashboard/metrics | Cognitive metrics display |
| User Account | ? | GET /api/auth/profile | Current user info |
| Billing Plans | ? | GET /api/billing/plans | Subscription tiers |
| Ask COGNI | ? | POST /api/cogni/ask | RAG-based assistance |
| Versions/Lifecycle | ? | GET /api/versions/:apiKey | Version history |
| Dependencies | ? | GET /api/dependencies/:apiKey | Dependency graph |
| Health Status | ? | GET /api/health/status/:apiKey | Real-time health |
| Audit Exports | ? | POST /api/audit/export | Compliance exports |

---

## Step 3: Create Integration Layer (Minimal Code Changes)

Instead of modifying the HTML, we add a **JavaScript bridge** that:

### Option A: Add API Configuration to Frontend
```javascript
// Add to the top of CINTENT-PLATFORM-PROD.html (or in a new config file)
const API_CONFIG = {
  BASE_URL: 'https://api-cintent.cognivantalabs.com',  // Your domain
  ENDPOINTS: {
    catalog: '/api/catalog',
    playground: '/api/playground/execute',
    cogni: '/api/cogni/ask',
    dashboard: '/api/dashboard/metrics',
    billing: '/api/billing/plans',
    health: '/api/health/status'
  }
};

// Add API helper functions
async function callAPI(endpoint, options = {}) {
  const response = await fetch(API_CONFIG.BASE_URL + endpoint, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return response.json();
}
```

### Option B: Replace Hardcoded Data with API Calls
Find where the frontend currently displays data (usually in JavaScript arrays or JSON), and replace with API calls:

**Before:**
```javascript
const APIs = [
  { name: 'Travel API', category: 'Travel', status: 'production' },
  { name: 'Drone API', category: 'Drone', status: 'beta' }
];
```

**After:**
```javascript
let APIs = [];

async function loadAPIs() {
  try {
    APIs = await callAPI('/api/catalog');
    renderAPICatalog(APIs);
  } catch (error) {
    console.error('Failed to load APIs:', error);
    // Fallback to static data if API fails
  }
}

// Call on page load
loadAPIs();
```

### Option C: Wire Up Interactive Features
Connect buttons and forms to backend endpoints:

**Example: Playground Execution**
```javascript
async function executeInPlayground(apiKey, params) {
  const response = await callAPI('/api/playground/execute', {
    method: 'POST',
    body: {
      api_key: apiKey,
      parameters: params
    }
  });
  
  // Display results in existing UI
  displayOrchestrationTrace(response.orchestration_trace);
  displayReplayTimeline(response.replay_trace);
  displayGovernanceEvents(response.governance_events);
  displayConfidenceChart(response.confidence_evolution);
}
```

---

## Step 4: Deployment Strategy

### Phase 1: Static Integration (No Database Yet)
1. Keep frontend HTML unchanged
2. Add JavaScript integration layer
3. Point to new backend URLs
4. Deploy updated HTML + JS to Hostinger

### Phase 2: Database Connection
1. Spin up PostgreSQL on Hostinger
2. Load database schemas
3. Populate 50-100 APIs
4. Frontend automatically reflects new data

### Phase 3: Live Validation
1. Test each frontend feature with real backend
2. Fix any data format mismatches
3. Optimize performance
4. Document any changes

---

## Step 5: What We Need From You

To create the integration, please answer:

1. **Frontend Location:** Where is CINTENT-PLATFORM-PROD.html hosted exactly?
   - Full URL
   - File location on Hostinger

2. **Current Data Flow:** How does the frontend currently get data?
   - Static JSON files?
   - API endpoints?
   - Hardcoded arrays?
   - Show me one example

3. **Key Components:** What are the 3-5 most important interactive features we should wire up first?
   - Example: "API Search", "Playground Execution", "Ask COGNI"

4. **Authentication:** Does the frontend have login/session handling?
   - How is user state managed?
   - Are there JWT tokens?

5. **Backend Compatibility:** Any existing API calls?
   - What format do they expect (request/response)?
   - Any custom headers or authentication?

---

## Integration Checklist

Once we have answers above, we'll:

- [ ] Document frontend data structure
- [ ] Map frontend components to backend APIs
- [ ] Create JavaScript integration bridge
- [ ] Add error handling and fallbacks
- [ ] Test with static mock data
- [ ] Test with real PostgreSQL data
- [ ] Deploy to Hostinger
- [ ] Validate all features work
- [ ] Document any changes
- [ ] Keep layout and features pristine

---

## Key Principles for This Integration

### ✅ DO
- ✅ Add new JavaScript to call backend APIs
- ✅ Replace static data with API responses
- ✅ Wire up interactive features to endpoints
- ✅ Keep all existing HTML/CSS unchanged
- ✅ Preserve layout and styling
- ✅ Maintain all existing features
- ✅ Add error handling and fallbacks
- ✅ Test thoroughly before deployment

### ❌ DON'T
- ❌ Modify HTML structure
- ❌ Change CSS styling
- ❌ Remove existing features
- ❌ Alter layout
- ❌ Add competing UI frameworks
- ❌ Deploy without testing
- ❌ Break existing functionality

---

## Expected Timeline

Once we have frontend structure details:

1. **Day 1:** Analyze frontend, create integration map (2-4 hours)
2. **Day 2:** Create JavaScript integration layer (2-3 hours)
3. **Day 3:** Test with mock data (1-2 hours)
4. **Day 4:** Deploy to Hostinger (1 hour)
5. **Day 5:** PostgreSQL setup and API population (parallel, 2-4 hours)
6. **Day 6:** Live validation with real data (2-3 hours)

**Total:** ~5-6 days from integration start to fully operational

---

## Next Steps

1. **Push current architecture to GitHub** (as planned)
2. **Provide frontend structure details** (answers to questions above)
3. **We'll create minimal integration layer** (preserve everything)
4. **Deploy integrated frontend** (professional UI + operational backend)
5. **Set up PostgreSQL and populate APIs** (parallel)
6. **Validate end-to-end** (user signup → API execution → dashboard)

---

## Why This Approach?

- ✅ **Preserves professional UI** (don't break what's beautiful)
- ✅ **Minimal code changes** (just add API wiring)
- ✅ **No redesign needed** (layout stays same)
- ✅ **Risk reduction** (frontend untouched, only backend wiring added)
- ✅ **Fast integration** (days, not weeks)
- ✅ **Operational immediately** (works with or without backend while testing)

---

## Questions?

Before proceeding with integration, please provide:

1. Frontend file path/URL
2. How it currently loads data
3. Which features to prioritize
4. Authentication mechanism
5. Any existing API calls

Once we have these details, integration begins immediately.

---

**Status: Ready for Integration Planning**

Next: GitHub push → Frontend analysis → Integration layer creation → Deployment
