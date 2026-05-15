# Security Policy

## Reporting a Vulnerability

Email vulnerability reports to `security@cognivantalabs.com`.

Include:

- Affected endpoint or component.
- Reproduction steps.
- Expected and actual impact.
- Any logs with secrets and protected data removed.

Do not include PHI, production customer data, API keys, cookies, or credentials in the initial report.

## Platform Security Expectations

- Sandbox sessions expire after one hour and are rate-limited.
- Enterprise routes use RBAC gates.
- Replay and trace payloads must remain tenant-scoped.
- Security-sensitive changes must update OpenAPI and runtime trace coverage.
