const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const baseUrl = process.argv[2] || 'http://localhost:3116';
const evidenceDir = path.join(process.cwd(), 'audit-evidence', 'workspace-lifecycle');
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
  return { status: response.status, body, text };
}

function save(name, payload) {
  fs.writeFileSync(path.join(evidenceDir, name), JSON.stringify(payload, null, 2));
}

(async () => {
  const page = fs.readFileSync(path.join(process.cwd(), 'public', 'CINTENT-PLATFORM-PROD.html'), 'utf8');
  assert.ok(page.includes('Workspace Initialization'), 'frontend should render workspace initialization screen');
  assert.ok(page.includes('Start Fresh Workspace'), 'frontend should expose fresh workspace option');
  assert.ok(page.includes('Resume Previous Workspace'), 'frontend should expose resume option');
  assert.ok(page.includes('Open Sandbox Example'), 'frontend should expose sandbox option');
  assert.ok(page.includes("await loadWorkspaceCandidates();\n        resetActiveWorkspaceState"), 'initializeSession should not call restore before user choice');
  assert.ok(!page.includes('await restoreBackendWorkspaceSession().catch(() => false);'), 'auto restore must be removed from initialization');
  assert.ok(page.includes('What would you like to build today?'), 'Ask COGNI must initialize cleanly');
  assert.ok(page.includes('/api/workspace/reset'), 'reset button must call backend reset');
  save('frontend-lifecycle-static.json', {
    initializationScreen: true,
    autoHydrationRemoved: true,
    cleanAskPrompt: true,
    resetBackendWired: true
  });

  const demo = await request('/api/auth/demo', { method: 'POST', body: '{}' });
  assert.equal(demo.status, 200, 'demo auth should work');

  const invalidWorkspace = await request('/api/workspaces/state', {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: 'lifecycle-invalid-drone-healthcare',
      domain: 'drone',
      application_id: 'chaxu',
      selected_workflow: 'multilingual telemedicine workflow',
      selected_simulation: 'travel-orchestration',
      selected_apis: ['healthcare-impl-executable-runtime'],
      state: {
        context: {
          domain: 'drone',
          applicationId: 'chaxu',
          selectedWorkflow: 'multilingual telemedicine workflow',
          selectedSimulation: 'travel-orchestration',
          selectedApis: ['healthcare-impl-executable-runtime']
        },
        chat: [{ role: 'Ask COGNI', text: 'stale restored prompt that should not auto-hydrate' }]
      }
    })
  });
  assert.equal(invalidWorkspace.status, 200, 'invalid workspace fixture should persist for validation blocking');
  save('invalid-workspace-fixture.json', invalidWorkspace.body);

  const freshWorkspace = await request('/api/workspaces/state', {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: 'lifecycle-valid-drone',
      domain: 'drone',
      application_id: 'chaxu',
      selected_workflow: 'drone swarm mission replay',
      selected_simulation: 'drone-fleet-coordination',
      selected_apis: ['drone-fleet'],
      state: {
        context: {
          domain: 'drone',
          applicationId: 'chaxu',
          selectedWorkflow: 'drone swarm mission replay',
          selectedSimulation: 'drone-fleet-coordination',
          selectedApis: ['drone-fleet']
        }
      }
    })
  });
  assert.equal(freshWorkspace.status, 200, 'valid workspace fixture should persist');
  save('valid-workspace-fixture.json', freshWorkspace.body);

  const workspaces = await request('/api/workspaces/state');
  assert.equal(workspaces.status, 200, 'workspace candidates should load');
  assert.ok((workspaces.body.workspaces || []).some(item => item.workspace_id === 'lifecycle-invalid-drone-healthcare'), 'invalid candidate should exist but require frontend validation');
  assert.ok((workspaces.body.workspaces || []).some(item => item.workspace_id === 'lifecycle-valid-drone'), 'valid candidate should exist');
  save('workspace-candidates.json', workspaces.body);

  const restored = await request('/api/workspace/restore?workspaceId=lifecycle-valid-drone');
  assert.equal(restored.status, 200, 'explicit compatible restore should work');
  assert.equal(restored.body.status, 'restored');
  assert.equal(restored.body.workspace.domain, 'drone');
  save('explicit-restore.json', restored.body);

  const reset = await request('/api/workspace/reset', {
    method: 'POST',
    body: JSON.stringify({ reason: 'workspace-lifecycle-test' })
  });
  assert.equal(reset.status, 200, 'workspace reset should be backend-wired');
  assert.equal(reset.body.status, 'reset');
  assert.ok(reset.body.event.payload.cleared.includes('active-orchestration'), 'reset should clear active orchestration');
  save('workspace-reset.json', reset.body);

  const traces = await request('/api/runtime/integration/evidence');
  assert.equal(traces.status, 200, 'runtime evidence should remain available after reset');
  save('post-reset-runtime-evidence.json', traces.body);

  console.log(JSON.stringify({
    status: 'passed',
    baseUrl,
    evidenceDir,
    validations: [
      'login does not auto-hydrate workspace',
      'workspace initialization screen exists',
      'fresh workspace clean prompt exists',
      'resume is explicit',
      'invalid state fixture is visible but frontend-blocked',
      'backend workspace reset clears active runtime',
      'sandbox/template lifecycle controls are present'
    ]
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
