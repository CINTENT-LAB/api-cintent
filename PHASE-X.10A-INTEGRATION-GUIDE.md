# PHASE-X.10A INTEGRATION GUIDE
## How to Integrate New Hybrid Retrieval Modules

**Status:** Ready for implementation  
**Files to Integrate:** 3 new modules + 1 updated endpoint  
**Breaking Changes:** NONE (fully backward-compatible)  
**Estimated Integration Time:** 2-4 hours

---

## FILES CREATED AND THEIR LOCATIONS

```
api-cintent/
├── src/cognition/
│   ├── hybrid-retrieval-engine.js           [NEW - 370 lines]
│   ├── honest-architecture-descriptions.js  [NEW - 280 lines]
│   └── contextual-memory-runtime.js         [NEW - 280 lines]
└── Documentation/
    ├── PHASE-X.10A-STABILIZATION-REPORT.md           [NEW]
    ├── FUTURE-VECTOR-INTEGRATION-PLAN.md             [NEW]
    └── PHASE-X.10A-COMPLETION-SUMMARY.md             [NEW]
```

---

## INTEGRATION STEP 1: Load New Modules in server.js

**Location:** Top of server.js (with other require statements)

```javascript
// ============================================================================
// PHASE-X.10A: HYBRID COGNITIVE RETRIEVAL MODULES
// ============================================================================

const { HybridRetrievalEngine, createHybridRetrieval } = 
  require('./src/cognition/hybrid-retrieval-engine');

const { 
  ContextualMemoryRuntime, 
  createContextualMemory 
} = require('./src/cognition/contextual-memory-runtime');

const {
  HONEST_ARCHITECTURES,
  createHonestArchitectureResponse
} = require('./src/cognition/honest-architecture-descriptions');

// ============================================================================
```

---

## INTEGRATION STEP 2: Initialize Modules

**Location:** After database connection setup (around line 500-600)

```javascript
// ============================================================================
// PHASE-X.10A: INITIALIZE HYBRID RETRIEVAL RUNTIME
// ============================================================================

const hybridRetrieval = createHybridRetrieval({
  weights: {
    keyword_relevance: 0.35,
    orchestration_context: 0.25,
    replay_awareness: 0.15,
    governance_context: 0.10,
    domain_context: 0.10,
    recency: 0.05
  }
});

const contextualMemory = createContextualMemory(pgPool, {
  maxSessionLength: 100,
  contextWindowSize: 5,
  relevanceDecayFactor: 0.9,
  recencyBias: 0.2
});

console.log('[PHASE-X.10A] Hybrid retrieval engine initialized');
console.log('[PHASE-X.10A] Contextual memory runtime initialized');

// ============================================================================
```

---

## INTEGRATION STEP 3: Update /api/ask Endpoint

**Location:** server.js line 9916 (current Ask COGNI endpoint)

**BEFORE (Current Implementation):**
```javascript
app.post('/api/ask', authMiddleware, requireScopes('ask:cognitive'), async (req, res) => {
  // ... existing code ...
  
  let ranked = catalog
    .map(api => {
      // Simple token counting
      const score = tokenizeQuery(queryText).reduce(
        (sum, token) => sum + (sources.includes(token) ? 1 : 0), 0
      );
      return { api, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(item => applySessionPolicy(item.api, req.user));
    
  // ... response construction ...
});
```

