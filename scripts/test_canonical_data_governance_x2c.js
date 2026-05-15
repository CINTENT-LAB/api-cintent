const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const baseUrl = process.argv[2] || 'http://localhost:3116';
const evidenceDir = path.join(process.cwd(), 'audit-evidence', 'x2c');
fs.mkdirSync(evidenceDir, { recursive: true });

let cookie = '';

async function request(route, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (cookie) headers.cookie = cookie;
  if (options.body && !headers['content-type']) headers['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl}${route}`, { ...options, headers });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body, status: response.status };
}

function save(name, payload) {
  fs.writeFileSync(path.join(evidenceDir, name), JSON.stringify(payload, null, 2));
}

(async () => {
  const demo = await request('/api/auth/demo', { method: 'POST', body: '{}' });
  assert.equal(demo.status, 200, 'demo auth should work for canonical validation');

  const model = await request('/api/canonical/model');
  assert.equal(model.status, 200, 'canonical model endpoint should respond');
  assert.ok(model.body.coreEntities.includes('orchestration'), 'canonical model must include orchestration');
  assert.ok(model.body.coreEntities.includes('telemetry'), 'canonical model must include telemetry');
  assert.ok(model.body.eventSpecification.includes('telemetry.ingested'), 'canonical events should include telemetry.ingested');
  save('canonical-model.json', model.body);

  const registry = await request('/api/metadata/registry/canonical');
  assert.equal(registry.status, 200, 'canonical registry endpoint should respond');
  assert.ok(registry.body.registry.apis.length > 100, 'registry should normalize API metadata');
  for (const domain of ['healthcare', 'drone', 'manufacturing', 'airport', 'bfsi', 'legal']) {
    assert.ok(registry.body.registry.domains.some(item => item.domain === domain), `registry should include ${domain}`);
  }
  save('canonical-registry.json', {
    schemaVersion: registry.body.schemaVersion,
    domains: registry.body.registry.domains.map(item => ({ domain: item.domain, api_count: item.api_count, simulation_count: item.simulation_count })),
    apiCount: registry.body.registry.apis.length,
    simulationCount: registry.body.registry.simulations.length,
    sdkRegistry: registry.body.registry.sdk_registry
  });

  const normalization = await request('/api/canonical/validation');
  assert.equal(normalization.status, 200, 'canonical validation endpoint should respond');
  assert.equal(normalization.body.status, 'validated', 'all target domains should validate through canonical primitives');
  assert.ok(normalization.body.domainResults.every(item => item.primitiveModel.join(',') === 'telemetry,orchestration,replay'), 'domain primitives must be shared');
  save('canonical-validation.json', normalization.body);

  const telemetry = await request('/api/telemetry/ingest', {
    method: 'POST',
    body: JSON.stringify({
      id: 'x2c-manufacturing-telemetry',
      domain: 'manufacturing',
      source: 'x2c-validation-sensor',
      metrics: { temperatureC: 92, vibrationMmS: 6.1 },
      thresholds: { temperatureC: 85, vibrationMmS: 5 }
    })
  });
  assert.equal(telemetry.status, 200, 'telemetry ingest should succeed');
  assert.equal(telemetry.body.canonicalTelemetry.entity_type, 'telemetry');
  assert.equal(telemetry.body.canonicalTelemetry.domain, 'manufacturing');
  assert.equal(telemetry.body.canonicalTelemetry.anomaly_state, 'anomaly_detected');
  save('telemetry-canonical.json', telemetry.body);

  const governance = await request('/api/governance/evaluate', {
    method: 'POST',
    body: JSON.stringify({
      domain: 'drone',
      operation: 'orchestration.started',
      context: { workflow_id: 'x2c-drone-workflow', replay_id: 'x2c-replay' }
    })
  });
  assert.equal(governance.status, 200, 'governance evaluation should succeed');
  assert.equal(governance.body.governance.decision, 'allowed');
  assert.ok(governance.body.governance.inherited_policies.includes('geo-boundary'), 'drone governance should inherit drone policies');
  save('governance-evaluation.json', governance.body);

  const orchestration = await request('/api/orchestration/fabric/execute', {
    method: 'POST',
    body: JSON.stringify({
      workflow: {
        title: 'X2C cross-domain canonical workflow',
        domain: 'drone',
        apiKeys: ['drone-fleet', 'observe-replay-reconstruct']
      },
      mode: 'sandbox',
      input: { domain: 'drone', purpose: 'canonical orchestration validation' }
    })
  });
  assert.equal(orchestration.status, 200, 'orchestration should execute');
  assert.equal(orchestration.body.canonicalRun.entity_type, 'orchestration');
  assert.equal(orchestration.body.canonicalRun.domain, 'drone');
  assert.ok(Array.isArray(orchestration.body.canonicalRun.stages), 'canonical orchestration should expose stages');
  save('orchestration-canonical.json', orchestration.body);

  const replayId = orchestration.body.run.replay.replayId;
  const replay = await request(`/api/replay/reconstruct/${encodeURIComponent(replayId)}`);
  assert.equal(replay.status, 200, 'replay reconstruction should succeed');
  assert.ok(Array.isArray(replay.body.replay.canonicalTimeline), 'replay should expose canonical timeline');
  assert.ok(replay.body.replay.lineage.nodes.some(node => node.type === 'replay'), 'replay lineage should include replay node');
  save('replay-canonical.json', replay.body);

  const sdk = await request('/api/sdk/generate', {
    method: 'POST',
    body: JSON.stringify({ api_key: 'drone-fleet', language: 'ts', context: { domain: 'drone' } })
  });
  assert.equal(sdk.status, 200, 'SDK generation should succeed');
  assert.equal(sdk.body.canonicalSdkContract.entity_type, 'sdk');
  assert.equal(sdk.body.canonicalSdkContract.api.domain, 'drone');
  save('sdk-canonical.json', sdk.body);

  const lineage = await request('/api/lineage/resolve', {
    method: 'POST',
    body: JSON.stringify({
      domain: 'drone',
      workflow_id: 'x2c-workflow',
      orchestration_id: orchestration.body.run.orchestrationId,
      replay_id: replayId,
      telemetry_id: 'x2c-manufacturing-telemetry',
      governance_id: governance.body.governance.governance_id
    })
  });
  assert.equal(lineage.status, 200, 'lineage resolution should succeed');
  assert.ok(lineage.body.lineage.edges.length >= 4, 'lineage should connect runtime entities');
  save('lineage-resolution.json', lineage.body);

  const metadataValidation = await request('/api/metadata/validation');
  assert.equal(metadataValidation.status, 200, 'metadata validation should succeed');
  assert.equal(metadataValidation.body.schemaVersion, model.body.schemaVersion);
  assert.ok(metadataValidation.body.canonical.registry_apis > 100, 'metadata validation should include canonical registry count');
  save('metadata-validation-canonical.json', metadataValidation.body);

  console.log(JSON.stringify({
    status: 'passed',
    baseUrl,
    evidenceDir,
    validations: [
      'canonical cognitive data model',
      'central metadata registry',
      'multi-domain primitive normalization',
      'canonical telemetry model',
      'unified governance fabric',
      'canonical orchestration model',
      'canonical replay model',
      'SDK registry normalization',
      'lineage tracking runtime',
      'event/schema consistency'
    ],
    schemaVersion: model.body.schemaVersion
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
