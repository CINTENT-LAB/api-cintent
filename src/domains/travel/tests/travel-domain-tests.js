const assert = require('assert/strict');
const travel = require('..');

const mandatoryCoverage = [
  'trip-planning',
  'personalized-travel-assistance',
  'multi-city-journey-coordination',
  'flight-coordination',
  'hotel-coordination',
  'visa-immigration-workflow',
  'last-mile-transportation',
  'airport-coordination',
  'emergency-travel-assistance',
  'group-travel-coordination',
  'business-travel',
  'medical-travel',
  'travel-insurance-workflow',
  'tourism-intelligence',
  'travel-continuity-management',
  'real-time-travel-alerts',
  'cognitive-travel-orchestration',
  'journey-replay',
  'traveler-risk-intelligence',
  'travel-telemetry-runtime'
];

const mandatoryOntology = [
  'travelers',
  'journeys',
  'itineraries',
  'bookings',
  'checkpoints',
  'accommodations',
  'transportation',
  'flights',
  'visas',
  'incidents',
  'advisories',
  'preferences',
  'disruptions',
  'travelContinuity',
  'emergencyStates',
  'travelTelemetry',
  'mobilityEvents'
];

function assertContainsAll(actual, expected, label) {
  for (const item of expected) {
    assert.ok(actual.includes(item), `${label} should include ${item}`);
  }
}

function pass(id, name, evidence) {
  return { id, name, status: 'PASS', evidence };
}

