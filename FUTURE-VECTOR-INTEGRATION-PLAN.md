# FUTURE VECTOR INTEGRATION PLAN
## Semantic Search Roadmap (PHASE-X.11 → PHASE-X.15)

**Status:** INFRASTRUCTURE READY, IMPLEMENTATION DEFERRED  
**Target Launch:** PHASE-X.11 (Post-Stability Validation)  
**Current Ask COGNI:** Contextual keyword-based retrieval  
**Future Ask COGNI:** Hybrid keyword + semantic vector retrieval

---

## PHASE-X.11: OPENAI EMBEDDING FOUNDATION

### Objective
Activate pgvector infrastructure with OpenAI embeddings for semantic query understanding.

### Implementation Steps

#### Step 1: OpenAI API Integration
```javascript
// NEW: src/integration/openai-embeddings.js

const OpenAI = require('openai');

class OpenAIEmbeddingService {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
    this.model = 'text-embedding-3-small';
    this.dimension = 1536;
  }

  async generateEmbedding(text) {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
      encoding_format: 'float'
    });
    return response.data[0].embedding;
  }

  async generateBatchEmbeddings(texts) {
    const embeddings = [];
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    return embeddings;
  }
}

module.exports = { OpenAIEmbeddingService };
```

#### Step 2: Embedding Generation for Query

```javascript
// ENHANCED: /api/ask endpoint

async function handleAskQuery(req, res) {
  const { query, context } = req.body;

  // PHASE-X.10A: Existing contextual retrieval
  const contextualResults = await hybridEngine.rankApisByHybridScore(query, catalog, context);

  // PHASE-X.11: NEW - Generate query embedding
  const queryEmbedding = await openaiService.generateEmbedding(query);

  // PHASE-X.11: NEW - Vector similarity search
  const vectorResults = await semanticSearch.findSimilarApis(queryEmbedding, catalog);

  // Combine results (see hybrid ranking section below)
  const combinedResults = combineContextualAndSemantic(contextualResults, vectorResults);

  return res.json({
    ...response,
    semantic_enabled: true,
    vector_score_included: true
  });
}
```

#### Step 3: Activate pgvector Similarity Search

```sql
-- PHASE-X.11: New PostgreSQL function for vector search

CREATE OR REPLACE FUNCTION find_similar_apis(
  query_embedding vector(1536),
  similarity_threshold float = 0.6
)
RETURNS TABLE (
  api_key text,
  name text,
  similarity float
) AS $$
SELECT
  api_key,
  name,
  (embedding <-> query_embedding) * -1 as similarity
FROM api_metadata
WHERE embedding IS NOT NULL
  AND (embedding <-> query_embedding) * -1 > similarity_threshold
ORDER BY similarity DESC
LIMIT 10;
$$ LANGUAGE SQL;
```

#### Step 4: Database Mutation Preparation

```javascript
// NEW: src/persistence/vector-persistence.js

async function persistApiEmbedding(apiKey, embedding) {
  const query = `
    UPDATE api_metadata
    SET embedding = $1, embedding_generated_at = NOW()
    WHERE api_key = $2
  `;
  
  return await pool.query(query, [embedding, apiKey]);
}

async function persistSessionEmbedding(sessionId, queryEmbedding) {
  const query = `
    UPDATE ask_cogni_sessions
    SET embedding = $1, embedding_generated_at = NOW()
    WHERE id = $2
  `;
  
  return await pool.query(query, [queryEmbedding, sessionId]);
}

async function generateMissingEmbeddings() {
  // Batch generate embeddings for all APIs without them
  const missingApis = await pool.query(
    'SELECT api_key, name, short_description, full_description FROM api_metadata WHERE embedding IS NULL'
  );

  for (const api of missingApis.rows) {
    const combinedText = `${api.name} ${api.short_description} ${api.full_description}`;
    const embedding = await openaiService.generateEmbedding(combinedText);
    await persistApiEmbedding(api.api_key, embedding);
  }
}
```

### Database Changes Required

