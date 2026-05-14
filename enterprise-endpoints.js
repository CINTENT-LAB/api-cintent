/**
 * CINTENT Platform v2 - Enterprise Operationalization Endpoints
 * Versioning, Dependencies, SDKs, Access Policies, Visualization, Health, Audit, Metadata Automation
 */

const express = require('express');
const router = express.Router();

// Middleware to verify authentication
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  // JWT verification would happen here
  req.user = { userId: token }; // Simplified for this example
  next();
};

// ============================================================
// 1. API VERSIONING ENDPOINTS
// ============================================================

/**
 * GET /api/versions/:apiKey
 * Get all versions of an API with lifecycle state
 */
router.get('/versions/:apiKey', authenticateToken, async (req, res) => {
  try {
    const { apiKey } = req.params;

    const query = `
      SELECT
        av.id,
        av.version_string,
        av.major, av.minor, av.patch,
        av.lifecycle_state,
        av.released_at,
        av.deprecated_at,
        av.sunset_date,
        av.breaking_changes,
        av.migration_guide,
        av.backward_compatible_to,
        av.release_notes,
        av.visibility,
        (SELECT COUNT(*) FROM api_executions ae
         WHERE ae.api_metadata_id = am.id) as usage_count
      FROM api_versions av
      JOIN api_metadata am ON av.api_metadata_id = am.id
      WHERE am.api_key = $1
      ORDER BY av.major DESC, av.minor DESC, av.patch DESC
    `;

    const result = await pool.query(query, [apiKey]);

    res.json({
      success: true,
      apiKey,
      versions: result.rows,
      currentVersion: result.rows[0],
      deprecatedVersions: result.rows.filter(v => v.lifecycle_state === 'deprecated'),
      deprecationTimeline: result.rows
        .filter(v => v.deprecated_at)
        .map(v => ({
          version: v.version_string,
          deprecatedAt: v.deprecated_at,
          sunsetDate: v.sunset_date,
          migrationGuide: v.migration_guide
        }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

/**
 * POST /api/versions/create
 * Create a new API version
 */
router.post('/versions/create', authenticateToken, async (req, res) => {
  try {
    const { apiKey, versionString, lifecycleState, breakingChanges, migrationGuide } = req.body;

    // Parse semantic version
    const [major, minor, patch] = versionString.split('.').map(Number);

    const result = await pool.query(
      `INSERT INTO api_versions
      (api_metadata_id, major, minor, patch, version_string, lifecycle_state, breaking_changes, migration_guide, released_at)
      SELECT am.id, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP
      FROM api_metadata am
      WHERE am.api_key = $1
      RETURNING *`,
      [apiKey, major, minor, patch, versionString, lifecycleState,
       JSON.stringify(breakingChanges), migrationGuide]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API not found' });
    }

    res.json({
      success: true,
      version: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

// ============================================================
// 2. API DEPENDENCY GRAPH ENDPOINTS
// ============================================================

/**
 * GET /api/dependencies/:apiKey
 * Get dependency graph for an API
 */
router.get('/dependencies/:apiKey', authenticateToken, async (req, res) => {
  try {
    const { apiKey } = req.params;

    const query = `
      SELECT
        ad.id,
        parent_api.api_key as parent_api_key,
        parent_api.name as parent_api_name,
        dependent_api.api_key as dependent_api_key,
        dependent_api.name as dependent_api_name,
        ad.dependency_type,
        ad.relationship,
        ad.criticality,
        ad.execution_order,
        ad.failure_mode,
        ad.description,
        ad.visual_metadata
      FROM api_dependencies ad
      JOIN api_metadata parent_api ON ad.parent_api_id = parent_api.id
      JOIN api_metadata dependent_api ON ad.dependent_api_id = dependent_api.id
      WHERE parent_api.api_key = $1 OR dependent_api.api_key = $1
      ORDER BY ad.dependency_type, ad.execution_order
    `;

    const result = await pool.query(query, [apiKey]);

    // Build dependency graph visualization
    const graph = {
      nodes: [],
      edges: result.rows.map(row => ({
        source: row.parent_api_key,
        target: row.dependent_api_key,
        type: row.dependency_type,
        criticality: row.criticality,
        order: row.execution_order
      }))
    };

    const uniqueApis = new Set();
    result.rows.forEach(row => {
      uniqueApis.add(row.parent_api_key);
      uniqueApis.add(row.dependent_api_key);
    });

    graph.nodes = Array.from(uniqueApis).map(apiKey => ({
      id: apiKey,
      name: apiKey
    }));

    // Analyze dependency metrics
    const metrics = {
      totalDependencies: result.rows.length,
      byType: {},
      criticalDependencies: result.rows.filter(r => r.criticality === 'critical').length,
      deepestChain: calculateDependencyDepth(result.rows, apiKey)
    };

    result.rows.forEach(row => {
      const type = row.dependency_type;
      metrics.byType[type] = (metrics.byType[type] || 0) + 1;
    });

    res.json({
      success: true,
      apiKey,
      dependencies: result.rows,
      graph,
      metrics
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dependencies' });
  }
});

/**
 * POST /api/dependencies/create
 * Create a dependency relationship
 */
router.post('/dependencies/create', authenticateToken, async (req, res) => {
  try {
    const { parentApiKey, dependentApiKey, dependencyType, criticality, description } = req.body;

    const result = await pool.query(
      `INSERT INTO api_dependencies
      (parent_api_id, dependent_api_id, dependency_type, criticality, description)
      SELECT
        (SELECT id FROM api_metadata WHERE api_key = $1),
        (SELECT id FROM api_metadata WHERE api_key = $2),
        $3, $4, $5
      RETURNING *`,
      [parentApiKey, dependentApiKey, dependencyType, criticality, description]
    );

    res.json({
      success: true,
      dependency: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create dependency' });
  }
});

// ============================================================
// 3. SDK AUTO-GENERATION ENDPOINTS
// ============================================================

/**
 * GET /api/sdks/:apiKey
 * Get available SDKs for an API
 */
router.get('/sdks/:apiKey', authenticateToken, async (req, res) => {
  try {
    const { apiKey } = req.params;

    const result = await pool.query(
      `SELECT
        sd.id,
        sd.language,
        sd.framework,
        sd.package_name,
        sd.version,
        sd.npm_registry_url,
        sd.pypi_registry_url,
        sd.github_url,
        sd.published_at,
        sd.download_count,
        sd.documentation
      FROM sdk_definitions sd
      JOIN api_metadata am ON sd.api_metadata_id = am.id
      WHERE am.api_key = $1
      ORDER BY sd.language`,
      [apiKey]
    );

    res.json({
      success: true,
      apiKey,
      sdks: result.rows,
      languages: result.rows.map(s => s.language),
      downloadStats: {
        total: result.rows.reduce((sum, s) => sum + s.download_count, 0),
        byLanguage: result.rows.reduce((acc, s) => {
          acc[s.language] = s.download_count;
          return acc;
        }, {})
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch SDKs' });
  }
});

/**
 * POST /api/sdks/generate
 * Auto-generate SDK from API metadata
 */
router.post('/sdks/generate', authenticateToken, async (req, res) => {
  try {
    const { apiKey, language } = req.body;

    // Fetch API metadata
    const apiResult = await pool.query(
      'SELECT * FROM api_metadata WHERE api_key = $1',
      [apiKey]
    );

    if (apiResult.rows.length === 0) {
      return res.status(404).json({ error: 'API not found' });
    }

    const api = apiResult.rows[0];

    // Generate SDK (simplified example)
    const sdkCode = generateSDK(api, language);
    const packageName = `cintent-${api.api_key.replace(/_/g, '-')}-sdk`;

    const result = await pool.query(
      `INSERT INTO sdk_definitions
      (api_metadata_id, language, framework, package_name, source_code, version, generated_at, auto_generate)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, true)
      ON CONFLICT (api_metadata_id, language) DO UPDATE SET
        source_code = $5,
        generated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [api.id, language, selectFramework(language), packageName, sdkCode, api.version || '1.0.0']
    );

    res.json({
      success: true,
      sdk: {
        ...result.rows[0],
        language,
        sourceCode: sdkCode
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate SDK' });
  }
});

// ============================================================
// 4. ACCESS POLICY ENGINE ENDPOINTS
// ============================================================

/**
 * GET /api/policies/:apiKey
 * Get access policies for an API
 */
router.get('/policies/:apiKey', authenticateToken, async (req, res) => {
  try {
    const { apiKey } = req.params;

    const result = await pool.query(
      `SELECT
        ap.id,
        ap.policy_type,
        ap.policy_name,
        ap.description,
        ap.allowed_tiers,
        ap.required_scopes,
        ap.runtime_restrictions,
        ap.simulation_only,
        ap.enterprise_only,
        ap.governance_restricted,
        ap.effective_from,
        ap.effective_until
      FROM access_policies ap
      JOIN api_metadata am ON ap.api_metadata_id = am.id
      WHERE am.api_key = $1 AND (ap.effective_until IS NULL OR ap.effective_until > CURRENT_TIMESTAMP)
      ORDER BY ap.policy_type`,
      [apiKey]
    );

    // Analyze policy restrictions
    const restrictions = {
      restrictedTiers: result.rows.reduce((acc, p) => {
        if (p.allowed_tiers) acc.push(...p.allowed_tiers);
        return acc;
      }, []),
      requiredScopes: result.rows.reduce((acc, p) => {
        if (p.required_scopes) acc.push(...p.required_scopes);
        return acc;
      }, []),
      simulationOnly: result.rows.some(p => p.simulation_only),
      enterpriseOnly: result.rows.some(p => p.enterprise_only),
      governanceRestricted: result.rows.some(p => p.governance_restricted)
    };

    res.json({
      success: true,
      apiKey,
      policies: result.rows,
      restrictions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

/**
 * POST /api/policies/check-access
 * Check if user has access to API
 */
router.post('/policies/check-access', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { apiKey } = req.body;

    // Get user subscription
    const subResult = await pool.query(
      'SELECT plan FROM user_subscriptions WHERE user_id = $1',
      [userId]
    );

    if (subResult.rows.length === 0) {
      return res.status(403).json({ error: 'No subscription found' });
    }

    const userPlan = subResult.rows[0].plan;

    // Get API and policies
    const apiResult = await pool.query(
      'SELECT am.id, am.min_tier FROM api_metadata am WHERE am.api_key = $1',
      [apiKey]
    );

    if (apiResult.rows.length === 0) {
      return res.status(404).json({ error: 'API not found' });
    }

    const api = apiResult.rows[0];

    // Get access policies
    const policyResult = await pool.query(
      `SELECT * FROM access_policies
      WHERE api_metadata_id = $1 AND (effective_until IS NULL OR effective_until > CURRENT_TIMESTAMP)`,
      [api.id]
    );

    // Check access
    const tierLevels = { free: 0, developer: 1, professional: 2, enterprise: 3 };
    const userLevel = tierLevels[userPlan] || 0;
    const minLevel = tierLevels[api.min_tier] || 0;

    let hasAccess = userLevel >= minLevel;
    let denialReasons = [];

    // Check policy restrictions
    policyResult.rows.forEach(policy => {
      if (policy.enterprise_only && userPlan !== 'enterprise') {
        hasAccess = false;
        denialReasons.push('Enterprise-only API');
      }
      if (policy.simulation_only) {
        // User can access but only in simulated mode
      }
      if (policy.allowed_tiers && !policy.allowed_tiers.includes(userPlan)) {
        hasAccess = false;
        denialReasons.push(`Requires one of: ${policy.allowed_tiers.join(', ')}`);
      }
    });

    res.json({
      success: true,
      apiKey,
      userPlan,
      hasAccess,
      denialReasons,
      requiredUpgrade: !hasAccess ? (minLevel > userLevel ? 'higher_tier' : null) : null,
      accessMode: policyResult.rows.some(p => p.simulation_only) ? 'simulated_only' : 'full_access'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check access' });
  }
});

// ============================================================
// 5. COGNITIVE EXECUTION VISUALIZER ENDPOINTS
// ============================================================

/**
 * GET /api/visualize/execution/:executionId
 * Get comprehensive visualization data for an execution
 */
router.get('/visualize/execution/:executionId', authenticateToken, async (req, res) => {
  try {
    const { executionId } = req.params;

    const result = await pool.query(
      `SELECT
        ev.id,
        ev.orchestration_graph,
        ev.replay_timeline,
        ev.governance_propagation,
        ev.confidence_chart,
        ev.sync_graph,
        ev.execution_lineage,
        ae.api_metadata_id,
        ae.confidence_score,
        am.api_key,
        am.name as api_name
      FROM execution_visualizations ev
      JOIN api_executions ae ON ev.execution_id = ae.id
      JOIN api_metadata am ON ae.api_metadata_id = am.id
      WHERE ae.id = $1`,
      [executionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    const viz = result.rows[0];

    res.json({
      success: true,
      executionId,
      visualizations: {
        orchestrationGraph: viz.orchestration_graph,
        replayTimeline: viz.replay_timeline,
        governancePropagation: viz.governance_propagation,
        confidenceChart: viz.confidence_chart,
        synchronizationGraph: viz.sync_graph,
        executionLineage: viz.execution_lineage,
        overallConfidence: viz.confidence_score
      },
      api: {
        key: viz.api_key,
        name: viz.api_name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch visualization' });
  }
});

// ============================================================
// 6. API HEALTH & STATUS ENGINE ENDPOINTS
// ============================================================

/**
 * GET /api/health/status/:apiKey
 * Get comprehensive health status for an API
 */
router.get('/health/status/:apiKey', authenticateToken, async (req, res) => {
  try {
    const { apiKey } = req.params;

    const result = await pool.query(
      `SELECT
        ahs.*,
        am.api_key,
        am.name,
        (SELECT COUNT(*) FROM api_status_history WHERE api_metadata_id = ahs.api_metadata_id LIMIT 30) as recent_changes
      FROM api_health_status ahs
      JOIN api_metadata am ON ahs.api_metadata_id = am.id
      WHERE am.api_key = $1`,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API not found' });
    }

    const health = result.rows[0];

    // Get status history
    const historyResult = await pool.query(
      `SELECT * FROM api_status_history
      WHERE api_metadata_id = $1
      ORDER BY created_at DESC
      LIMIT 20`,
      [(await pool.query('SELECT id FROM api_metadata WHERE api_key = $1', [apiKey])).rows[0].id]
    );

    res.json({
      success: true,
      apiKey,
      health: {
        currentStatus: health.status,
        healthScore: health.health_score,
        uptime: health.uptime_percentage,
        responseTime: health.response_time_ms,
        errorRate: health.error_rate,
        successRate: health.success_rate,
        slaStatus: health.sla_status,
        lastCheck: health.last_check
      },
      metrics: {
        responseTime: health.response_time_ms,
        errorRate: health.error_rate,
        successRate: health.success_rate,
        uptime: health.uptime_percentage
      },
      statusHistory: historyResult.rows,
      statusMessage: health.status_message
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch health status' });
  }
});

// ============================================================
// 7. ENTERPRISE AUDIT EXPORTS ENDPOINTS
// ============================================================

/**
 * POST /api/audit/export
 * Create an audit export
 */
router.post('/audit/export', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { exportType, format, executionsIncluded, description } = req.body;

    const result = await pool.query(
      `INSERT INTO audit_exports
      (user_id, export_type, format, executions_included, description, retention_days, expires_at)
      VALUES ($1, $2, $3, $4, $5, 90, CURRENT_TIMESTAMP + INTERVAL '90 days')
      RETURNING *`,
      [userId, exportType, format, JSON.stringify(executionsIncluded), description]
    );

    res.json({
      success: true,
      export: result.rows[0],
      message: `${format.toUpperCase()} export created. Download will be available shortly.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create export' });
  }
});

/**
 * GET /api/audit/exports
 * List user's audit exports
 */
router.get('/audit/exports', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await pool.query(
      `SELECT
        id, export_type, format, description, requested_at, completed_at,
        download_count, expires_at
      FROM audit_exports
      WHERE user_id = $1
      ORDER BY requested_at DESC
      LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      exports: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch exports' });
  }
});

// ============================================================
// 8. METADATA POPULATION AUTOMATION ENDPOINTS
// ============================================================

/**
 * POST /api/metadata/import
 * Import metadata from OpenAPI/GraphQL/etc
 */
router.post('/metadata/import', authenticateToken, async (req, res) => {
  try {
    const { sourceType, sourceUrl, sourceContent, sourceVersion } = req.body;

    const result = await pool.query(
      `INSERT INTO metadata_sources
      (source_type, source_url, source_content, source_version, auto_update, last_synced)
      VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
      RETURNING *`,
      [sourceType, sourceUrl, sourceContent, sourceVersion]
    );

    res.json({
      success: true,
      source: result.rows[0],
      message: 'Metadata source registered. Auto-generation will begin shortly.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to import metadata source' });
  }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function calculateDependencyDepth(deps, apiKey) {
  let maxDepth = 0;

  function dfs(key, depth = 0) {
    maxDepth = Math.max(maxDepth, depth);
    const children = deps.filter(d => d.parent_api_key === key);
    children.forEach(child => dfs(child.dependent_api_key, depth + 1));
  }

  dfs(apiKey);
  return maxDepth;
}

function generateSDK(api, language) {
  const base = {
    typescript: `export class CINTENTClient {
  constructor(apiKey: string) { this.apiKey = apiKey; }
  async execute(params: any) { /* Generated from ${api.api_key} */ }
}`,
    python: `class CINTENTClient:
  def __init__(self, api_key):
    self.api_key = api_key
  def execute(self, params):
    # Generated from ${api.api_key}
    pass`,
    rest: `# REST Client for ${api.api_key}
POST https://api-cintent.cognivantalabs.com/api/${api.api_key}/execute
Authorization: Bearer {apiKey}
Content-Type: application/json`
  };

  return base[language] || base.typescript;
}

function selectFramework(language) {
  const frameworks = { typescript: 'axios', python: 'requests', rest: 'curl' };
  return frameworks[language] || 'custom';
}

module.exports = router;
