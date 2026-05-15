const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'config', 'social-links.json');
const publicHtml = path.join(root, 'public', 'CINTENT-PLATFORM-PROD.html');
const blocked = ['#', 'javascript:', 'example.com', 'lorem', 'placeholder', 'twitter.com/#', 'linkedin.com/#'];

function fail(message) {
  console.error(`social-link-check failed: ${message}`);
  process.exitCode = 1;
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
for (const link of config.links || []) {
  if (!link.url || !/^https:\/\//.test(link.url)) {
    fail(`${link.label || 'unnamed link'} must use a working HTTPS URL`);
  }
  const lower = String(link.url).toLowerCase();
  if (blocked.some(pattern => lower.includes(pattern))) {
    fail(`${link.label || lower} contains a blocked placeholder pattern`);
  }
}

const html = fs.existsSync(publicHtml) ? fs.readFileSync(publicHtml, 'utf8').toLowerCase() : '';
const socialHrefPattern = /href=["']([^"']*(twitter|x\.com|linkedin|facebook|instagram|youtube|github)[^"']*)["']/g;
let match;
while ((match = socialHrefPattern.exec(html)) !== null) {
  const href = match[1];
  if (blocked.some(pattern => href.includes(pattern))) {
    fail(`placeholder social href found in platform HTML: ${href}`);
  }
}

if (!process.exitCode) {
  console.log('social-link-check passed');
}
