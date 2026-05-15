const assert = require('assert');

const baseUrl = process.argv[2] || 'http://localhost:3116';

async function request(path, options = {}, jar = {}) {
  const headers = { ...(options.headers || {}) };
  if (jar.cookie) headers.cookie = jar.cookie;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers, redirect: 'manual' });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) jar.cookie = setCookie.split(';')[0];
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = text; }
  return { response, body };
}

(async () => {
  const jar = {};
  await request('/sandbox', {}, jar);

  const execute = await request('/api/orchestration/fabric/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'sandbox',
      workflow: {
        title: 'Drone swarm replay validation workflow',
        apiKeys: ['drone-fleet', 'gov-validate', 'replay-core']
      },
      input: { domain: 'drone', mission: 'swarm validation' }
    })
  }, jar);
  assert.equal(execute.response.status, 200, 'unified orchestration should execute');
  const run = execute.body.run;
  assert.ok(run.orchestrationId);
  assert.ok(run.replay.replayId);
  assert.ok(run.checkpoints.length > 0);

  const fetched = await request(`/api/orchestration/fabric/${run.orchestrationId}`, {}, jar);
  assert.equal(fetched.response.status, 200, 'orchestration graph should be readable');
  assert.equal(fetched.body.run.orchestrationId, run.orchestrationId);

  const replay = await request(`/api/replay/reconstruct/${encodeURIComponent(run.replay.replayId)}`, {}, jar);
  assert.equal(replay.response.status, 200, 'replay should reconstruct');
  assert.equal(replay.body.replay.status, 'reconstructed');
  assert.ok(replay.body.replay.timeline.length >= run.checkpoints.length);

  const recovery = await request(`/api/orchestration/fabric/${run.orchestrationId}/recover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'retry' })
  }, jar);
  assert.equal(recovery.response.status, 200, 'orchestration recovery should execute');
  assert.equal(recovery.body.status, 'recovered');

  const telemetry = await request('/api/telemetry/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: 'manufacturing', source: 'test-sensor', temperature: 94, vibration: 6.1, anomaly: true })
  }, jar);
  assert.equal(telemetry.response.status, 200, 'telemetry should ingest');
  assert.ok(
    telemetry.body.orchestration || telemetry.body.orchestrationTrigger,
    'anomaly telemetry should trigger immediate orchestration or queue an orchestration worker event'
  );

  const simulation = await request('/api/simulations/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ simulationId: 'drone-fleet-coordination', mode: 'sandbox', input: { mission: 'replay sync' } })
  }, jar);
  assert.equal(simulation.response.status, 200, 'simulation should execute');

  const traces = await request('/api/traces', {}, jar);
  assert.equal(traces.response.status, 200);
  assert.ok(traces.body.traces.some(trace => /orchestration|replay|telemetry|simulation/i.test(trace.type)));

  console.log(JSON.stringify({
    status: 'passed',
    groups: [
      'unified orchestration execution',
      'workflow checkpoints',
      'replay reconstruction',
      'runtime recovery',
      'telemetry-triggered orchestration',
      'simulation synchronization',
      'observability events'
    ],
    baseUrl
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
