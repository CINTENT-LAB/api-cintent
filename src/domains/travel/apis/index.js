const { compileTravelOrchestration } = require('../orchestration');
const { normalizeTravelTelemetry, evaluateTravelRisk } = require('../telemetry');
const { reconstructJourneyReplay } = require('../replay');
const { evaluateTravelGovernance } = require('../governance');

const travelApiContracts = [
  {
    id: 'travel-itinerary-management',
    method: 'POST',
    path: '/api/domain/travel/itinerary',
    capability: 'itinerary management',
    request: ['travelerId', 'journey', 'segments', 'preferences'],
    response: ['itinerary', 'governance', 'orchestration']
  },
  {
    id: 'travel-continuity',
    method: 'POST',
    path: '/api/domain/travel/continuity',
    capability: 'travel continuity',
    request: ['journeyId', 'lastKnownLocation', 'activeSegment', 'telemetry'],
    response: ['continuityState', 'risk', 'recoveryRecommendation']
  },
  {
    id: 'travel-journey-replay',
    method: 'POST',
    path: '/api/domain/travel/replay',
    capability: 'journey replay',
    request: ['journey', 'itinerary', 'telemetry', 'incidents'],
    response: ['timeline', 'itineraryReplay', 'disruptionReplay', 'continuityReconstruction']
  },
  {
    id: 'travel-telemetry',
    method: 'POST',
    path: '/api/domain/travel/telemetry',
    capability: 'travel telemetry',
    request: ['journeyId', 'signal', 'checkpointId', 'locationContinuity', 'delayMinutes'],
    response: ['telemetry', 'risk']
  },
  {
    id: 'travel-emergency-coordination',
    method: 'POST',
    path: '/api/domain/travel/emergency',
    capability: 'emergency coordination',
    request: ['journeyId', 'travelerId', 'incident', 'location', 'contacts'],
    response: ['governance', 'orchestration', 'escalation']
  },
  {
    id: 'travel-disruption-recovery',
    method: 'POST',
    path: '/api/domain/travel/disruption',
    capability: 'disruption recovery',
    request: ['journeyId', 'disruption', 'activeSegment', 'telemetry'],
    response: ['governance', 'orchestration', 'continuity']
  },
  {
    id: 'traveler-state-management',
    method: 'POST',
    path: '/api/domain/travel/traveler-state',
    capability: 'traveler state management',
    request: ['travelerId', 'preferences', 'travelMemory', 'tripContinuity'],
    response: ['travelerState', 'governance', 'memoryPolicy']
  }
];

const travelApiHandlers = {
  manageItinerary(payload = {}) {
    const orchestration = compileTravelOrchestration('itinerary-planning', payload);
    return {
      itinerary: {
        itineraryId: payload.itineraryId || `itinerary-${Date.now()}`,
        travelerId: payload.travelerId || null,
        journey: payload.journey || {},
        segments: payload.segments || [],
        preferences: payload.preferences || {}
      },
      governance: evaluateTravelGovernance(payload),
      orchestration
    };
  },
  manageContinuity(payload = {}) {
    const telemetry = (payload.telemetry || []).map(normalizeTravelTelemetry);
    const risk = evaluateTravelRisk(telemetry);
    return {
      continuityState: {
        journeyId: payload.journeyId || 'journey-unknown',
        lastKnownLocation: payload.lastKnownLocation || risk.latest?.locationContinuity || null,
        activeSegment: payload.activeSegment || null,
        recoveryState: risk.riskLevel === 'normal' ? 'continuous' : 'recovery_recommended'
      },
      risk,
      recoveryRecommendation: risk.riskLevel === 'critical' ? 'run emergency-rerouting' : risk.riskLevel === 'elevated' ? 'run travel-disruption-handling' : 'continue monitoring'
    };
  },
  replayJourney(payload = {}) {
    return reconstructJourneyReplay(payload);
  },
  ingestTelemetry(payload = {}) {
    const telemetry = normalizeTravelTelemetry(payload);
    return {
      telemetry,
      risk: evaluateTravelRisk([telemetry])
    };
  },
  coordinateEmergency(payload = {}) {
    return {
      governance: evaluateTravelGovernance({ ...payload, emergency: true }),
      orchestration: compileTravelOrchestration('emergency-rerouting', payload),
      escalation: {
        level: 'immediate',
        instructions: ['prioritize traveler safety', 'notify configured emergency contacts', 'capture replay checkpoints']
      }
    };
  },
  recoverDisruption(payload = {}) {
    return {
      governance: evaluateTravelGovernance(payload),
      orchestration: compileTravelOrchestration('disruption-recovery', payload),
      continuity: this.manageContinuity({
        journeyId: payload.journeyId,
        lastKnownLocation: payload.lastKnownLocation,
        activeSegment: payload.activeSegment,
        telemetry: payload.telemetry || [{ signal: 'disruption_detected', journeyId: payload.journeyId, severity: 'elevated' }]
      })
    };
  },
  manageTravelerState(payload = {}) {
    return {
      travelerState: {
        travelerId: payload.travelerId || 'traveler-unknown',
        preferences: payload.preferences || {},
        travelMemory: payload.travelMemory || {},
        tripContinuity: payload.tripContinuity || {}
      },
      governance: evaluateTravelGovernance(payload),
      memoryPolicy: 'preference summaries are retained; passport, visa, and precise location values must be masked in user-facing replay'
    };
  }
};

module.exports = {
  travelApiContracts,
  travelApiHandlers
};
