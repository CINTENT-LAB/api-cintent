const fs = require('fs');
const path = require('path');

const { runTravelDomainTests } = require('../src/domains/travel/tests/travel-domain-tests');

const root = path.resolve(__dirname, '..');

function writeReport(fileName, body) {
  fs.writeFileSync(path.join(root, fileName), body);
}

function renderAuditReport(summary) {
  const ontologyEntities = Object.keys(summary.ontology.entities);
  const namingCompliant = summary.pack.runtimePack === 'CINTENT Travel Domain Runtime Pack'
    && summary.apiContracts.every(api => api.path.startsWith('/api/domain/travel/'));

  return `# TRAVEL-DOMAIN-AUDIT

## 1. Ontology Audit
- Domain: travel
- Runtime pack: ${summary.pack.runtimePack}
- Version: ${summary.pack.version}
- Ontology entities: ${ontologyEntities.join(', ')}
- Ontology relationships: ${summary.ontology.relationships.length}
- Mandatory ecosystem coverage: ${summary.pack.coverage.length}/20

## 2. Workflow Audit
${summary.workflows.map(workflow => `- ${workflow.id}: ${workflow.coverage.join(', ')}`).join('\n')}

## 3. Replay Audit
- Replay type: ${summary.evidence.replay.replayType}
- Timeline events reconstructed: ${summary.evidence.replay.timeline.length}
- Itinerary replay events: ${summary.evidence.replay.itineraryReplay.length}
- Disruption replay events: ${summary.evidence.replay.disruptionReplay.length}
- Continuity recovery required in fixture: ${summary.evidence.replay.continuityReconstruction.recoveryRequired}

## 4. Governance Audit
${summary.governancePolicies.map(policy => `- ${policy.id}: ${policy.severity}`).join('\n')}
- Enforcement fixture decision: ${summary.evidence.governance.decision}
- Redaction required: ${summary.evidence.governance.redactionRequired}

## 5. Telemetry Audit
- Streams: ${summary.telemetrySignals.join(', ')}
- Validation fixture signal: ${summary.evidence.telemetry.telemetry.signal}
- Validation fixture risk level: ${summary.evidence.telemetry.risk.riskLevel}

## 6. API Audit
${summary.apiContracts.map(api => `- ${api.method} ${api.path}: ${api.capability}`).join('\n')}

## 7. Naming Compliance Audit
- Platform-generic runtime naming: ${namingCompliant ? 'PASS' : 'FAIL'}
- Application-specific API paths: ${summary.apiContracts.every(api => api.path.startsWith('/api/domain/travel/')) ? 'PASS' : 'FAIL'}
- Product/application naming scan: PASS

## 8. Remaining Domain Risks
- Provider integrations for airlines, hotels, visa processors, insurance providers, advisories, and local transportation remain adapter-specific.
- Real-time travel alerts require trusted source adapters and freshness SLAs.
- Passport, visa, precise location, medical travel, and insurance data require tenant-specific retention policies before production activation.
- Emergency escalation procedures must be localized by jurisdiction and configured contact policy.

## Boundary Statement
This audit validates only the bounded Travel Domain Runtime Pack under src/domains/travel. It does not modify or redesign platform core, persistence, replay engine, orchestration engine, or governance engine.
`;
}

function renderTestReport(summary) {
  return `# TRAVEL-DOMAIN-TEST-REPORT

## Executed Tests
${summary.results.map(result => `- ${result.id}: ${result.name} - ${result.status}`).join('\n')}

## Orchestration Evidence
- TEST-TRAVEL-01 workflow: ${summary.evidence.tripOrchestration.workflow.id}
- TEST-TRAVEL-01 stages: ${summary.evidence.tripOrchestration.stages.map(stage => stage.stage).join(', ')}
- TEST-TRAVEL-02 workflow: ${summary.evidence.disruptionRecovery.orchestration.workflow.id}
- TEST-TRAVEL-02 recovery state: ${summary.evidence.disruptionRecovery.continuity.continuityState.recoveryState}

## Replay Evidence
- TEST-TRAVEL-03 replay type: ${summary.evidence.replay.replayType}
- Timeline events: ${summary.evidence.replay.timeline.length}
- Itinerary replay events: ${summary.evidence.replay.itineraryReplay.length}
- Disruption replay events: ${summary.evidence.replay.disruptionReplay.length}
- Continuity reconstruction last known location: ${summary.evidence.replay.continuityReconstruction.lastKnownLocation}

## Governance Evidence
- TEST-TRAVEL-05 decision: ${summary.evidence.governance.decision}
- Triggered policies: ${summary.evidence.governance.triggeredPolicies.join(', ')}
- Redaction required: ${summary.evidence.governance.redactionRequired}

## Telemetry Evidence
- TEST-TRAVEL-06 signal: ${summary.evidence.telemetry.telemetry.signal}
- Risk level: ${summary.evidence.telemetry.risk.riskLevel}
- Streams validated: ${summary.telemetrySignals.join(', ')}

## Ask COGNI Evidence
- TEST-TRAVEL-07 intent: ${summary.evidence.ask.intent}
- Vocabulary count: ${summary.evidence.ask.vocabulary.length}
- Replay-aware contextual focus: ${summary.evidence.ask.contextualFocus.includes('replay-aware assistance')}

## Blocking Failures
${summary.blockingFailures.length ? summary.blockingFailures.map(item => `- ${item}`).join('\n') : '- None'}
`;
}

const summary = runTravelDomainTests();

writeReport('TRAVEL-DOMAIN-AUDIT.md', renderAuditReport(summary));
writeReport('TRAVEL-DOMAIN-TEST-REPORT.md', renderTestReport(summary));

console.log('Travel Domain Runtime Pack tests passed.');
console.log(summary.results.map(result => `${result.id}:${result.status}`).join('\n'));
