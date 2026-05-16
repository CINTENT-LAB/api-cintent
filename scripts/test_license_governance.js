const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const platform = fs.readFileSync(path.join(root, 'public', 'CINTENT-PLATFORM-PROD.html'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'migrations', '004_license_governance.sql'), 'utf8');
const policy = fs.readFileSync(path.join(root, 'policies', 'ENTERPRISE_LICENSE_AGREEMENT.md'), 'utf8');

[
  'license_policy_versions',
  'license_acceptance_logs',
  'policy_view_logs',
  'consent_audit_logs'
].forEach(table => assert(migration.includes(table), `missing migration table ${table}`));

[
  '/api/license/policy',
  '/api/license/status',
  '/api/license/view',
  '/api/license/accept',
  'licenseEnforcementMiddleware'
].forEach(marker => assert(server.includes(marker), `missing backend marker ${marker}`));

[
  'renderLicenseGate',
  'loadLicenseGovernance',
  'policyGate',
  'data-license-action="accept"',
  'Review checkbox'
].forEach(marker => assert(platform.includes(marker), `missing frontend marker ${marker}`));

[
  'AI-assisted outputs may be incomplete',
  'Commercial production use requires an active paid subscription',
  'Reverse Engineering Restrictions',
  'Replay systems are diagnostic'
].forEach(marker => assert(policy.includes(marker), `missing policy clause ${marker}`));

console.log(JSON.stringify({
  status: 'pass',
  suite: 'license-governance-static-validation',
  evidence: {
    migration: '004_license_governance.sql',
    policy: 'policies/ENTERPRISE_LICENSE_AGREEMENT.md',
    backend: 'server.js license routes and enforcement middleware',
    frontend: 'CINTENT-PLATFORM-PROD.html mandatory consent gate'
  }
}, null, 2));
