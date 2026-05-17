const assert = require('assert');

const baseUrl = process.argv[2] || 'http://localhost:3000';
const concurrency = Number(process.env.CINTENT_LOAD_CONCURRENCY || 12);
const rounds = Number(process.env.CINTENT_LOAD_ROUNDS || 3);

async function post(path, cookie, body, idempotencyKey) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
    },
    body: JSON.stringify(body)
  });
  return { response, payload: await response.json() };
}

async function jsonRequest(path, cookie, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': body && typeof body === 'string' ? 'application/x-www-form-urlencoded' : 'application/json',
      Cookie: cookie
    },
    body: body && typeof body === 'string' ? body : JSON.stringify(body || {})
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }
  return { response, payload };
}

async function main() {
  const demo = await fetch(`${baseUrl}/api/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  assert.equal(demo.status, 200, 'demo auth should work for load validation');
  const cookie = demo.headers.get('set-cookie');
  assert(cookie, 'demo auth should return a session cookie');

  const licenseView = await jsonRequest('/api/license/view', cookie, {});
  assert.equal(licenseView.response.status, 200, 'license view should succeed for load validation');
  const licenseAccept = await jsonRequest('/api/license/accept', cookie, 'acknowledgedReview=true');
  assert.equal(licenseAccept.response.status, 200, 'license accept should succeed for load validation');

  const latencies = [];
  for (let round = 0; round < rounds; round += 1) {
    const batch = Array.from({ length: concurrency }, async (_, index) => {
      const started = Date.now();
      const result = await post('/api/telemetry/ingest', cookie, {
        domain: index % 2 ? 'manufacturing' : 'drone',
        temperature: 88 + index,
        vibration: 4.8 + index / 10,
        source: `load-test-${round}-${index}`
      });
      latencies.push(Date.now() - started);
      assert([200, 429].includes(result.response.status), `unexpected load response ${result.response.status}`);
      return result.response.status;
    });
    await Promise.all(batch);
  }

  const sorted = latencies.sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  console.log(JSON.stringify({
    status: 'completed',
    concurrency,
    rounds,
    requests: latencies.length,
    p95LatencyMs: p95,
    target: 'telemetry ingestion and orchestration trigger path'
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
