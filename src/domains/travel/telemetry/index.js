const travelTelemetrySignals = [
  'location_continuity',
  'travel_progress',
  'delay_detected',
  'disruption_detected',
  'mobility_transition',
  'mobility_state',
  'emergency_event',
  'travel_risk_state',
  'travel_risk_level',
  'checkpoint_completed',
  'provider_handoff',
  'continuity_recovered'
];

function normalizeTravelTelemetry(event = {}) {
  const signal = event.signal || event.type || 'travel_progress';
  const severity = event.severity || (event.delayMinutes > 120 || event.emergency ? 'critical' : event.delayMinutes > 30 ? 'elevated' : 'normal');
  return {
    domain: 'travel',
    signal,
    journeyId: event.journeyId || event.journey_id || 'journey-unknown',
    travelerId: event.travelerId || event.traveler_id || null,
    checkpointId: event.checkpointId || event.checkpoint_id || null,
    locationContinuity: event.locationContinuity || event.location || null,
    delayMinutes: Number(event.delayMinutes || event.delay_minutes || 0),
    mobilityTransition: event.mobilityTransition || event.mobility_transition || null,
    riskState: event.riskState || severity,
    timestamp: event.timestamp || new Date().toISOString(),
    raw: event
  };
}

function evaluateTravelRisk(events = []) {
  const normalized = events.map(normalizeTravelTelemetry);
  const critical = normalized.filter(event => ['critical', 'emergency'].includes(event.riskState) || event.signal === 'emergency_event');
  const disruptions = normalized.filter(event => /disruption|delay|emergency/.test(event.signal));
  return {
    riskLevel: critical.length ? 'critical' : disruptions.length ? 'elevated' : 'normal',
    disruptionCount: disruptions.length,
    criticalCount: critical.length,
    continuityHealthy: !normalized.some(event => event.signal === 'location_continuity' && event.riskState !== 'normal'),
    latest: normalized[normalized.length - 1] || null
  };
}

module.exports = {
  travelTelemetrySignals,
  normalizeTravelTelemetry,
  evaluateTravelRisk
};
