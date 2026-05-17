const travelTemplates = {
  genericTripPlanning: {
    templateId: 'travel-trip-planning',
    workflowId: 'trip-planning',
    journey: {
      purpose: 'leisure',
      origin: 'Bengaluru',
      destination: 'Singapore',
      startAt: '2026-06-12T08:00:00.000Z',
      endAt: '2026-06-17T20:00:00.000Z'
    },
    preferences: {
      pace: 'balanced',
      localExperience: true,
      mobility: 'airport-transfer-required'
    }
  },
  disruptionRecovery: {
    templateId: 'travel-disruption-recovery',
    workflowId: 'travel-disruption-handling',
    telemetry: [
      { signal: 'delay_detected', journeyId: 'journey-demo', delayMinutes: 95, location: 'airport-terminal' }
    ],
    incident: {
      incident_type: 'flight_delay',
      severity: 'elevated',
      recommended_action: 'rebalance onward transport and hotel late-arrival policy'
    }
  },
  crossBorderMedicalTravel: {
    templateId: 'cross-border-medical-travel',
    workflowId: 'cross-border-coordination',
    journey: { purpose: 'medical-travel', destination: 'Thailand' },
    governanceContext: ['passport-visa-sensitivity', 'traveler-privacy', 'insurance-restrictions']
  }
};

module.exports = {
  travelTemplates
};
