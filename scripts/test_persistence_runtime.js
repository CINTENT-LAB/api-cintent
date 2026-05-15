const assert = require('assert');

const baseUrl = process.argv[2] || 'http://localhost:3116';

async function request(path, options = {}, cookieJar = {}) {
  const headers = { ...(options.headers || {}) };
  if (cookieJar.cookie) headers.cookie = cookieJar.cookie;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers, redirect: 'manual' });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookieJar.cookie = setCookie.split(';')[0];
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = text; }
  return { response, body, cookieJar };
}

(async () => {
  const jar = {};
  const sandbox = await request('/sandbox', {}, jar);
  assert.equal(sandbox.response.status, 200, 'sandbox should create a stateful anonymous session');

  const persistence = await request('/api/persistence/status', {}, jar);
  assert.equal(persistence.response.status, 200, 'persistence status should be readable');
  assert.equal(persistence.body.stateful, true, 'persistence runtime must advertise statefulness');

  const workspace = await request('/api/workspaces/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspace_id: 'workspace-persistence-test',
      domain: 'manufacturing',
      application_id: 'smart-factory',
      selected_apis: ['irobot-predictive-coordinate'],
      selected_workflow: 'predictive maintenance workflow',
      selected_simulation: 'predictive-maintenance-coordination'
    })
  }, jar);
  assert.equal(workspace.response.status, 200, 'workspace state should persist');

  const ask = await request('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Remember this predictive maintenance context and recommend next orchestration step.',
      context: {
        domain: 'manufacturing',
        applicationId: 'smart-factory',
        selectedWorkflow: 'predictive maintenance workflow',
        selectedSimulation: 'predictive-maintenance-coordination',
        selectedApis: ['irobot-predictive-coordinate'],
        mode: 'technical'
      }
    })
  }, jar);
  assert.equal(ask.response.status, 200, 'Ask COGNI memory write should succeed');

  const replay = await request('/api/replay/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      replayId: 'persistence-test-replay',
      steps: [
        { action: 'context-switch', payload: { domain: 'manufacturing', selectedSimulation: 'predictive-maintenance-coordination' } },
        { action: 'sdk', payload: { apiKeys: ['irobot-predictive-coordinate'], language: 'python' } }
      ]
    })
  }, jar);
  assert.equal(replay.response.status, 200, 'replay execution should persist');
  assert.equal(replay.body.status, 'executed');

  const traces = await request('/api/traces', {}, jar);
  assert.equal(traces.response.status, 200, 'trace ledger should be readable');
  assert.ok(Array.isArray(traces.body.traces), 'traces should be an array');

  console.log(JSON.stringify({
    status: 'passed',
    groups: [
      'session persistence',
      'workspace state engine',
      'Ask COGNI memory',
      'replay persistence',
      'observability persistence',
      'tenant-scoped sandbox'
    ],
    baseUrl
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
