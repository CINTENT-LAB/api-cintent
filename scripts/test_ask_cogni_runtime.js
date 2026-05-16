const assert = require('assert');

const baseUrl = process.argv[2] || 'http://localhost:3116';

async function request(path, options = {}, jar = {}) {
  const headers = { ...(options.headers || {}) };
  if (jar.cookie) headers.cookie = jar.cookie;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers, redirect: 'manual' });
  const cookie = response.headers.get('set-cookie');
  if (cookie) jar.cookie = cookie.split(';')[0];
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = text; }
  return { response, body };
}

(async () => {
  const jar = {};
  await request('/sandbox', {}, jar);
  const policyView = await request('/api/license/view', { method: 'POST' }, jar);
  assert.equal(policyView.response.status, 200);
  const policyAccept = await request('/api/license/accept', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'acknowledgedReview=true'
  }, jar);
  assert.equal(policyAccept.response.status, 200);

  const droneContext = {
    domain: 'drone',
    applicationId: 'chaxu',
    selectedWorkflow: 'drone swarm mission coordination workflow',
    selectedSimulation: 'drone-fleet-coordination',
    selectedApis: ['drone-fleet'],
    mode: 'technical',
    environment: 'sandbox'
  };
  const sync = await request('/api/ask/context/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: droneContext, eventType: 'domain-switch', query: 'Generate drone swarm architecture' })
  }, jar);
  assert.equal(sync.response.status, 200);
  assert.equal(sync.body.validation.valid, true);
  assert.ok(sync.body.proactiveGuidance.quickActions.length >= 4);

  const ask = await request('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Generate drone swarm architecture', context: droneContext })
  }, jar);
  assert.equal(ask.response.status, 200);
  const adaptive = ask.body.adaptiveResponse;
  assert.equal(adaptive.domain, 'drone');
  assert.ok(adaptive.statefulContext);
  assert.ok(adaptive.workflowStateMachine);
  assert.ok(adaptive.uxLayers.simpleSummary);

  const duplicate = await request('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Generate drone swarm architecture', context: droneContext })
  }, jar);
  assert.equal(duplicate.response.status, 200);
  assert.notEqual(duplicate.body.adaptiveResponse.answerFingerprint, adaptive.answerFingerprint, 'duplicate response should be varied');

  const page = require('fs').readFileSync(require('path').join(process.cwd(), 'public', 'CINTENT-PLATFORM-PROD.html'), 'utf8');
  [
    "['select-apis', 'Select APIs']",
    "['generate-architecture', 'Generate Architecture']",
    "['generate-orchestration', 'Generate Orchestration']",
    "['run-simulation', 'Run Simulation']",
    "['open-replay', 'Open Replay']",
    "['inspect-governance', 'Inspect Governance']",
    "['generate-sdk', 'Generate SDK']",
    "['deploy-runtime', 'Deploy Runtime']",
    'data-ask-stage="${escapeHtml(id)}"',
    "const askStageBtn = event.target.closest('[data-ask-stage]')",
    "if (action === 'generate-architecture')",
    "if (action === 'select-apis')"
  ].forEach(marker => assert.ok(page.includes(marker), `missing Ask COGNI workflow control marker: ${marker}`));

  const mismatch = await request('/api/ask/context/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { ...droneContext, selectedWorkflow: 'multilingual telemedicine workflow' }, query: 'Build multilingual telemedicine workflow' })
  }, jar);
  assert.equal(mismatch.response.status, 200);
  assert.equal(mismatch.body.validation.valid, false);

  const sim = await request('/api/ask/quick-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'run-simulation', context: droneContext })
  }, jar);
  assert.equal(sim.response.status, 200);
  assert.equal(sim.body.status, 'executed');
  assert.ok(sim.body.result.simulationId);

  const sdk = await request('/api/ask/quick-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'generate-sdk', context: droneContext })
  }, jar);
  assert.equal(sdk.response.status, 200);
  assert.equal(sdk.body.status, 'executed');

  const memory = await request('/api/ask/memory?q=swarm', {}, jar);
  assert.equal(memory.response.status, 200);
  assert.ok(Array.isArray(memory.body.memories));

  console.log(JSON.stringify({
    status: 'passed',
    groups: [
      'context synchronization',
      'domain-aware guidance',
      'stateful memory',
      'deduplicated responses',
      'strict context validation',
      'quick action execution',
      'enterprise UX response layers'
    ],
    baseUrl
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