```sql
-- PHASE-X.11: Add embedding generation timestamp tracking
ALTER TABLE api_metadata ADD COLUMN embedding_generated_at TIMESTAMP;
ALTER TABLE ask_cogni_sessions ADD COLUMN embedding_generated_at TIMESTAMP;

-- PHASE-X.11: Create index for faster similarity search
CREATE INDEX idx_api_metadata_embedding_hnsw 
ON api_metadata USING HNSW(embedding vector_cosine_ops);

-- PHASE-X.11: Create function for vector queries
-- See Step 3 above for SQL function creation
```

### Cost Estimate
- OpenAI embedding cost: ~$0.02 per 1M tokens
- Estimated 50-100 APIs × 1000 tokens avg = $0.001-$0.002 per catalog refresh
- Query embeddings: ~50-500 queries/day × 1536 tokens = ~$0.024/day

### Timeline
- Implementation: 1-2 weeks
- Testing: 1 week
- Rollout: Gradual (10% → 50% → 100%)

---

## PHASE-X.12: HYBRID SEMANTIC-KEYWORD RANKING

### Objective
Combine keyword and semantic scores for improved relevance.

### Implementation

```javascript
// ENHANCED: hybrid-retrieval-engine.js

class HybridRetrievalEngine {
  async rankApisByHybridAndSemantic(query, apis, context = {}) {
    // PHASE-X.10A: Existing contextual scoring
    const contextualScores = this.rankApisByHybridScore(query, apis, context);

    // PHASE-X.12: NEW - Semantic scoring
    const queryEmbedding = await openaiService.generateEmbedding(query);
    const semanticScores = await this.scoreSemanticRelevance(queryEmbedding, apis);

    // Combine scores with adjustable weighting
    const combinedScores = apis.map((api, idx) => {
      const contextualScore = contextualScores[idx]?.hybrid_score || 0;
      const semanticScore = semanticScores[idx]?.score || 0;

      // PHASE-X.12: Hybrid weighting (adjustable)
      const CONTEXT_WEIGHT = 0.4;  // Proven contextual retrieval
      const SEMANTIC_WEIGHT = 0.6;  // New semantic capability

      const hybridScore = 
        (contextualScore * CONTEXT_WEIGHT) +
        (semanticScore * SEMANTIC_WEIGHT);

      return {
        api,
        contextual_score: contextualScore,
        semantic_score: semanticScore,
        hybrid_semantic_score: hybridScore,
        method: 'contextual-semantic-hybrid'
      };
    });

    return combinedScores.sort((a, b) => b.hybrid_semantic_score - a.hybrid_semantic_score);
  }

  async scoreSemanticRelevance(queryEmbedding, apis) {
    // Calculate cosine similarity between query and API embeddings
    return apis.map(api => ({
      api_key: api.api_key,
      score: this.cosineSimilarity(queryEmbedding, api.embedding)
    }));
  }

  cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
    return dotProduct / (magnitude1 * magnitude2);
  }
}
```

### Changes to Response Format

```javascript
{
  // ... existing fields ...
  results: [
    {
      api_key: 'governance-1',
      name: 'Governance Policy Engine',
      // PHASE-X.12: New scoring breakdown
      scoring: {
        contextual_score: 0.85,
        semantic_score: 0.78,
        hybrid_semantic_score: 0.81,
        component_scores: {
          keyword_relevance: 0.90,
          orchestration_context: 0.75,
          replay_awareness: 0.60,
          semantic_similarity: 0.78
        }
      },
      // ... other fields ...
    }
  ],
  architecture: {
    retrieval_method: 'hybrid-contextual-semantic',  // Updated
    vector_search_enabled: true,  // PHASE-X.12
    semantic_search: 'active',    // PHASE-X.12
    weighting: {
      contextual_component: '40%',
      semantic_component: '60%'
    }
  }
}
```

### Timeline
- Implementation: 2 weeks
- Testing & tuning: 2 weeks
- Rollout: Gradual (10% → 50% → 100%)

---

## PHASE-X.13: SEMANTIC MEMORY ENHANCEMENT

