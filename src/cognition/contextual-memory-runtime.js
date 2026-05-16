/**
 * CONTEXTUAL MEMORY RUNTIME
 *
 * PHASE-X.10A: Enhance Ask COGNI continuity through workspace history,
 * replay patterns, and orchestration lineage
 *
 * Improves Ask COGNI session continuity by maintaining:
 * - Query history per workspace
 * - Response effectiveness tracking
 * - Domain switch patterns
 * - Workflow evolution tracking
 * - Execution success patterns
 */

const DEFAULT_MEMORY_CONFIG = {
  maxSessionLength: 100,
  contextWindowSize: 5,
  relevanceDecayFactor: 0.9,
  recencyBias: 0.2
};

class ContextualMemoryRuntime {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...options };
    this.sessionCache = new Map();
  }

  /**
   * RETRIEVE CONTEXTUAL WORKSPACE MEMORY
   *
   * Pulls complete workspace history to inform Ask COGNI decisions
   */
  async retrieveWorkspaceMemory(tenantId, workspaceId) {
    const query = `
      SELECT
        workspace_id,
        tenant_id,
        session_id,
        domain,
        application_id,
        selected_apis,
        selected_workflow,
        selected_simulation,
        state,
        updated_at,
        created_at
      FROM workspaces
      WHERE workspace_id = $1 AND tenant_id = $2
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    try {
      const result = await this.pool.query(query, [workspaceId, tenantId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Workspace memory retrieval error:', error);
      return null;
    }
  }

  /**
   * RETRIEVE ORCHESTRATION LINEAGE
   *
   * Traces execution chain to understand workflow patterns
   */
  async retrieveOrchestrationLineage(tenantId, workspaceId, limit = 10) {
    const query = `
      SELECT
        id,
        tenant_id,
        workspace_id,
        status,
        apis_used,
        execution_order,
        total_duration,
        success_count,
        failure_count,
        created_at,
        updated_at
      FROM orchestration_runs
      WHERE tenant_id = $1 AND workspace_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;

    try {
      const result = await this.pool.query(query, [tenantId, workspaceId, limit]);
      return result.rows || [];
    } catch (error) {
      console.error('Orchestration lineage retrieval error:', error);
      return [];
    }
  }

  /**
   * RETRIEVE REPLAY PATTERN HISTORY
   *
   * Analyzes successful replay reconstructions to identify patterns
   */
  async retrieveReplayPatterns(tenantId, workspaceId, limit = 20) {
    const query = `
      SELECT
        id,
        tenant_id,
        workspace_id,
        event_type,
        replay_source,
        apis_involved,
        reconstruction_status,
        success_rate,
        created_at
      FROM replay_events
      WHERE tenant_id = $1 AND workspace_id = $2 AND reconstruction_status = 'success'
      ORDER BY created_at DESC
      LIMIT $3
    `;

    try {
      const result = await this.pool.query(query, [tenantId, workspaceId, limit]);
      return result.rows || [];
    } catch (error) {
      console.error('Replay pattern retrieval error:', error);
      return [];
    }
  }

  /**
   * BUILD CONTEXTUAL QUERY ENHANCEMENT
   *
   * Augments user query with workspace context for better retrieval
   * WITHOUT adding false semantic claims
   */
  buildContextualQueryEnhancement(query, workspaceMemory, orchestrationHistory) {
    const enhancements = [];

    // Add domain context
    if (workspaceMemory && workspaceMemory.domain) {
      enhancements.push(`domain:${workspaceMemory.domain}`);
    }

    // Add application context
    if (workspaceMemory && workspaceMemory.application_id) {
      enhancements.push(`app:${workspaceMemory.application_id}`);
    }

    // Add workflow context
    if (workspaceMemory && workspaceMemory.selected_workflow) {
      enhancements.push(`workflow:${workspaceMemory.selected_workflow}`);
    }

    // Add active API context
    if (workspaceMemory && workspaceMemory.selected_apis) {
      const apis = Array.isArray(workspaceMemory.selected_apis)
        ? workspaceMemory.selected_apis
        : JSON.parse(workspaceMemory.selected_apis || '[]');
      if (apis.length > 0) {
        enhancements.push(`active_apis:${apis.slice(0, 3).join(',')}`);
      }
    }

    // Add recent success patterns
    if (orchestrationHistory && orchestrationHistory.length > 0) {
      const successfulOrchestration = orchestrationHistory.find(o => o.status === 'success');
      if (successfulOrchestration && successfulOrchestration.apis_used) {
        enhancements.push(`recent_success_apis:${successfulOrchestration.apis_used.slice(0, 2).join(',')}`);
      }
    }

    return {
      original_query: query,
      contextual_enhancements: enhancements,
      enhanced_query: `${query} ${enhancements.join(' ')}`,
      context_sources: ['workspace_state', 'orchestration_history', 'replay_patterns']
    };
  }

  /**
   * RETRIEVE MEMORY EPISODES
   *
   * Gets relevant past Ask COGNI sessions from ask_cogni_sessions table
   */
  async retrieveMemoryEpisodes(tenantId, workspaceId, query, limit = 5) {
    const query_sql = `
      SELECT
        id,
        tenant_id,
        workspace_id,
        query,
        response_summary,
        embedding_text,
        apis_recommended,
        user_feedback,
        created_at
      FROM ask_cogni_sessions
      WHERE tenant_id = $1
        AND workspace_id = $2
        AND deleted_at IS NULL
        AND (
          query ILIKE $3
          OR response_summary ILIKE $3
          OR embedding_text ILIKE $3
        )
      ORDER BY created_at DESC
      LIMIT $4
    `;

    try {
      const result = await this.pool.query(query_sql, [
        tenantId,
        workspaceId,
        `%${query}%`,
        limit
      ]);
      return result.rows || [];
    } catch (error) {
      console.error('Memory episode retrieval error:', error);
      return [];
    }
  }

  /**
   * CALCULATE CONTEXTUAL RELEVANCE SCORE
   *
   * Determines how relevant a past episode is to current context
   */
  calculateEpisodeRelevance(episode, currentContext, decayFactor = 0.95) {
    let relevanceScore = 0;
    const daysSinceEpisode = (Date.now() - new Date(episode.created_at).getTime()) / (1000 * 60 * 60 * 24);

    // Recency score (decay with time)
    const recencyScore = Math.pow(decayFactor, daysSinceEpisode);
    relevanceScore += recencyScore * 0.4;

    // Context match score
    if (currentContext.domain === episode.context?.domain) {
      relevanceScore += 0.3;
    }

    // Workspace match score
    if (currentContext.workspace_id === episode.workspace_id) {
      relevanceScore += 0.2;

      // Boost if same orchestration type
      if (currentContext.workflow === episode.context?.workflow) {
        relevanceScore += 0.1;
      }
    }

    return Math.min(relevanceScore, 1.0);
  }

  /**
   * RETRIEVE CONTEXTUAL GUIDANCE
   *
   * Provides guidance based on workspace history without claiming semantic search
   */
  async retrieveContextualGuidance(tenantId, workspaceId, query) {
    try {
      const workspaceMemory = await this.retrieveWorkspaceMemory(tenantId, workspaceId);
      const orchestrationHistory = await this.retrieveOrchestrationLineage(tenantId, workspaceId, 5);
      const replayPatterns = await this.retrieveReplayPatterns(tenantId, workspaceId, 10);
      const memoryEpisodes = await this.retrieveMemoryEpisodes(tenantId, workspaceId, query, 3);

      return {
        workspace_memory: workspaceMemory,
        orchestration_history: orchestrationHistory,
        replay_patterns: replayPatterns,
        memory_episodes: memoryEpisodes,
        guidance: this.synthesizeGuidance(
          workspaceMemory,
          orchestrationHistory,
          replayPatterns,
          memoryEpisodes
        )
      };
    } catch (error) {
      console.error('Contextual guidance retrieval error:', error);
      return {
        workspace_memory: null,
        orchestration_history: [],
        replay_patterns: [],
        memory_episodes: [],
        guidance: null,
        error: error.message
      };
    }
  }

  /**
   * SYNTHESIZE GUIDANCE
   *
   * Creates contextual guidance statements based on retrieved history
   */
  synthesizeGuidance(workspace, orchestrations, replays, episodes) {
    const guidance = [];

    // Domain continuity guidance
    if (workspace && workspace.domain) {
      guidance.push(`You're working in the ${workspace.domain} domain. Recent APIs in this domain: ${workspace.selected_apis ? workspace.selected_apis.slice(0, 2).join(', ') : 'none'}`);
    }

    // Orchestration success guidance
    if (orchestrations && orchestrations.length > 0) {
      const successRate = orchestrations.filter(o => o.status === 'success').length / orchestrations.length;
      if (successRate > 0.7) {
        guidance.push(`Your recent orchestrations have a ${Math.round(successRate * 100)}% success rate. Consider APIs from successful chains.`);
      }
    }

    // Replay pattern guidance
    if (replays && replays.length > 0) {
      guidance.push(`Recent replay patterns show ${replays.length} successful reconstructions. Similar patterns may apply to current query.`);
    }

    // Similar query guidance
    if (episodes && episodes.length > 0) {
      const mostRelevant = episodes[0];
      guidance.push(`Similar query ${Math.round((Date.now() - new Date(mostRelevant.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago recommended: ${mostRelevant.apis_recommended?.slice(0, 2).join(', ') || 'unknown'}`);
    }

    return guidance;
  }

  /**
   * PERSIST MEMORY EPISODE
   *
   * Stores current Ask COGNI interaction for future contextual retrieval
   */
  async persistMemoryEpisode(tenantId, workspaceId, query, response, apiResults, userFeedback = null) {
    const episode_query = `
      INSERT INTO ask_cogni_sessions (
        tenant_id,
        workspace_id,
        query,
        response_summary,
        embedding_text,
        apis_recommended,
        user_feedback,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id
    `;

    try {
      const result = await this.pool.query(episode_query, [
        tenantId,
        workspaceId,
        query,
        response,
        JSON.stringify({ query, response, apis: apiResults }),
        JSON.stringify(apiResults.map(api => ({ key: api.api_key, name: api.name }))),
        userFeedback
      ]);

      return {
        status: 'persisted',
        episode_id: result.rows[0].id
      };
    } catch (error) {
      console.error('Memory episode persistence error:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = {
  ContextualMemoryRuntime,
  DEFAULT_MEMORY_CONFIG,
  createContextualMemory: (pool, options) => new ContextualMemoryRuntime(pool, options)
};
