const assert = require('assert');

const baseUrl = process.argv[2] || 'http://localhost:3000';

async function http(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const text = await response.text();
  let payload = text;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (_) {}
  return { response, payload, headers: response.headers };
}

async function main() {
  const health = await http('/api/health');
  assert.equal(health.response.status, 200, 'health endpoint should respond');
  assert.equal(health.payload.hardening.requestTracing, true, 'health should expose hardening evidence');
  assert(health.headers.get('x-cintent-request-id'), 'request tracing header should be present');

  const ready = await http('/api/ready');
  assert.equal(ready.response.status, 200, 'readiness endpoint should respond');
  assert(ready.payload.dependencies.orchestrationEngine, 'readiness should include orchestration engine');
  assert(ready.payload.dependencies.replayEngine, 'readiness should include replay engine');
  assert(ready.payload.dependencies.telemetryEngine, 'readiness should include telemetry engine');

  const metrics = await fetch(`${baseUrl}/metrics`).then(res => res.text());
  assert(metrics.includes('cintent_requests_total'), 'Prometheus metrics should include request counter');
  assert(metrics.includes('cintent_http_p95_latency_ms'), 'Prometheus metrics should include latency gauge');

  const demo = await http('/api/auth/demo', { method: 'POST', body: JSON.stringify({}) });
  assert.equal(demo.response.status, 200, 'demo session should authenticate');
  const cookie = demo.headers.get('set-cookie');
  assert(cookie, 'demo session should set cookie');
  const authHeaders = { Cookie: cookie, 'Idempotency-Key': 'prod-hardening-orchestration-1' };

  const runBody = JSON.stringify({
    mode: 'sandbox',
    input: { domain: 'drone', workflow: 'production hardening validation', selectedApis: ['drone-fleet'] }
  });
  const run1 = await http('/api/orchestration/fabric/execute', { method: 'POST', headers: authHeaders, body: runBody });
  assert.equal(run1.response.status, 200, 'orchestration should execute');
  assert(run1.payload.run.integrity.digest, 'orchestration should include integrity digest');

  const run2 = await http('/api/orchestration/fabric/execute', { method: 'POST', headers: authHeaders, body: runBody });
  assert.equal(run2.response.status, 200, 'idempotent orchestration replay should respond');
  assert.equal(run2.headers.get('x-cintent-idempotency'), 'hit', 'second matching request should be served from idempotency cache');
  assert.equal(run1.payload.run.orchestrationId, run2.payload.run.orchestrationId, 'idempotency should return the same orchestration result');

  const replayId = run1.payload.run.replay.replayId;
  const replay = await http(`/api/replay/reconstruct/${encodeURIComponent(replayId)}`, { headers: { Cookie: cookie } });
  assert.equal(replay.response.status, 200, 'replay reconstruction should succeed');
  assert(replay.payload.replay.integrity.digest, 'replay should include integrity digest');
  assert.equal(replay.payload.replay.consistency.deterministic, true, 'replay should report deterministic reconstruction');

  const telemetry = await http('/api/telemetry/ingest', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: JSON.stringify({ domain: 'manufacturing', temperature: 94, vibration: 6.5, source: 'production-hardening-test' })
  });
  assert.equal(telemetry.response.status, 200, 'telemetry ingestion should succeed');
  assert(
    telemetry.payload.orchestration || telemetry.payload.orchestrationTrigger,
    'anomalous telemetry should trigger or queue orchestration'
  );
  assert(
    !telemetry.payload.orchestrationTrigger || ['queued', 'backpressure'].includes(telemetry.payload.orchestrationTrigger.status),
    'telemetry trigger should expose queue/backpressure state'
  );

  const forbidden = await http('/api/settings/platform', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: JSON.stringify({ publicSandboxEnabled: false })
  });
  assert.equal(forbidden.response.status, 403, 'RBAC should block sandbox viewer from admin settings');

  const apiMetrics = await http('/api/metrics');
  assert.equal(apiMetrics.response.status, 200, 'JSON metrics should respond');
  assert(apiMetrics.payload.metrics.telemetryIngestions >= 1, 'metrics should include telemetry ingestion count');

  console.log(JSON.stringify({
    status: 'passed',
    groups: [
      'health and readiness',
      'Prometheus metrics',
      'request tracing',
      'idempotency handling',
      'orchestration integrity',
      'replay integrity',
      'telemetry-triggered orchestration',
      'RBAC denial',
      'production metrics'
    ],
    baseUrl
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
