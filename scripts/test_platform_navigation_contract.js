const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'CINTENT-PLATFORM-PROD.html'), 'utf8');

function extractBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert(startIndex >= 0, `missing ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert(endIndex > startIndex, `missing end marker ${end}`);
  return source.slice(startIndex, endIndex);
}

function assertIncludes(source, marker, label = marker) {
  assert(source.includes(marker), `missing ${label}`);
}

const modulesBlock = extractBetween(html, 'const modules = [', '];');
const moduleIds = [...modulesBlock.matchAll(/id:\s*'([^']+)'/g)].map(match => match[1]);
assert(moduleIds.length >= 20, 'expected full module navigation registry');

for (const id of moduleIds) {
  assertIncludes(html, `id="view-${id}"`, `view container for ${id}`);
}

[
  ['cartBtn', 'els.cartBtn.addEventListener'],
  ['sandboxBtn', 'els.sandboxBtn.addEventListener'],
  ['resetBtn', 'els.reset.addEventListener'],
  ['logoutBtn', 'els.logout.addEventListener'],
  ['hideHeroBtn', 'els.hideHero.addEventListener']
].forEach(([id, handler]) => {
  assertIncludes(html, `id="${id}"`, `${id} markup`);
  assertIncludes(html, handler, `${id} click handler`);
});

[
  'const moduleBtn = event.target.closest(\'[data-module]\')',
  'const stageBtn = event.target.closest(\'[data-stage]\')',
  'const contextualLearn = event.target.closest(\'[data-context-learn]\')',
  'els.search.addEventListener(\'input\'',
  'class="filter-actions"',
  'grid-template-areas:',
  'href="/api/health" target="_blank"',
  'href="https://cognivantalabs.com" target="_blank"',
  'href="https://cintent.cognivantalabs.com" target="_blank"'
].forEach(marker => assertIncludes(html, marker));

const stageButtons = [...html.matchAll(/data-stage="([^"]+)"/g)].map(match => match[1]);
assert.deepStrictEqual([...new Set(stageButtons)].sort(), ['active', 'all', 'beta', 'production'].sort(), 'stage filter buttons must be present');

async function runtimeSmoke(baseUrl) {
  const cookieJar = [];
  async function request(pathname, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (cookieJar.length) headers.cookie = cookieJar.join('; ');
    const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookieJar.push(setCookie.split(';')[0]);
    const text = await response.text();
    return { status: response.status, text };
  }

  const demo = await request('/api/auth/demo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.strictEqual(demo.status, 200, 'demo login should work');

  const protectedBefore = await request('/api/workspace/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"reason":"navigation-test"}' });
  assert.strictEqual(protectedBefore.status, 451, 'protected workspace action must be blocked before license acceptance');

  const view = await request('/api/license/view', { method: 'POST' });
  assert.strictEqual(view.status, 200, 'policy view must be tracked');
  const accept = await request('/api/license/accept', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'acknowledgedReview=true'
  });
  assert.strictEqual(accept.status, 200, 'policy acceptance must persist');

  const endpoints = [
    ['/api/health', 'Health CTA endpoint'],
    ['/api/catalog', 'API docs/catalog tab'],
    ['/api/billing/plans', 'Billing/cart tab'],
    ['/api/simulations/catalog', 'Sandbox/simulations tab'],
    ['/api/platform/runtime/status', 'Runtime status strip']
  ];
  for (const [pathname, label] of endpoints) {
    const response = await request(pathname);
    assert.strictEqual(response.status, 200, `${label} should return 200`);
  }

  const reset = await request('/api/workspace/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"reason":"navigation-test"}' });
  assert.strictEqual(reset.status, 200, 'Reset CTA should execute after license acceptance');
}

(async () => {
  const baseUrl = process.argv[2] || process.env.CINTENT_BASE_URL;
  if (baseUrl) {
    await runtimeSmoke(baseUrl.replace(/\/$/, ''));
  }
  console.log(JSON.stringify({
    status: 'pass',
    suite: 'platform-navigation-contract',
    modules: moduleIds.length,
    stageFilters: [...new Set(stageButtons)].sort(),
    runtimeSmoke: Boolean(baseUrl)
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