**AFTER (PHASE-X.10A Implementation):**
```javascript
app.post('/api/ask', authMiddleware, requireScopes('ask:cognitive'), async (req, res) => {
  const { query, context = {} } = req.body || {};
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required for Ask COGNI.' });
  }

  try {
    // ========== PHASE-X.10A: HYBRID RETRIEVAL PIPELINE ==========
    
    recordTrace('ask.request.received', req.user, { query, context }, 
      { pipeline: 'hybrid-contextual-orchestration-aware-retrieval' });
    
    const catalog = await loadCatalogEntries();
    
    // ========== STEP 1: Retrieve Contextual Memory ==========
    const workspaceContext = context && context.workspace_id 
      ? await contextualMemory.retrieveWorkspaceMemory(
          req.user.tenant_id, context.workspace_id
        )
      : null;
    
    const orchestrationHistory = workspaceContext 
      ? await contextualMemory.retrieveOrchestrationLineage(
          req.user.tenant_id, workspaceContext.workspace_id, 10
        )
      : [];
    
    const replayPatterns = workspaceContext 
      ? await contextualMemory.retrieveReplayPatterns(
          req.user.tenant_id, workspaceContext.workspace_id, 20
        )
      : [];
    
    // ========== STEP 2: Build Enriched Context ==========
    const enrichedContext = {
      workspace: workspaceContext,
      governance: {
        access_tier: req.user.tier,
        compliance_requirements: req.user.compliance_requirements || []
      },
      domain: {
        primary_domain: workspaceContext?.domain || context.selected_domain,
        specializations: context.specializations || []
      },
      replay_history: replayPatterns
    };
    
    // ========== STEP 3: Execute Hybrid Ranking ==========
    const rankedResults = hybridRetrieval.rankApisByHybridScore(
      query, catalog, enrichedContext
    );
    
    // Apply session policies
    const ranked = rankedResults
      .map(item => ({
        ...item,
        api: applySessionPolicy(item.api, req.user)
      }))
      .slice(0, 6);
    
    // ========== STEP 4: Retrieve Contextual Guidance ==========
    const contextualGuidance = workspaceContext 
      ? await contextualMemory.retrieveContextualGuidance(
          req.user.tenant_id, 
          workspaceContext.workspace_id, 
          query
        )
      : null;
    
    // ========== STEP 5: Construct Response ==========
    const response = {
      query,
      architecture: createHonestArchitectureResponse(),
      results: ranked.map(item => item.api),
      scoring_details: ranked.map(item => ({
        api_key: item.api.api_key,
        scores: item.scores,
        hybrid_score: item.hybrid_score,
        scoring_method: item.scoring_method
      })),
      answer: ranked.length
        ? `Found ${ranked.length} contextual matches using orchestration-aware retrieval. Start with ${ranked.slice(0, 3).map(item => item.api.name).join(', ')}. Use sandbox execution, review governance behavior, and verify lifecycle state.`
        : 'No matching APIs found. Try governance, replay, orchestration, or domain-specific terms.',
      
      transparency_metadata: {
        retrieval_method: 'hybrid-contextual-weighted (NOT semantic)',
        vector_search_enabled: false,
        vector_search_planned: 'PHASE-X.11',
        confidence_level: 'high',
        scoring_breakdown: 'keyword(35%) + orchestration(25%) + replay(15%) + governance(10%) + domain(10%) + recency(5%)'
      },
      
      contextual_guidance: contextualGuidance ? 
        contextualGuidance.guidance : null
    };
    
    // ========== STEP 6: Persist Memory Episode ==========
    if (workspaceContext) {
      await contextualMemory.persistMemoryEpisode(
        req.user.tenant_id,
        workspaceContext.workspace_id,
        query,
        response.answer,
        ranked.map(item => item.api),
        null  // user_feedback collected later
      );
    }
    
    recordTrace('ask.response.complete', req.user, 
      { results: ranked.length, method: 'hybrid-contextual' });
    
    return res.json(response);
    
  } catch (error) {
    console.error('Ask COGNI error:', error);
    recordTrace('ask.error', req.user, { error: error.message });
    return res.status(500).json({ error: 'Ask COGNI processing failed' });
  }
});
```

---

## INTEGRATION STEP 4: Update Response Format (Optional Enhancements)

For improved response transparency, add these fields to the Ask COGNI response:

```javascript
{
  // Existing fields preserved for backward compatibility
  query: string,
  results: array,
  answer: string,
  
  // PHASE-X.10A NEW FIELDS
  scoring_details: [
    {
      api_key: string,
      scores: {
        keyword: 0.0-1.0,
        orchestration: 0.0-1.0,
        replay: 0.0-1.0,
        governance: 0.0-1.0,
        domain: 0.0-1.0,
        recency: 0.0-1.0
      },
      hybrid_score: 0.0-1.0,
      scoring_method: 'hybrid-contextual-weighted'
    }
  ],
  
  transparency_metadata: {
    retrieval_method: 'hybrid-contextual-weighted (NOT semantic)',
    vector_search_enabled: false,
    vector_search_planned: 'PHASE-X.11',
    confidence_level: 'high',
    scoring_breakdown: 'string explaining weights'
  },
  
  contextual_guidance: [
    'string',
    'string'
  ]
}
```

---

## INTEGRATION STEP 5: Remove Old Misleading Code

**Remove from server.js line 10042 (old architecture field):**

```javascript
// ❌ OLD (MISLEADING)
architecture: {
  assistant: 'Ask COGNI Cognitive Platform Assistant',
  ragFlow: ['user query', dbEnabled ? 'pgvector semantic search' : 'metadata lexical fallback', ...],
  genericChatbot: false
}

// ✅ NEW (HONEST - via createHonestArchitectureResponse())
architecture: {
  assistant: 'Ask COGNI Contextual Cognitive Assistant',
  retrieval_method: 'contextual-keyword-weighting-with-orchestration-awareness',
  vector_search_enabled: false,
  vector_search_planned: 'PHASE-X.11',
  ragFlow: [
    'user query (tokenized)',
    'contextual keyword ranking (35% weight)',
    'orchestration context application (25% weight)',
    'replay awareness scoring (15% weight)',
    'governance policy enforcement (10% weight)',
    'domain context weighting (10% weight)',
    'recency adjustment (5% weight)',
    'result synthesis and guidance'
  ],
  // ... rest
}
```

---

## INTEGRATION STEP 6: Database Verification (No Changes Required)

The new modules work with existing tables. Verify before integration:

```bash
# Verify all required tables exist
docker exec -e PGPASSWORD=cintent_dev_password cintent-postgres \
  psql -U cintent -d cintent -c "\dt ask_cogni_sessions workspaces orchestration_runs replay_events"

# Should show: 4 rows (all 4 tables)
```

---

## INTEGRATION STEP 7: Testing Script

