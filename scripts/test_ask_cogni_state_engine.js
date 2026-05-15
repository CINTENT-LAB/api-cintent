const assert = require('assert');

const baseUrl = process.argv[2] || 'http://localhost:3116';

async function request(path, options = {}, cookieJar = {}) {
  const headers = { ...(options.headers || {}) };
  if (cookieJar.cookie) headers.cookie = cookieJar.cookie;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookieJar.cookie = setCookie.split(';')[0];
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function ask(cookieJar, query, context) {
  return request('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, context })
  }, cookieJar);
}

function context(domain, app, overrides = {}) {
  return {
    workspaceId: `test-workspace-${domain}-${app}`,
    sessionId: `test-session-${domain}-${app}`,
    contextId: `test-context-${domain}-${Date.now()}`,
    domain,
    applicationId: app,
    applicationName: app,
    selectedApis: [],
    selectedApiNames: [],
    selectedSimulation: '',
    selectedWorkflow: `${domain} orchestration workflow`,
    workflowState: { stage: 'select-apis', completed: [], runtimeState: 'idle' },
    environment: 'sandbox',
    mode: 'technical',
    subscriptionTier: 'demo',
    ...overrides
  };
}

async function main() {
  const cookieJar = {};
  await request('/api/auth/demo', { method: 'POST' }, cookieJar);
  const session = await request('/api/auth/session', {}, cookieJar);
  assert.ok(session.user, 'demo session persists');

  const domainCases = [
    ['healthcare', 'smart-hospital', 'Build multilingual telemedicine system', 'healthcare-hospital-operations', ['healthcare-impl-executable-runtime']],
    ['drone', 'chaxu', 'Generate drone swarm architecture', 'drone-fleet-coordination', ['drone-fleet']],
    ['travel', 'blisstrail', 'Create airport orchestration workflow', 'travel-orchestration', ['travel-intent']],
    ['manufacturing', 'manufacturing', 'Recommend APIs for smart manufacturing', '', ['irobot-manufacturing-orchestrate']]
  ];

  for (const [domain, app, query, simulation, apis] of domainCases) {
    const response = await ask(cookieJar, query, context(domain, app, { selectedSimulation: simulation, selectedApis: apis }));
    assert.strictEqual(response.adaptiveResponse.domain, domain, `${domain} response stayed in domain`);
    assert.strictEqual(response.adaptiveResponse.contextValidation.valid, true, `${domain} context validates`);
    assert.ok(response.adaptiveResponse.assistantName.toLowerCase().includes(domain === 'drone' ? 'drone' : domain === 'manufacturing' ? 'manufacturing' : domain), `${domain} assistant specialized`);
  }

  const mismatchCases = [
    ['Drone+telemedicine', 'Build multilingual telemedicine workflow', context('drone', 'chaxu', { selectedWorkflow: 'multilingual telemedicine workflow', selectedSimulation: 'drone-fleet-coordination', selectedApis: ['drone-fleet'] }), 'Healthcare'],
    ['Healthcare+PX4', 'Create PX4 MAVLink drone swarm architecture', context('healthcare', 'smart-hospital', { selectedWorkflow: 'PX4 MAVLink mission workflow', selectedSimulation: 'healthcare-hospital-operations', selectedApis: ['healthcare-impl-executable-runtime'] }), 'Drone'],
    ['Travel+ICU', 'Run ICU monitoring simulation for patient flow', context('travel', 'blisstrail', { selectedSimulation: 'healthcare-hospital-operations', selectedApis: ['travel-intent'] }), 'Switch simulation']
  ];

  for (const [name, query, ctx, expectedAction] of mismatchCases) {
    const response = await ask(cookieJar, query, ctx);
    assert.strictEqual(response.adaptiveResponse.contextValidation.valid, false, `${name} is rejected`);
    const actionLabels = response.adaptiveResponse.quickActions.map(action => action.label).join(' ');
    assert.ok(actionLabels.includes(expectedAction), `${name} exposes ${expectedAction}`);
  }

  const sim = await request('/api/simulations/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ simulationId: 'drone-fleet-coordination', mode: 'sandbox', input: { requestedFrom: 'ask-cogni-state-test', replay: true, governance: true } })
  }, cookieJar);
  assert.ok(sim.simulationId, 'simulation executes');
  assert.ok(sim.replayPackage, 'simulation returns replay package');

  const compiled = await request('/api/studio/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'drone swarm mission coordination workflow', description: 'PX4 MAVLink mission', apiKeys: ['drone-fleet', 'edge-swarm-coordinate'], domain: 'drone', simulationId: 'drone-fleet-coordination' })
  }, cookieJar);
  assert.ok(compiled.workflowId, 'workflow compiles');
  assert.ok(compiled.nodes.length > 0, 'compiled workflow has nodes');

  const sdk = await request('/api/sdk/intelligence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKeys: ['drone-fleet', 'edge-swarm-coordinate'], domain: 'drone', problem: 'PX4 MAVLink drone swarm mission with replay', simulationId: 'drone-fleet-coordination', deploymentMode: 'edge' })
  }, cookieJar);
  assert.ok(sdk.recommended_sdks.length > 0, 'SDK intelligence returns recommendations');

  const runtime = await request('/api/platform/runtime/status', {}, cookieJar);
  assert.strictEqual(runtime.status, 'operational', 'platform runtime status is operational');
  assert.ok(runtime.validation.domainAgnosticCore, 'runtime reports domain-agnostic core');
  assert.ok(runtime.coreLayers.length >= 10, 'runtime exposes core layer status');

  console.log(JSON.stringify({
    status: 'passed',
    groups: ['authentication', 'domain switching', 'invalid combinations', 'session context', 'quick action backends', 'workflow continuity primitives', 'platform runtime integrity'],
    baseUrl
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
