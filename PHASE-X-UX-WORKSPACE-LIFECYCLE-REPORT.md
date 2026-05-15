# PHASE-X UX Workspace Lifecycle Report

## Scope

Refactored workspace lifecycle behavior so login no longer silently hydrates stale domain, API, workflow, simulation, replay, orchestration, telemetry, or Ask COGNI context.

## Implemented

- Login now lands on an explicit Workspace Initialization screen.
- Added lifecycle choices:
  - Start Fresh Workspace
  - Resume Previous Workspace
  - Open Sandbox Example
  - Load Template
- Fresh workspace starts with empty domain, workflow, API, simulation, replay, telemetry, and Ask COGNI state.
- Ask COGNI fresh prompt is: `What would you like to build today?`
- Resume validates compatibility before hydration.
- Invalid saved workspaces are shown as blocked restorations instead of being loaded.
- Sandbox example is explicit and isolated.
- Reset Workspace now calls a backend reset endpoint and clears active orchestration, replay, telemetry, workflow, simulation, and Ask COGNI context without logout.
- Runtime IDs are hidden behind labels such as `Session Active`, `Context Ready`, and `Needs Setup`.

## Backend Runtime

- Added `POST /api/workspace/reset`.
- Reset clears active in-memory tenant runtime state while preserving historical audit/replay records.
- Reset persists a `workspace.lifecycle.reset` event and records trace evidence.

## Frontend Runtime

- Removed automatic `restoreBackendWorkspaceSession()` from `initializeSession()`.
- Workspace restore now requires explicit resume intent.
- Added frontend compatibility checks before hydration:
  - domain/workflow compatibility
  - application/domain compatibility
  - simulation/domain compatibility
- Split active runtime state, persisted workspace candidates, sandbox state, and temporary UI state.

## Evidence

Evidence directory: `audit-evidence/workspace-lifecycle`

- `frontend-lifecycle-static.json`
- `invalid-workspace-fixture.json`
- `valid-workspace-fixture.json`
- `workspace-candidates.json`
- `explicit-restore.json`
- `workspace-reset.json`
- `post-reset-runtime-evidence.json`

## Validation

Command:

```bash
npm run test:workspace-lifecycle -- http://localhost:3116
```

Result:

```json
{
  "status": "passed",
  "validations": [
    "login does not auto-hydrate workspace",
    "workspace initialization screen exists",
    "fresh workspace clean prompt exists",
    "resume is explicit",
    "invalid state fixture is visible but frontend-blocked",
    "backend workspace reset clears active runtime",
    "sandbox/template lifecycle controls are present"
  ]
}
```

## Browser QA

Verified locally in the in-app browser:

- Demo login opens `/platform` on Workspace Initialization.
- Start Fresh opens Ask COGNI Workspace with `Session Active`, blank domain selection, and clean prompt.
- Reset returns to Workspace Initialization and shows reset confirmation.

Screenshot capture through the browser automation channel timed out, so visual proof is recorded as browser DOM/visibility verification rather than a PNG artifact.

## Known Limits

- Historical persisted workspaces are retained for audit and can still appear as resume candidates.
- Backend reset intentionally does not delete governed replay/audit history.
- Full production validation should rerun this suite against the real database stack, not only local runtime fallback.