### Objective
Embed past Ask COGNI sessions for semantic episode matching.

### Implementation

```javascript
// NEW: src/cognition/semantic-memory-runtime.js

class SemanticMemoryRuntime {
  async retrieveSemanticallySimilarEpisodes(query, workspaceId, limit = 5) {
    // Generate embedding for current query
    const queryEmbedding = await openaiService.generateEmbedding(query);

    // Vector similarity search in ask_cogni_sessions
    const query_sql = `
      SELECT
        id, query, response_summary, apis_recommended,
        embedding <-> $1::vector as distance
      FROM ask_cogni_sessions
      WHERE workspace_id = $2
        AND embedding IS NOT NULL
      ORDER BY distance ASC
      LIMIT $3
    `;

    const result = await pool.query(query_sql, [queryEmbedding, workspaceId, limit]);
    return result.rows;
  }

  async buildSemanticContinuity(query, workspaceId) {
    const episodes = await this.retrieveSemanticallySimilarEpisodes(query, workspaceId);
    
    return {
      semantically_similar_episodes: episodes,
      recommendation_transfer: this.synthesizeRecommendationTransfer(episodes),
      continuity_confidence: this.calculateContinuityConfidence(episodes)
    };
  }

  synthesizeRecommendationTransfer(episodes) {
    if (episodes.length === 0) return null;

    const mostSimilar = episodes[0];
    return {
      source_query: mostSimilar.query,
      source_apis: mostSimilar.apis_recommended,
      confidence: 1 - episodes[0].distance,
      rationale: 'Semantically similar past query provided these recommendations'
    };
  }
}
```

### Timeline
- Implementation: 2 weeks
- Testing: 1 week
- Rollout: Gradual

---

## PHASE-X.14: SEMANTIC RERANKING

### Objective
Use semantic similarity as primary ranking factor.

### Implementation

```javascript
// ENHANCED: hybrid-retrieval-engine.js

class HybridRetrievalEngine {
  async rankBySemanticPrimary(query, apis, context = {}) {
    const queryEmbedding = await openaiService.generateEmbedding(query);

    // Primary: Semantic similarity (now leading)
    const semanticScores = apis.map(api => ({
      api,
      semantic_score: this.cosineSimilarity(queryEmbedding, api.embedding),
      weight: 0.60
    }));

    // Secondary: Contextual factors (supporting)
    const contextualScores = this.rankApisByHybridScore(query, apis, context);

    // Combine with semantic primary
    const reranked = semanticScores.map(item => {
      const contextualItem = contextualScores.find(cs => cs.api.api_key === item.api.api_key);
      
      return {
        api: item.api,
        semantic_primary_score: item.semantic_score * 0.60,
        contextual_supporting_score: (contextualItem?.hybrid_score || 0) * 0.40,
        final_score: (item.semantic_score * 0.60) + ((contextualItem?.hybrid_score || 0) * 0.40),
        method: 'semantic-primary-contextual-supporting'
      };
    });

    return reranked.sort((a, b) => b.final_score - a.final_score);
  }
}
```

### Timeline
- Implementation: 1 week
- Testing: 1 week
- Rollout: Gradual (requires careful validation)

---

## PHASE-X.15: ENTERPRISE SEMANTIC SUITE

### Objective
Extend semantic understanding to governance, compliance, and orchestration.

### Components

#### Semantic Governance Policy Matching
```javascript
// Embed governance policies
// Find semantically aligned policies for user context
// Auto-apply policy recommendations based on semantic intent
```

#### Semantic Compliance Analysis
```javascript
// Embed compliance requirements
// Match APIs against compliance needs semantically
// Identify gaps in semantic compliance coverage
```

#### Semantic Workflow Recommendation
```javascript
// Embed workflow patterns
// Recommend workflow sequences semantically
// Learn orchestration patterns from embeddings
```

### Timeline
- Planning: 1 week
- Implementation: 4 weeks
- Testing: 2 weeks
- Rollout: 2 weeks

---

## SAFETY & STABILITY MEASURES