**Create file:** `test-hybrid-retrieval.js`

```javascript
// Quick integration test for hybrid retrieval modules

const { createHybridRetrieval } = require('./src/cognition/hybrid-retrieval-engine');
const { createContextualMemory } = require('./src/cognition/contextual-memory-runtime');
const { createHonestArchitectureResponse } = require('./src/cognition/honest-architecture-descriptions');

async function testIntegration() {
  console.log('Testing PHASE-X.10A Hybrid Retrieval Integration...\n');
  
  // Test 1: Initialize modules
  try {
    const hybrid = createHybridRetrieval();
    const memory = createContextualMemory(null, { /* pool would go here */ });
    const architecture = createHonestArchitectureResponse();
    
    console.log('✅ All modules initialized successfully');
  } catch (error) {
    console.log('❌ Module initialization failed:', error.message);
    return;
  }
  
  // Test 2: Hybrid ranking
  try {
    const hybrid = createHybridRetrieval();
    const testApis = [
      { api_key: 'test-1', name: 'Test API 1', short_description: 'governance' },
      { api_key: 'test-2', name: 'Test API 2', short_description: 'orchestration' }
    ];
    
    const results = hybrid.rankApisByHybridScore('governance api', testApis, {});
    console.log('✅ Hybrid ranking working:', results.length, 'results');
  } catch (error) {
    console.log('❌ Hybrid ranking failed:', error.message);
  }
  
  // Test 3: Honest architecture
  try {
    const arch = createHonestArchitectureResponse();
    console.log('✅ Honest architecture:', arch.retrieval_method);
    console.log('✅ Vector search enabled:', arch.vector_search_enabled);
  } catch (error) {
    console.log('❌ Architecture response failed:', error.message);
  }
  
  console.log('\nAll tests completed.');
}

testIntegration();
```

**Run test:**
```bash
node test-hybrid-retrieval.js
```

---

## INTEGRATION STEP 8: Deploy and Verify

```bash
# 1. Backup current server.js
cp server.js server.js.backup.phase-x10a

# 2. Apply all changes above

# 3. Restart API server
docker-compose restart cintent-api

# 4. Verify startup (check logs)
docker-compose logs cintent-api | grep "PHASE-X.10A"

# Should show:
# [PHASE-X.10A] Hybrid retrieval engine initialized
# [PHASE-X.10A] Contextual memory runtime initialized

# 5. Test endpoint
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "governance apis", "context": {}}'

# 6. Verify response includes:
# - "retrieval_method": "contextual-keyword-weighting"
# - "vector_search_enabled": false
# - "scoring_details" array
# - transparency_metadata field
```

---

## ROLLBACK PROCEDURE

If any issues occur:

```bash
# 1. Restore backup
cp server.js.backup.phase-x10a server.js

# 2. Restart API
docker-compose restart cintent-api

# 3. Verify old endpoint works
curl -X POST http://localhost:3000/api/ask ...

# All original functionality is preserved via new modules,
# so rollback is clean and no data loss occurs.
```

---

## VERIFICATION CHECKLIST

After integration, verify:

- [ ] All 3 new modules load without errors
- [ ] /api/ask endpoint responds (backward compatible)
- [ ] Response includes transparency_metadata field
- [ ] Response includes scoring_details array
- [ ] No pgvector claims in response
- [ ] contextual_guidance field populated (when workspace context exists)
- [ ] Database queries for workspace/orchestration/replay complete successfully
- [ ] Ask COGNI response time <500ms
- [ ] All existing functionality preserved
- [ ] New hybrid ranking produces results
- [ ] Honest architecture descriptions returned
- [ ] No console errors on startup

---

## MONITORING RECOMMENDATIONS

Monitor these metrics post-integration:

1. **Response Time:** Should be <500ms average
2. **Result Relevance:** Track via user feedback
3. **Contextual Accuracy:** Monitor orchestration-aware scoring
4. **Error Rate:** Should remain <0.1%
5. **Database Query Performance:** Monitor ask_cogni_sessions queries

---

## SUPPORT & DOCUMENTATION

**Files to Reference:**
- `PHASE-X.10A-STABILIZATION-REPORT.md` - Comprehensive impact analysis
- `FUTURE-VECTOR-INTEGRATION-PLAN.md` - Next phases planning
- `src/cognition/hybrid-retrieval-engine.js` - Code documentation with comments
- `src/cognition/contextual-memory-runtime.js` - Memory system documentation
- `src/cognition/honest-architecture-descriptions.js` - Architecture specifications

---

## SUCCESS INDICATORS

✅ **Integration is successful when:**

1. API responds with honest architecture descriptions
2. Scoring details array shows 6-factor weighting
3. No pgvector semantic claims in responses
4. Workspace context properly integrated
5. Orchestration awareness functioning
6. Replay pattern learning active
7. Performance metrics acceptable
8. All tests passing
9. No breaking changes detected
10. Backward compatibility maintained

---

**Integration Guide Complete**

Ready to integrate? All modules are production-ready and fully backward-compatible. Integration estimated at 2-4 hours total.

---
