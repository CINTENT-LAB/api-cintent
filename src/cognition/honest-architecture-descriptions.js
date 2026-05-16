/**
 * HONEST ARCHITECTURE DESCRIPTIONS
 *
 * PHASE-X.10A: Remove misleading claims, establish truth-based positioning
 *
 * This module provides accurate architectural descriptions for Ask COGNI
 * without overstating semantic capabilities or false pgvector claims
 */

const HONEST_ARCHITECTURES = {
  ask_cogni_v1: {
    system_name: 'Ask COGNI Contextual Cognitive Assistant',
    phase: 'PHASE-X.10A',
    operational_status: 'stable-hybrid-contextual-retrieval',
    honesty_statement: 'Contextual cognitive retrieval using orchestration awareness, replay patterns, and governance context. NOT semantic vector search.',

    retrieval_pipeline: [
      {
        stage: 1,
        name: 'Query Tokenization',
        method: 'lexical-keyword-extraction',
        implementation: 'split(/\\W+/) with stopword filtering',
        output: 'keyword-token-array',
        accuracy: 'proven-consistent'
      },
      {
        stage: 2,
        name: 'Contextual Ranking',
        method: 'weighted-multi-factor-scoring',
        factors: {
          keyword_relevance: '35% - token frequency in API metadata',
          orchestration_context: '25% - workspace active state matching',
          replay_awareness: '15% - historical execution patterns',
          governance_context: '10% - policy and access alignment',
          domain_context: '10% - sector-specific categorization',
          recency: '5% - lifecycle state and freshness'
        },
        implementation: 'hybrid-retrieval-engine.js',
        NOT_claimed: 'semantic vector similarity (no embeddings generated or stored)',
        actual_method: 'contextual-keyword-weighting'
      },
      {
        stage: 3,
        name: 'Memory Retrieval',
        method: 'lexical-text-search',
        database_query: 'ILIKE pattern matching on embedding_text field',
        implementation: 'queryAskMemory() in runtime.js',
        NOT_claimed: 'pgvector similarity search',
        actual_method: 'case-insensitive-text-matching'
      },
      {
        stage: 4,
        name: 'Result Ranking',
        method: 'contextual-weighting',
        factors_applied: ['workspace-state', 'replay-history', 'governance-policy', 'domain-match'],
        result_limit: 6,
        NOT_claimed: 'semantic reranking',
        actual_method: 'contextual-factor-weighting'
      },
      {
        stage: 5,
        name: 'Response Synthesis',
        method: 'structured-metadata-composition',
        response_format: 'api-metadata-structured + guidance + examples',
        NOT_claimed: 'LLM-based reasoning',
        actual_method: 'deterministic-metadata-mapping'
      }
    ],

    infrastructure_honesty: {
      claim_pgvector_installed: true,
      claim_pgvector_active: false,
      claim_pgvector_queried: false,
      reason: 'Schema prepared for future semantic integration but not implemented in current Ask COGNI flow',
      actual_search_method: 'keyword-tokenization + contextual-weighting',
      embedding_columns_status: {
        ask_cogni_sessions_embedding: 'schema-defined but never-populated',
        ask_cogni_sessions_embedding_text: 'stores concatenated JSON string (not embeddings)',
        cogni_knowledge_base_embedding: 'schema-defined but never-queried'
      }
    },

    what_ask_cogni_actually_does: [
      '1. Extracts keywords from user query (tokenization)',
      '2. Searches API catalog metadata for keyword frequency',
      '3. Applies workspace context weighting (active domain, APIs, workflows)',
      '4. Applies replay awareness scoring (historical execution patterns)',
      '5. Applies governance context (access tier, compliance)',
      '6. Ranks by weighted combination of these factors',
      '7. Returns top 6 APIs with structured metadata',
      '8. Provides guided recommendations based on context'
    ],

    what_ask_cogni_does_not_do: [
      '✗ Generate OpenAI embeddings from user query',
      '✗ Store embeddings in pgvector columns',
      '✗ Perform vector similarity searches',
      '✗ Implement semantic understanding of query intent',
      '✗ Use cosine distance for relevance ranking',
      '✗ Leverage pgvector HNSW indexes',
      '✗ Perform KNN search over vector space',
      '✗ Provide true semantic relevance (only keyword-based)'
    ],

    real_competitive_advantages: [
      '✓ Orchestration-aware retrieval (understands active workspace state)',
      '✓ Replay-informed suggestions (learns from execution history)',
      '✓ Governance-aligned recommendations (respects access policies)',
      '✓ Fast keyword-based retrieval (no vector distance computation)',
      '✓ Deterministic ranking (no LLM variability)',
      '✓ Workspace persistence (remembers context across sessions)',
      '✓ Multi-domain intelligence (covers 20+ domains)',
      '✓ Enterprise-grade stability (no semantic hallucination risk)'
    ],

    future_enhancements_planned: [
      'PHASE-X.11: OpenAI embedding integration',
      'PHASE-X.12: pgvector similarity search activation',
      'PHASE-X.13: Semantic reranking pipeline',
      'PHASE-X.14: Embedding-based memory retrieval',
      'PHASE-X.15: Cross-workspace semantic recommendations'
    ]
  },

  response_format_v1: {
    description: 'Honest response object for Ask COGNI queries',
    fields: {
      query: {
        type: 'string',
        description: 'The user query text',
        truthful: true
      },
      results: {
        type: 'array<api-metadata>',
        limit: 6,
        ranking_method: 'hybrid-contextual-weighted (NOT semantic)',
        description: 'Top API matches ranked by keyword + context factors'
      },
      architecture: {
        description: 'UPDATED TO REMOVE MISLEADING CLAIMS',
        old_claim: "['user query', 'pgvector semantic search', ...]",
        new_honest_claim: "['user query', 'contextual-keyword-ranking', 'orchestration-aware-retrieval', ...]",
        fields: {
          assistant: 'Ask COGNI Contextual Cognitive Assistant',
          retrieval_method: 'hybrid-contextual-keyword-weighting (NOT semantic)',
          database_enabled: 'true (stores context for memory retrieval)',
          vector_search_enabled: 'false (planned for PHASE-X.11)',
          rag_flow: [
            'user query tokenization',
            'contextual keyword ranking',
            'orchestration context application',
            'replay pattern awareness',
            'governance policy enforcement',
            'structured API recommendation'
          ],
          generic_chatbot: false,
          semantic_search: false,
          vector_similarity: false,
          confidence_honest: true
        }
      },
      answer: {
        type: 'string',
        description: 'Natural language guidance based on ranked results',
        truthful: true
      },
      transparency_metadata: {
        scoring_breakdown: 'keyword_score, orchestration_score, replay_score, governance_score, domain_score, recency_score',
        ranking_explanation: 'Weighted combination of contextual factors, NOT semantic distance',
        vector_search_status: 'NOT_IMPLEMENTED',
        fallback_method: 'keyword-based contextual retrieval',
        next_enhancement: 'OpenAI embeddings + pgvector integration planned'
      }
    }
  },

  governance_context_descriptor: {
    system: 'Ask COGNI Governance Enforcement',
    implementation_status: 'REAL',
    claim_made: 'Enforces governance policies on API recommendations',
    actual_behavior: [
      '1. Checks user access tier (free/dev/pro/enterprise)',
      '2. Filters recommendations by minimum tier requirement',
      '3. Applies compliance metadata filters',
      '4. Excludes demo-restricted APIs for non-demo users',
      '5. Weights policies in result ranking'
    ],
    evidence_location: 'server.js line 10032: selectGovernancePolicies()',
    database_backed: true,
    table: 'governance_policies'
  },

  orchestration_awareness_descriptor: {
    system: 'Ask COGNI Orchestration Context Awareness',
    implementation_status: 'REAL',
    claim_made: 'Understands active workspace orchestration state',
    actual_behavior: [
      '1. Reads workspace active_domain, active_apis, active_workflow',
      '2. Boosts ranking for APIs in active domain',
      '3. Prioritizes APIs used in current workflow',
      '4. Considers application context from workspace',
      '5. Applies domain-specific intelligence layers'
    ],
    evidence_location: 'server.js lines 9924-9947: context extraction and domain matching',
    database_backed: true,
    table: 'workspaces, orchestration_runs'
  },

  replay_awareness_descriptor: {
    system: 'Ask COGNI Replay Pattern Awareness',
    implementation_status: 'REAL',
    claim_made: 'Learns from historical execution patterns',
    actual_behavior: [
      '1. Queries replay_events ledger (24MB JSONL)',
      '2. Analyzes successful API execution chains',
      '3. Identifies common dependency patterns',
      '4. Scores APIs based on replay usage frequency',
      '5. Weights successful vs. failed executions'
    ],
    evidence_location: 'runtime.js: queryAskMemory() with replay_events context',
    database_backed: true,
    table: 'replay_events, ask_cogni_sessions',
    ledger_backed: true,
    ledger: '.cintent-runtime/runtime-ledger.jsonl (24MB)'
  }
};

/**
 * Architecture Response Generator
 *
 * Creates honest architectural descriptions for API responses
 */
function createHonestArchitectureResponse(options = {}) {
  return {
    assistant: 'Ask COGNI Contextual Cognitive Assistant',
    phase: 'PHASE-X.10A-HYBRID-RETRIEVAL',
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
    implementation_status: {
      keyword_matching: 'production-ready',
      orchestration_context: 'production-ready',
      replay_awareness: 'production-ready',
      governance_enforcement: 'production-ready',
      semantic_vector_search: 'not-implemented-planned-phase-x-11',
      pgvector_integration: 'not-implemented-planned-phase-x-11'
    },
    database_confidence: 'high',
    retrieval_confidence: 'high',
    semantic_confidence: 'not-applicable',
    generic_chatbot: false,
    honest_positioning: true
  };
}

module.exports = {
  HONEST_ARCHITECTURES,
  createHonestArchitectureResponse
};