### Rollback Procedures

```bash
# If semantic search causes issues:
1. Disable vector search: vector_search_enabled = false
2. Fall back to contextual retrieval automatically
3. Keep semantic data for future re-enablement
```

### A/B Testing During Rollout

```javascript
// Gradual activation
if (Math.random() < rollout_percentage) {
  results = await hybridAndSemanticRanking(query, apis);
} else {
  results = await contextualOnlyRanking(query, apis);
}

// Track metrics
trackRanking({
  method: rollout_percentage === 1.0 ? 'semantic' : 'contextual',
  user_satisfaction: null,  // Collect later
  response_quality: null    // Collect later
});
```

### Fallback Chain

```
Primary:   Hybrid semantic-contextual ranking
Secondary: Contextual-only ranking (PHASE-X.10A)
Tertiary:  Keyword-only ranking (legacy)
Emergency: Error response with catalog count
```

---

## INFRASTRUCTURE REQUIREMENTS

### API Cost Projections

| Phase | Monthly Cost | Justification |
|-------|-------------|---------------|
| X.11 | $10-20 | Embedding generation for queries + batch catalog |
| X.12 | $10-20 | Same as X.11, query similarity only |
| X.13 | $20-30 | Session embedding storage increased |
| X.14 | $15-25 | Reranking queries |
| X.15 | $30-50 | Policy + compliance semantics |

### Database Storage

```
Per API metadata:
- Embedding vector (1536 floats): ~6KB per API
- 100 APIs: ~600KB
- Index overhead: ~200KB
Total: ~800KB

Per session:
- Query embedding: ~6KB
- 1000 sessions: ~6MB
- Index overhead: ~2MB
Total: ~8MB (manageable)
```

### Computational Requirements

- Vector similarity search: O(n) worst case, but HNSW index brings it to O(log n)
- Cosine similarity: ~0.1ms per comparison
- Top-6 selection from 100 APIs: <20ms total

---

## MIGRATION STRATEGY

### Backward Compatibility

```javascript
// All responses include both old and new fields
{
  // PHASE-X.10A fields (always present)
  results: [...],
  architecture: { retrieval_method: 'contextual-keyword-weighted' },
  
  // PHASE-X.12+ fields (only when enabled)
  semantic_results: [...],      // New field
  semantic_ranking: { ... },    // New field
  semantic_metadata: { ... }    // New field
}

// Client behavior
if (response.semantic_results) {
  // Use semantic ranking
} else {
  // Use contextual ranking (backward compatible)
}
```

### Zero-Downtime Deployment

```bash
1. Deploy vector infrastructure (schema changes only)
2. Enable 1% traffic to semantic path
3. Monitor metrics for 24 hours
4. Increase traffic: 1% → 10% → 50% → 100%
5. After 1 week at 100%, mark as stable
```

---

## METRICS TO TRACK

### During Vector Integration

| Metric | Target | Method |
|--------|--------|--------|
| Ranking relevance | +20% improvement | User feedback surveys |
| Response time | <100ms additional | APM monitoring |
| API cost efficiency | <$50/month | OpenAI billing |
| False negatives | <5% | Comparison queries |
| Model consistency | >95% | Embedding stability |

### Success Criteria

- ✅ No ranking regression vs. contextual-only
- ✅ <5% additional API response time
- ✅ <$50/month API costs
- ✅ >95% user satisfaction with semantic results
- ✅ Zero enterprise customer complaints about semantic behavior

---

## CONCLUSION

The infrastructure prepared in PHASE-X.10A provides a stable foundation for semantic integration in PHASE-X.11 and beyond. The hybrid retrieval engine can smoothly transition from keyword-contextual to keyword-contextual-semantic ranking without breaking changes.

**Current Status:** READY FOR SEMANTIC INTEGRATION

**Next Step:** Begin PHASE-X.11 planning upon completion of PHASE-X.10A validation

---

**Document Prepared By:** Enterprise Architect  
**Date:** 2026-05-16  
**Status:** PLANNING COMPLETE - READY FOR EXECUTION