function runTravelDomainTests() {
  const pack = travel.createTravelRuntimePack();
  const ontology = travel.getTravelOntology();
  const workflows = travel.listTravelWorkflows();
  const coverage = travel.coverageMatrix();

  assert.equal(pack.domain, 'travel');
  assert.equal(pack.runtimePack, 'CINTENT Travel Domain Runtime Pack');
  assertContainsAll(pack.coverage, mandatoryCoverage, 'travel coverage');
  assertContainsAll(Object.keys(ontology.entities), mandatoryOntology, 'travel ontology');
  for (const area of mandatoryCoverage) {
    assert.ok(coverage[area] && coverage[area].length >= 1, `coverage matrix should map ${area}`);
  }

  const tripOrchestration = travel.compileTravelOrchestration('trip-lifecycle', {
    travelerId: 'traveler-01',
    journey: { journeyId: 'journey-01', destination: 'Singapore' },
    preferences: { pace: 'balanced' }
  });
  assert.equal(tripOrchestration.status, 'compiled');
  assert.ok(tripOrchestration.stages.every(stage => stage.replayable));
  assert.ok(tripOrchestration.stages.some(stage => stage.stage === 'monitor_checkpoints'));

  const disruptionRecovery = travel.travelApiHandlers.recoverDisruption({
    journeyId: 'journey-02',
    activeSegment: 'flight-connection',
    disruption: { disruption_type: 'flight_delay', delay_minutes: 95 },
    telemetry: [{ signal: 'disruption_detected', journeyId: 'journey-02', severity: 'elevated' }]
  });
  assert.equal(disruptionRecovery.orchestration.status, 'compiled');
  assert.equal(disruptionRecovery.continuity.risk.riskLevel, 'elevated');
  assert.notEqual(disruptionRecovery.continuity.continuityState.recoveryState, 'continuous');

  const replay = travel.reconstructJourneyReplay({
    journey: { journeyId: 'journey-03' },
    itinerary: {
      journeyId: 'journey-03',
      segments: [
        { id: 'origin-checkin', status: 'completed', location: 'origin-airport', expectedAt: '2026-06-12T08:00:00.000Z' },
        { id: 'hotel-arrival', status: 'missed', location: 'destination-hotel', expectedAt: '2026-06-12T18:00:00.000Z' }
      ]
    },
    telemetry: [
      travel.normalizeTravelTelemetry({ journeyId: 'journey-03', signal: 'mobility_transition', location: 'airport-transfer', timestamp: '2026-06-12T16:00:00.000Z' })
    ],
    incidents: [{ id: 'incident-01', severity: 'disruption', detectedAt: '2026-06-12T17:00:00.000Z' }]
  });
  assert.equal(replay.replayType, 'travel-journey-replay');
  assert.ok(replay.itineraryReplay.length >= 2);
  assert.ok(replay.disruptionReplay.length >= 2);
  assert.equal(replay.continuityReconstruction.recoveryRequired, true);

  const continuity = travel.travelApiHandlers.manageContinuity({
    journeyId: 'journey-04',
    lastKnownLocation: 'terminal-2',
    activeSegment: 'airport-transfer',
    telemetry: [
      { signal: 'location_continuity', journeyId: 'journey-04', location: 'terminal-2' },
      { signal: 'continuity_recovered', journeyId: 'journey-04', location: 'pickup-zone' }
    ]
  });
  assert.equal(continuity.continuityState.recoveryState, 'continuous');
  assert.equal(continuity.risk.continuityHealthy, true);

  const governance = travel.evaluateTravelGovernance({
    traveler: { passport_number: 'sensitive', nationality: 'sensitive' },
    visa: { visa_id: 'visa-sensitive' },
    location: 'precise-location',
    workflow: 'cross-border workflow',
    insurance: { policy: 'travel-cover' }
  });
  assert.equal(governance.decision, 'needs_review');
  assert.equal(governance.redactionRequired, true);
  assertContainsAll(governance.triggeredPolicies, [
    'passport-visa-sensitivity',
    'location-data-protection',
    'insurance-restrictions',
    'cross-border-data-compliance'
  ], 'governance policies');

  const telemetry = travel.travelApiHandlers.ingestTelemetry({
    journeyId: 'journey-05',
    signal: 'emergency_event',
    emergency: true,
    mobilityTransition: 'rail-to-road',
    location: 'city-center'
  });
  assert.equal(telemetry.telemetry.domain, 'travel');
  assert.equal(telemetry.risk.riskLevel, 'critical');
  assert.ok(travel.travelTelemetrySignals.includes('mobility_state'));
  assert.ok(travel.travelTelemetrySignals.includes('travel_risk_level'));

  const ask = travel.contextualizeTravelAsk('Flight cancelled, passport check pending, need emergency hotel and route guidance', {
    journeyId: 'journey-06',
    preferences: { pace: 'low-stress' },
    continuityState: 'disrupted',
    replayRef: 'replay-06'
  });
  assert.equal(ask.domain, 'travel');
  assert.equal(ask.intent, 'emergency-travel-assistance');
  assert.ok(ask.contextualFocus.includes('replay-aware assistance'));
  assert.ok(ask.responseGuidance.some(item => /Mask sensitive/.test(item)));

  const apiPaths = travel.travelApiContracts.map(api => api.path);
  assert.ok(apiPaths.every(path => path.startsWith('/api/domain/travel/')));
  assert.equal(pack.runtimePack, 'CINTENT Travel Domain Runtime Pack');
  assert.ok(travel.travelApiContracts.every(api => api.path.startsWith('/api/domain/travel/')));

  const results = [
    pass('TEST-TRAVEL-01', 'Trip orchestration workflow', {
      workflowId: tripOrchestration.workflow.id,
      status: tripOrchestration.status,
      stages: tripOrchestration.stages.map(stage => stage.stage)
    }),
    pass('TEST-TRAVEL-02', 'Disruption recovery workflow', {
      workflowId: disruptionRecovery.orchestration.workflow.id,
      riskLevel: disruptionRecovery.continuity.risk.riskLevel,
      recoveryState: disruptionRecovery.continuity.continuityState.recoveryState
    }),
    pass('TEST-TRAVEL-03', 'Journey replay reconstruction', {
      replayType: replay.replayType,
      timelineEvents: replay.timeline.length,
      recoveryRequired: replay.continuityReconstruction.recoveryRequired
    }),
    pass('TEST-TRAVEL-04', 'Traveler continuity persistence', {
      journeyId: continuity.continuityState.journeyId,
      recoveryState: continuity.continuityState.recoveryState,
      continuityHealthy: continuity.risk.continuityHealthy
    }),
    pass('TEST-TRAVEL-05', 'Governance enforcement', {
      decision: governance.decision,
      triggeredPolicies: governance.triggeredPolicies,
      redactionRequired: governance.redactionRequired
    }),
    pass('TEST-TRAVEL-06', 'Travel telemetry validation', {
      signal: telemetry.telemetry.signal,
      riskLevel: telemetry.risk.riskLevel,
      telemetryStreams: travel.travelTelemetrySignals
    }),
    pass('TEST-TRAVEL-07', 'Ask COGNI travel contextualization', {
      intent: ask.intent,
      vocabularyCount: ask.vocabulary.length,
      replayAware: ask.contextualFocus.includes('replay-aware assistance')
    })
  ];

  return {
    pack,
    ontology,
    workflows,
    coverage,
    apiContracts: travel.travelApiContracts,
    governancePolicies: travel.travelGovernancePolicies,
    telemetrySignals: travel.travelTelemetrySignals,
    results,
    evidence: {
      tripOrchestration,
      disruptionRecovery,
      replay,
      continuity,
      governance,
      telemetry,
      ask
    },
    blockingFailures: []
  };
}

module.exports = {
  mandatoryCoverage,
  mandatoryOntology,
  runTravelDomainTests
};
