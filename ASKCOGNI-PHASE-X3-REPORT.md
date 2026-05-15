# PHASE-X.3 Ask COGNI Runtime Report

## Context Synchronization Engine

Ask COGNI now exposes `/api/ask/context/sync`, which normalizes the active workspace context, validates domain/application/API/simulation fit, persists state through the unified persistence runtime, and returns proactive guidance without requiring the user to type first.

## Stateful Ask COGNI Runtime

The `/api/ask` response now includes:

- `statefulContext`
- `semanticMemory`
- `workflowStateMachine`
- `uxLayers`
- `enterpriseUx`
- context validation
- proactive quick actions

Responses are shaped by active domain, application, workflow, user mode, telemetry, replay, orchestration, and prior memory.

## Workflow State Machine

Workflow progression is tracked across:

1. select-domain
2. select-apis
3. generate-workflow
4. run-simulation
5. inspect-replay
6. generate-sdk
7. deploy-runtime

The state machine persists through workspace state and quick-action execution.

## Quick Actions Runtime

`/api/ask/quick-action` executes real runtime actions:

- run simulation
- generate SDK
- create workflow
- view orchestration
- open replay
- show governance
- export replay
- deploy runtime plan

Each quick action emits trace events and persistence events.

## Telemetry Awareness

Manufacturing telemetry now influences Ask COGNI responses. An anomaly updates contextual cards and recommendations toward predictive maintenance, replay capture, and governance review.

## UX Runtime

Generated component: `src/components/AskCogniWorkspace.tsx`.

The component implements the intended left/center/right enterprise cognitive workspace layout:

- left: context
- center: runtime question/workspace
- right: Ask COGNI intelligence, cards, and quick actions

## Validation

Added `npm run test:ask-cogni-runtime`.

It validates:

- context synchronization
- domain-aware guidance
- stateful memory
- duplicate response variation
- strict mismatch validation
- quick-action execution
- enterprise UX response layers
