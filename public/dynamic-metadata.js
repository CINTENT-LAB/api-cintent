(function() {
  async function loadCatalog() {
    try {
      const response = await fetch('/api/catalog');
      if (!response.ok) throw new Error(`Catalog fetch failed: ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.apis) || !payload.apis.length) return;

      const normalized = payload.apis.map(normalizeApiEntry);
      const merged = new Map(apiCatalog.map(entry => [entry.id, entry]));
      normalized.forEach(entry => {
        const existing = merged.get(entry.id) || {};
        merged.set(entry.id, { ...existing, ...entry });
      });
      apiCatalog.splice(0, apiCatalog.length, ...Array.from(merged.values()));

      if (!apiCatalog.some(a => a.id === state.selectedApiId)) {
        state.selectedApiId = apiCatalog.length ? apiCatalog[0].id : state.selectedApiId;
      }

      render();
    } catch (error) {
      console.warn('Dynamic metadata load failed:', error.message || error);
    }
  }

  function normalizeApiEntry(entry) {
    const endpoint = Array.isArray(entry.endpoints) ? entry.endpoints[0] || {} : {};
    const domain = entry.category || entry.category_name || 'platform';
    const stage = entry.status || entry.status_name || 'production';
    const tags = Array.isArray(entry.tags) ? entry.tags : [];

    return {
      id: entry.api_key || slugify(entry.name || 'api'),
      name: entry.name || 'Unnamed API',
      domain: domain.toString().toLowerCase().replace(/\s+/g, '-'),
      method: endpoint.method || 'POST',
      stage,
      endpoint: endpoint.path || '/api/unknown',
      overview: entry.short_description || entry.full_description || 'Metadata-driven API definition',
      capability: (entry.capabilities && entry.capabilities.orchestration) ? 'Orchestration' : 'Cognitive service',
      billing: entry.min_tier ? `Tier: ${entry.min_tier}` : 'Included',
      tags,
      outputs: endpoint.response_schema ? [JSON.stringify(endpoint.response_schema)] : ['metadataDriven'],
      purpose: entry.full_description || entry.short_description || 'Enable metadata-driven API operations.',
      auth: entry.requires_authentication ? 'Bearer token with tenant scope' : 'No auth required',
      requestSchema: endpoint.request_schema || { input: 'object' },
      responseSchema: endpoint.response_schema || { status: 'ok' },
      sdk: {
        ts: entry.api_key ? `await cintent.${slugify(domain)}.execute({ api: "${entry.api_key}" });` : 'await cintent.execute();',
        py: entry.api_key ? `client.execute(api="${entry.api_key}")` : 'client.execute()',
        rest: `${endpoint.method || 'POST'} ${endpoint.path || '/api/unknown'}`,
        edge: entry.api_key ? `edgeRuntime.invoke("${entry.api_key}", { replay: true })` : 'edgeRuntime.invoke("unknown")'
      },
      governance: ['Tenant isolation enforced', 'Replay compatible', 'Policy trace required'],
      errors: ['400 invalid_request', '401 unauthorized', '429 quota_exceeded', '500 cognitive_runtime_error'],
      rateLimit: entry.rate_limit ? `${entry.rate_limit} calls per second` : '10,000 requests/hour default enterprise quota',
      workflow: ['Authenticate tenant', 'Submit request', 'Validate governance', 'Capture audit', 'Return artifact'],
      simulatedOutput: { status: 'ok', artifactId: `${entry.api_key || 'api'}-demo`, confidence: 0.92, governance: 'passed', replayReady: true },
      replayExample: Array.isArray(entry.replay_examples) ? entry.replay_examples.join('\n') : `Replay ${entry.api_key || 'api'} through deterministic lineage, governance checkpoints, confidence deltas, and response artifacts.`,
      explainabilityExample: Array.isArray(entry.explainability_examples) ? entry.explainability_examples.join('\n') : `Explain ${entry.api_key || 'api'} by ranking rationale, governance intervention, and confidence evolution.`,
      lineage: ['tenant-auth', 'contract-validation', 'domain-cognition', 'governance-checkpoint', 'replay-capture', 'response-envelope'],
      confidence: [0.62, 0.74, 0.85, 0.93],
      distributed: ['regional-context', 'vector-clock', 'policy-arbitration', 'edge-sync'],
      dependencies: entry.dependencies || [],
      lifecycle: entry.lifecycle_state || stage,
      accessPolicy: entry.access_policy || {}
    };
  }

  function slugify(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof apiCatalog === 'undefined' || typeof render !== 'function') return;
    loadCatalog();
  });
})();
