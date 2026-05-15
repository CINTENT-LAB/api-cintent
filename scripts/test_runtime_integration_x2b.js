const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const baseUrl = process.argv[2] || 'http://localhost:3116';
const evidenceDir = path.join(process.cwd(), 'audit-evidence', 'x2b');
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

async function readSseHello() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(`${baseUrl}/api/event-bus/stream`, {
      headers: { cookie },
      signal: controller.signal
    });
    const reader = response.body.getReader();
    const chunk = await reader.read();
    const text = Buffer.from(chunk.value || []).toString('utf8');
    await reader.cancel().catch(() => {});
    return { status: response.status, text };
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  const demo = await request('/api/auth/demo', { method: 'POST', body: '{}' });
  assert.equal(demo.status, 200, 'demo session should authenticate');

  const context = {
    workspace_id: 'x2b-workspace-drone',
    session_id: 'x2b-session-drone',
    active_domain: 'drone',
    active_application: 'CHAXU',
    active_workflow: 'swarm coordination',
    active_apis: ['drone-fleet', 'observe-replay-reconstruct'],
    active_simulation: 'drone-fleet-coordination',
    user_mode: 'technical',
    runtime_environment: 'sandbox',
    workflow_state: { stage: 'select-apis', completed: ['select-domain'], runtimeState: 'idle' }
  };

  const persistedState = await request('/api/workspaces/state', {
    method: 'POST',
    body: JSON.stringify(context)
  });
  assert.equal(persistedState.status, 200, 'workspace state should persist');
  save('workspace-persist.json', persistedState.body);

  const restored = await request('/api/workspace/restore?workspaceId=x2b-workspace-drone');
  assert.equal(restored.status, 200, 'workspace should restore from backend persistence');
  assert.equal(restored.body.status, 'restored');
  assert.equal(restored.body.workspace.workspace_id, 'x2b-workspace-drone');
  save('workspace-restore.json', restored.body);

  const askDrone = await request('/api/ask', {
    method: 'POST',
    body: JSON.stringify({ query: 'Generate drone swarm architecture and mission replay plan', context })
  });
  assert.equal(askDrone.status, 200, 'Ask COGNI should answer with backend context');
  assert.equal(askDrone.body.adaptiveResponse.domain, 'drone');
  assert.ok(askDrone.body.askCogniIntelligence.backendWired, 'Ask COGNI should report backend wiring');
  save('ask-drone.json', askDrone.body);

  const askMismatch = await request('/api/ask', {
    method: 'POST',
    body: JSON.stringify({ query: 'Build multilingual telemedicine system', context })
  });
  assert.equal(askMismatch.status, 200, 'Ask COGNI mismatch response should be valid');
  assert.equal(askMismatch.body.adaptiveResponse.domain, 'drone');
  assert.equal(askMismatch.body.adaptiveResponse.contextValidation.valid, false);
  save('ask-cross-domain-validation.json', askMismatch.body);

  const askMemory = await request('/api/ask/memory?workspaceId=x2b-workspace-drone&q=mission%20replay');
  assert.equal(askMemory.status, 200, 'Ask memory endpoint should load persisted memory');
  assert.ok(askMemory.body.memories.length >= 1, 'Ask memory should contain at least one persisted interaction');
  save('ask-memory.json', askMemory.body);

  const orchestration = await request('/api/orchestration/fabric/execute', {
    method: 'POST',
    body: JSON.stringify({
      workflow: {
        title: 'X2B drone swarm persistence workflow',
        apiKeys: ['drone-fleet', 'observe-replay-reconstruct']
      },
      mode: 'sandbox',
      input: { ...context, audit: 'x2b-runtime-integration' }
    })
  });
  assert.equal(orchestration.status, 200, 'orchestration should execute');
  const run = orchestration.body.run;
  assert.ok(run.orchestrationId, 'orchestration id required');
  assert.ok(run.replay && run.replay.replayId, 'replay id required');
  save('orchestration-execute.json', orchestration.body);

  const orchestrationRestore = await request(`/api/orchestration/fabric/${encodeURIComponent(run.orchestrationId)}`);
  assert.equal(orchestrationRestore.status, 200, 'orchestration should restore by id');
  save('orchestration-restore.json', orchestrationRestore.body);

  const replay = await request(`/api/replay/reconstruct/${encodeURIComponent(run.replay.replayId)}`);
  assert.equal(replay.status, 200, 'replay should reconstruct');
  assert.equal(replay.body.replay.status, 'reconstructed');
  assert.ok(replay.body.replay.persistence.replayEvents >= 1, 'replay should include persisted replay events');
  save('replay-reconstruct.json', replay.body);

  const telemetry = await request('/api/telemetry/ingest', {
    method: 'POST',
    body: JSON.stringify({
      domain: 'manufacturing',
      source: 'x2b-press-1',
      metrics: { temperatureC: 91.5, vibrationMmS: 6.4 },
      thresholds: { temperatureC: 85, vibrationMmS: 5 },
      workflow: 'predictive maintenance'
    })
  });
  assert.equal(telemetry.status, 200, 'telemetry ingest should succeed');
  assert.equal(telemetry.body.telemetry.anomaly, true, 'threshold object telemetry should detect anomaly');
  save('telemetry-ingest.json', telemetry.body);

  const sse = await readSseHello();
  assert.equal(sse.status, 200, 'SSE event bus should connect');
  assert.match(sse.text, /event: hello/, 'SSE should send hello with recovered events');
  save('sse-recovery.json', sse);

  const evidence = await request('/api/runtime/integration/evidence?q=mission%20replay');
  assert.equal(evidence.status, 200, 'integration evidence endpoint should work');
  assert.ok(evidence.body.databaseWrites.workspaces >= 1, 'workspace writes should be visible');
  assert.ok(evidence.body.databaseWrites.telemetry >= 1, 'telemetry writes should be visible');
  assert.ok(evidence.body.databaseWrites.replayEvents >= 1, 'replay writes should be visible');
  assert.ok(evidence.body.runtimeIntegrity.askMemoryPersistence, 'Ask COGNI memory persistence should be true');
  save('runtime-integration-evidence.json', evidence.body);

  console.log(JSON.stringify({
    status: 'passed',
    baseUrl,
    evidenceDir,
    validations: [
      'workspace persistence and restore',
      'Ask COGNI backend wiring',
      'strict cross-domain validation',
      'semantic memory retrieval',
      'orchestration persistence',
      'replay persistence reconstruction',
      'telemetry threshold persistence',
      'SSE reconnect event recovery',
      'runtime integration evidence endpoint'
    ],
    persistenceSource: evidence.body.persistenceSource
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
