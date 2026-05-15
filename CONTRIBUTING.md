# Contributing to CINTENT

CINTENT is a domain-agnostic cognitive infrastructure platform. Contributions should preserve the shared runtime model: metadata registry, orchestration, replay, governance, simulations, observability, SDK intelligence, and Ask COGNI context.

## Development Standards

- Keep domain logic metadata-driven instead of hardcoded into UI flows.
- Add tests for authentication, sandbox, session state, Ask COGNI context, replay, and governance changes.
- Do not introduce fake telemetry, placeholder social links, or static response templates.
- Treat protected data, tenant data, replay payloads, and audit traces as sensitive.

## Pull Request Checklist

- The app builds and starts locally.
- New endpoints are represented in OpenAPI.
- User-facing runtime behavior has trace events.
- Sandbox behavior is rate-limited and expires.
- Documentation and SDK examples are updated when API contracts change.
