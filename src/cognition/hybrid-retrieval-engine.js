/**
 * HYBRID COGNITIVE RETRIEVAL ENGINE
 *
 * PHASE-X.10A: Honest, Contextual, Orchestration-Aware Intelligence
 *
 * This module replaces misleading semantic claims with honest contextual retrieval
 * using weighted ranking across:
 * - Keyword relevance (proven implementation)
 * - Orchestration context (workspace state)
 * - Replay awareness (historical patterns)
 * - Governance context (policy alignment)
 * - Domain context (sector specificity)
 *
 * FUTURE PREPARATION: Infrastructure ready for pgvector integration without breaking stability
 */

const DEFAULT_WEIGHTS = {
  keyword_relevance: 0.35,        // Primary: proven token-based matching
  orchestration_context: 0.25,    // Workspace state, active APIs, workflows
  replay_awareness: 0.15,         // Historical execution patterns
  governance_context: 0.10,       // Policy alignment, compliance
  domain_context: 0.10,           // Sector-specific relevance
  recency: 0.05                   // Temporal relevance
};

/**
 * Hybrid Retrieval Engine
 *
 * Provides contextual cognitive retrieval without false semantic claims
 */
class HybridRetrievalEngine {
  constructor(options = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...options.weights };
    this.catalog = [];
    this.executionEvents = [];
    this.simulationEvents = [];
    this.replayLedger = [];
    this.governancePolicies = [];
  }

  /**
   * SCORE CALCULATION: Keyword Relevance
   *
   * Honest implementation: token-based keyword matching
   * NOT: semantic vector similarity
   *
   * Returns: 0-1 normalized score based on query token frequency
   */
  scoreKeywordRelevance(query, apiMetadata) {
    const tokens = this.tokenizeQuery(query);
    if (tokens.length === 0) return 0;

    const sources = [
      apiMetadata.name,
      apiMetadata.short_description,
      apiMetadata.full_description,
      (apiMetadata.tags || []).join(' '),
      (apiMetadata.capabilities || []).join(' '),
      apiMetadata.operational_notes,
      (apiMetadata.domains || []).join(' '),
      (apiMetadata.domain_key || ''),
      (apiMetadata.category_name || '')
    ].join(' ').toLowerCase();

    const matches = tokens.filter(token => sources.includes(token)).length;
    return Math.min(matches / tokens.length, 1.0);
  }

  /**
   * SCORE CALCULATION: Orchestration Context
   *
   * Weights APIs based on active workspace state:
   * - Current domain match
   * - Active API usage
   * - Workflow context
   * - Application context
   *
   * Returns: 0-1 normalized score
   */
  scoreOrchestrationContext(apiMetadata, workspaceContext = {}) {
    let score = 0;
    let factors = 0;

    // Domain match (highest priority in orchestration context)
    if (workspaceContext.active_domain &&
        (apiMetadata.domain_key === workspaceContext.active_domain ||
         apiMetadata.category_name === workspaceContext.active_domain)) {
      score += 1.0;
      factors++;
    }

    // Active API set match
    if (workspaceContext.active_apis && Array.isArray(workspaceContext.active_apis)) {
      const isActive = workspaceContext.active_apis.includes(apiMetadata.api_key);
      if (isActive) score += 0.8;
      factors++;
    }

    // Workflow context
    if (workspaceContext.active_workflow &&
        apiMetadata.orchestration_examples &&
        Array.isArray(apiMetadata.orchestration_examples)) {
      const matches = apiMetadata.orchestration_examples.filter(ex =>
        ex.workflow_type === workspaceContext.active_workflow ||
        (ex.description && ex.description.includes(workspaceContext.active_workflow))
      ).length;
      if (matches > 0) {
        score += Math.min(matches * 0.3, 0.6);
        factors++;
      }
    }

    // Application context
    if (workspaceContext.active_application &&
        apiMetadata.applications &&
        Array.isArray(apiMetadata.applications)) {
      const isRelevant = apiMetadata.applications.includes(workspaceContext.active_application);
      if (isRelevant) score += 0.5;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * SCORE CALCULATION: Replay Awareness
   *
   * Scores APIs based on historical execution patterns:
   * - How often used in past orchestrations
   * - Success rate in replays
   * - Common dependency chains
   *
   * Returns: 0-1 normalized score based on execution history
   */
  scoreReplayAwareness(apiMetadata, replayHistory = []) {
    if (!replayHistory || replayHistory.length === 0) return 0;

    const apiUsage = replayHistory.filter(event =>
      event.apis && Array.isArray(event.apis) && event.apis.includes(apiMetadata.api_key)
    ).length;

    const successfulUsage = replayHistory.filter(event =>
      event.apis && event.apis.includes(apiMetadata.api_key) &&
      event.status === 'success'
    ).length;

    if (apiUsage === 0) return 0;

    const usageFrequency = Math.min(apiUsage / 10, 1.0);
    const successRate = successfulUsage / apiUsage;

    return (usageFrequency * 0.6) + (successRate * 0.4);
  }

  /**
   * SCORE CALCULATION: Governance Context
   *
   * Scores APIs based on governance alignment:
   * - Policy compliance
   * - Access tier matching
   * - Licensing alignment
   * - Regulatory domain match
   *
   * Returns: 0-1 normalized score
   */
  scoreGovernanceContext(apiMetadata, governanceContext = {}) {
    let score = 0;
    let factors = 0;

    // Access tier alignment
    if (governanceContext.access_tier && apiMetadata.min_tier) {
      const tierRank = { free: 0, dev: 1, pro: 2, enterprise: 3 };
      const userRank = tierRank[governanceContext.access_tier] || 0;
      const apiRank = tierRank[apiMetadata.min_tier] || 0;

      if (userRank >= apiRank) {
        score += 1.0;
      } else {
        score += Math.max(0, 1.0 - (apiRank - userRank) * 0.3);
      }
      factors++;
    }

    // Governance support check
    if (apiMetadata.governance_support === true) {
      score += 0.5;
      factors++;
    }

    // Compliance metadata match
    if (governanceContext.compliance_requirements &&
        apiMetadata.compliance_metadata) {
      const matches = governanceContext.compliance_requirements.filter(req =>
        apiMetadata.compliance_metadata.certifications &&
        apiMetadata.compliance_metadata.certifications.includes(req)
      ).length;

      if (matches > 0) {
        score += Math.min(matches * 0.3, 0.7);
        factors++;
      }
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * SCORE CALCULATION: Domain Context
   *
   * Scores APIs based on sector specificity and domain categorization
   *
   * Returns: 0-1 normalized score
   */
  scoreDomainContext(apiMetadata, domainContext = {}) {
    if (!domainContext || !domainContext.primary_domain) return 0;

    let score = 0;

    // Direct domain match
    if (apiMetadata.domain_key === domainContext.primary_domain) {
      score += 1.0;
    } else if (apiMetadata.domains && Array.isArray(apiMetadata.domains)) {
      // Secondary domain match
      if (apiMetadata.domains.includes(domainContext.primary_domain)) {
        score += 0.6;
      }
    }

    // Domain specialization
    if (domainContext.specializations && Array.isArray(domainContext.specializations)) {
      const matchingSpecializations = domainContext.specializations.filter(spec =>
        apiMetadata.tags && apiMetadata.tags.includes(spec)
      ).length;

      if (matchingSpecializations > 0) {
        score += Math.min(matchingSpecializations * 0.2, 0.4);
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * SCORE CALCULATION: Recency
   *
   * Scores APIs based on update recency and lifecycle state
   *
   * Returns: 0-1 normalized score
   */
  scoreRecency(apiMetadata) {
    if (!apiMetadata.updated_at) return 0.5;

    const lifecycle_scores = {
      'active': 1.0,
      'production': 1.0,
      'stable': 0.9,
      'beta': 0.7,
      'deprecated': 0.2,
      'retired': 0.0
    };

    const lifecycleScore = lifecycle_scores[apiMetadata.lifecycle_state] || 0.5;

    // Recency bonus: fresher is better
    const daysSinceUpdate = (Date.now() - new Date(apiMetadata.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    const recencyBonus = Math.max(0, 1.0 - (daysSinceUpdate / 365)); // 0 if older than 1 year

    return (lifecycleScore * 0.7) + (recencyBonus * 0.3);
  }

  /**
   * HYBRID RANKING: Weighted Multi-Factor Scoring
   *
   * Combines all scoring factors into a single honest contextual score
   *
   * NO false semantic claims
   * NO pgvector references in ranking logic
   * PURE weighted combination of proven scoring methods
   */
  rankApisByHybridScore(query, apis, context = {}) {
    const scores = apis.map(api => {
      const keywordScore = this.scoreKeywordRelevance(query, api);
      const orchestrationScore = this.scoreOrchestrationContext(api, context.workspace);
      const replayScore = this.scoreReplayAwareness(api, context.replay_history);
      const governanceScore = this.scoreGovernanceContext(api, context.governance);
      const domainScore = this.scoreDomainContext(api, context.domain);
      const recencyScore = this.scoreRecency(api);

      // Weighted combination
      const hybridScore =
        (keywordScore * this.weights.keyword_relevance) +
        (orchestrationScore * this.weights.orchestration_context) +
        (replayScore * this.weights.replay_awareness) +
        (governanceScore * this.weights.governance_context) +
        (domainScore * this.weights.domain_context) +
        (recencyScore * this.weights.recency);

      return {
        api,
        scores: {
          keyword: keywordScore,
          orchestration: orchestrationScore,
          replay: replayScore,
          governance: governanceScore,
          domain: domainScore,
          recency: recencyScore
        },
        hybrid_score: Math.max(0, Math.min(1, hybridScore)),
        scoring_method: 'hybrid-contextual-weighted'
      };
    });

    return scores
      .filter(item => item.hybrid_score > 0.1)
      .sort((a, b) => b.hybrid_score - a.hybrid_score);
  }

  /**
   * TOKEN QUERY PROCESSOR
   *
   * Tokenizes user query into searchable terms
   * PROVEN IMPLEMENTATION (not replaced, enhanced)
   */
  tokenizeQuery(query = '') {
    return String(query)
      .toLowerCase()
      .split(/[\s\W]+/)
      .filter(token => token.length > 2)
      .reduce((unique, token) =>
        unique.includes(token) ? unique : [...unique, token], []);
  }

  /**
   * CONTEXTUAL MEMORY RETRIEVAL
   *
   * Retrieves relevant past Ask COGNI sessions
   * Uses ILIKE text search (proven implementation)
   * NO vector similarity claims
   */
  async retrieveContextualMemory(query, workspaceId, topN = 3) {
    // This is a reference for the PostgreSQL query implementation
    // Actual execution happens in persistence layer
    return {
      method: 'lexical-text-search',
      query_type: 'contextual-memory-retrieval',
      search_fields: ['query', 'response_summary', 'embedding_text'],
      search_method: 'ilike-pattern-matching',
      results_limit: topN
    };
  }

  /**
   * FUTURE VECTOR PREPARATION
   *
   * When vector search is implemented, this structure supports it without breaking stability
   */
  async retrieveSemanticSimilarity(query, workspaceId, options = {}) {
    // FUTURE IMPLEMENTATION PLACEHOLDER
    // This will be populated in PHASE-X.11 when vector integration is ready
    return {
      status: 'not_implemented',
      message: 'Vector similarity search planned for PHASE-X.11',
      fallback_method: 'lexical-text-search',
      infrastructure: 'pgvector ready',
      prerequisite: 'OpenAI embedding integration'
    };
  }
}

module.exports = {
  HybridRetrievalEngine,
  DEFAULT_WEIGHTS,
  createHybridRetrieval: (options) => new HybridRetrievalEngine(options)
};
