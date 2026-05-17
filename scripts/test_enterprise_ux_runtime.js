const assert = require('assert');

const baseUrl = process.argv[2] || 'http://localhost:3000';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = text;
  }
  return { response, payload, headers: response.headers };
}

async function acceptLicense(authHeaders) {
  const view = await request('/api/license/view', { method: 'POST', headers: authHeaders });
  assert.equal(view.response.status, 200, 'license policy view should be tracked');

  const accept = await request('/api/license/accept', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'acknowledgedReview=true'
  });
  assert.equal(accept.response.status, 200, 'license acceptance should succeed');
}

async function main() {
  const login = await request('/api/auth/demo', { method: 'POST', body: JSON.stringify({}) });
  assert.equal(login.response.status, 200, 'demo bypass should create an auditable sandbox session');
  const cookie = login.headers.get('set-cookie');
  assert(cookie, 'demo bypass should set an authenticated session cookie');
  const authHeaders = { Cookie: cookie };
  await acceptLicense(authHeaders);

  const ux = await request('/api/enterprise-ux/status?domain=drone&application=CHAXU', { headers: authHeaders });
  assert.equal(ux.response.status, 200, 'enterprise UX status endpoint should be available');
  assert.equal(ux.payload.source, 'enterprise-cognitive-workspace-ux-runtime');
  assert(ux.payload.workspace, 'workspace context should be visible');
  assert(ux.payload.runtime, 'runtime state should be visible');
  assert(Array.isArray(ux.payload.workflowProgress), 'guided workflow progress should be returned');
  assert(ux.payload.workflowProgress.length >= 8, 'guided workflow should cover the enterprise platform flow');
  assert(ux.payload.designSystem.components.includes('workspace-shell'), 'design system should expose workspace shell component');
  assert(ux.payload.accessibility.keyboardNavigation, 'accessibility readiness should be explicit');

  const page = await fetch(`${baseUrl}/CINTENT-PLATFORM-PROD.html`, { headers: authHeaders }).then(res => res.text());
  [
    'enterprise-status-strip',
    'view-operating',
    'enterprise-workspace-shell',
    'workflow-progress',
    'notification-stack',
    'Operating Workspace',
    'Start guided tour'
  ].forEach(marker => assert(page.includes(marker), `platform page should include ${marker}`));

  const run = await request('/api/orchestration/fabric/execute', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      mode: 'sandbox',
      input: {
        domain: 'manufacturing',
        workflow: 'enterprise UX validation orchestration',
        selectedApis: ['rbt-workflow']
      }
    })
  });
  assert.equal(run.response.status, 200, 'operating workspace quick action target should execute orchestration');
  assert(run.payload.run && run.payload.run.orchestrationId, 'orchestration response should include run id');

  const afterRun = await request('/api/enterprise-ux/status?domain=manufacturing&application=CINTENT', { headers: authHeaders });
  assert(Number(afterRun.payload.dashboards.orchestrationThroughput) >= 1, 'dashboard should reflect orchestration events');
  assert(afterRun.payload.runtime.latestReplayId, 'runtime strip should expose latest replay state after execution');

  console.log(JSON.stringify({
    status: 'passed',
    groups: [
      'enterprise shell markers',
      'runtime status strip',
      'guided workflow progress',
      'notification runtime',
      'accessibility metadata',
      'orchestration-backed dashboard updates'
    ],
    baseUrl
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
