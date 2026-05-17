# Complete App Regression Checklist

This checklist is the source-of-truth coverage map for the localhost and deployment-ready CINTENT platform shell in [CINTENT-PLATFORM-PROD.html](C:/Users/rpm_T/RAJA_REP/api-cintent/public/CINTENT-PLATFORM-PROD.html) and the API runtime in [server.js](C:/Users/rpm_T/RAJA_REP/api-cintent/server.js).

## How To Run

1. Start the app:

```bash
npm start
```

2. Run the static interaction audit:

```bash
npm run audit:interactions
```

3. Run the full runtime sweep:

```bash
npm run test:complete-app -- http://127.0.0.1:3000
```

4. Review generated evidence in [audit-evidence/complete-app-coverage](C:/Users/rpm_T/RAJA_REP/api-cintent/audit-evidence/complete-app-coverage).

## Coverage Standard

The app is considered covered only when both are true:

- Every page or tab has a registered renderer and active view container.
- Every visible CTA, button, tab, or dropdown has a matching interaction handler and a working backend route or intentional client-side action.

## Page And Module Matrix

- `learn`: learning center, guided onboarding, contextual learning prompts
- `operating`: enterprise runtime workspace, status strip, runtime evidence
- `docs`: API catalog, API detail, search-driven documentation
- `discovery`: domain discovery, business problem search, roadmap actions
- `playground`: API selection, sandbox execution, lineage runtime
- `studio`: node registry, workflow compile, execute, export
- `environments`: simulation catalog, selection, execution
- `billing`: plans, activation, invoice preview, inquiry
- `observability`: metrics, traces, runtime health, forensics
- `issues`: issue package creation and support diagnostics
- `ask`: Ask COGNI context sync, prompts, quick actions, stage actions
- `workspace`: workspace lifecycle, state restore, reset, API key generation
- `sdk`: SDK intelligence, snippet generation, code generation
- `admin`: restricted-mode rendering plus `/admin` route protection
- `readiness`: readiness, health, status, metrics
- `standards`: compliance registry and standards search
- `dependencies`: dependency graph and metadata validation
- `visualizer`: replay reconstruction, export, visualizer data
- `memory`: memory summary, timeline, search, reconstruct
- `agents`: registry, coordination, replay, metrics
- `governance`: policies, evaluation, replay, metrics
- `marketplace`: packages, package detail, compile, replay, metrics
- `enterprise-os`: summary, command execution, replay, metrics
- `healthcare`: summary, API development, executable runtime, hardening, advanced, integration, commercial, global, compliance, clinical data
- `audit`: logs and export bundle
- `usecase`: enterprise use-case request submission

## High-Risk Interaction Families

- Workspace lifecycle:
  - `Start Fresh Workspace`
  - `Resume Previous Workspace`
  - `Open Sandbox Example`
  - `Load Template`

- Ask COGNI:
  - workspace dropdowns
  - stage chips
  - validation actions
  - quick actions
  - main submit CTA

- Playground:
  - API dropdown
  - mode dropdown
  - ecosystem and protocol dropdowns
  - `Run simulated execution`
  - `Add to cart`

- Simulation:
  - simulation cards
  - `Launch simulation`
  - Ask COGNI simulation CTA

- Studio:
  - `Compile Workflow`
  - `Execute Workflow`
  - `Export Workflow`
  - node add / selection actions

## Required Evidence Files

- `summary.json`
- `auth.json`
- `core-runtime.json`
- `discovery.json`
- `workspace-ask.json`
- `playground-studio-simulation.json`
- `orchestration-visualizer-memory.json`
- `advanced-modules.json`
- `healthcare.json`
- `billing-audit-usecase.json`

## Expected Outcome

When the suite passes:

- all module families are reachable
- all high-value CTAs are wired
- all protected flows work after auth and license acceptance
- professional-tier-only features are validated under an activated professional test account
- runtime, replay, governance, simulation, and workspace evidence is saved for review
