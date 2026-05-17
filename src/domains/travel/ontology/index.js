const TRAVEL_ONTOLOGY_VERSION = 'phase-6.domain.travel.v1';

const travelEntities = {
  travelers: {
    identity: ['traveler_id', 'profile_ref', 'party_role'],
    sensitive: ['passport_number', 'visa_id', 'nationality', 'date_of_birth'],
    continuity: ['preferences', 'mobility_needs', 'loyalty_context', 'risk_tolerance']
  },
  journeys: {
    identity: ['journey_id', 'purpose', 'origin', 'destination', 'start_at', 'end_at'],
    continuity: ['current_checkpoint', 'next_checkpoint', 'recovery_plan', 'trip_memory_ref']
  },
  bookings: {
    identity: ['booking_id', 'provider', 'booking_type', 'status'],
    scope: ['flight', 'hotel', 'transportation', 'experience', 'insurance']
  },
  itineraries: {
    identity: ['itinerary_id', 'journey_id', 'segments', 'constraints'],
    optimization: ['time_buffer_minutes', 'cost_band', 'accessibility', 'risk_score']
  },
  checkpoints: {
    identity: ['checkpoint_id', 'checkpoint_type', 'location', 'expected_at', 'actual_at'],
    status: ['planned', 'in_progress', 'completed', 'delayed', 'missed', 'recovered']
  },
  visas: {
    identity: ['visa_id', 'country', 'visa_type', 'valid_from', 'valid_to'],
    governance: ['passport_ref', 'document_sensitivity', 'immigration_status']
  },
  flights: {
    identity: ['flight_id', 'carrier', 'flight_number', 'origin_airport', 'destination_airport'],
    operations: ['gate', 'terminal', 'scheduled_departure', 'actual_departure', 'delay_minutes']
  },
  accommodations: {
    identity: ['accommodation_id', 'property_name', 'address', 'check_in', 'check_out'],
    continuity: ['late_arrival_policy', 'accessibility_features', 'cancellation_window']
  },
  transportation: {
    identity: ['transport_id', 'mode', 'provider', 'pickup', 'dropoff'],
    continuity: ['handoff_checkpoint', 'eta_minutes', 'mobility_transition']
  },
  incidents: {
    identity: ['incident_id', 'incident_type', 'severity', 'detected_at'],
    recovery: ['impact', 'recommended_action', 'escalation_path', 'insurance_context']
  },
  disruptions: {
    identity: ['disruption_id', 'journey_id', 'disruption_type', 'detected_at'],
    impact: ['affected_segments', 'delay_minutes', 'provider_state', 'recovery_options']
  },
  advisories: {
    identity: ['advisory_id', 'source', 'region', 'severity'],
    scope: ['weather', 'visa', 'security', 'health', 'strike', 'transport']
  },
  preferences: {
    identity: ['preference_id', 'traveler_id', 'category'],
    categories: ['seat', 'meal', 'budget', 'pace', 'accessibility', 'local_experience']
  },
  travelMemory: {
    identity: ['memory_id', 'traveler_id', 'journey_id'],
    contents: ['past_choices', 'known_constraints', 'successful_recoveries', 'disliked_options']
  },
  tripContinuity: {
    identity: ['continuity_id', 'journey_id'],
    state: ['last_known_location', 'active_segment', 'handoff_state', 'recovery_state']
  },
  travelContinuity: {
    identity: ['continuity_id', 'journey_id'],
    state: ['last_known_location', 'active_segment', 'handoff_state', 'recovery_state']
  },
  emergencyStates: {
    identity: ['emergency_state_id', 'journey_id', 'severity', 'opened_at'],
    response: ['escalation_level', 'safe_location', 'contact_state', 'assistance_plan']
  },
  travelTelemetry: {
    identity: ['telemetry_id', 'journey_id', 'signal', 'timestamp'],
    measures: ['location_continuity', 'travel_progress', 'delay_minutes', 'risk_level']
  },
  mobilityEvents: {
    identity: ['mobility_event_id', 'journey_id', 'mode', 'timestamp'],
    transition: ['from_checkpoint', 'to_checkpoint', 'provider', 'handoff_status']
  }
};

const ontologyRelationships = [
  ['traveler', 'owns', 'journey'],
  ['journey', 'contains', 'itinerary'],
  ['itinerary', 'contains', 'checkpoint'],
  ['itinerary', 'references', 'booking'],
  ['booking', 'may_reference', 'flight'],
  ['booking', 'may_reference', 'accommodation'],
  ['booking', 'may_reference', 'transportation'],
  ['traveler', 'holds', 'visa'],
  ['journey', 'may_trigger', 'incident'],
  ['journey', 'is_informed_by', 'advisory'],
  ['traveler', 'has', 'preferences'],
  ['traveler', 'accumulates', 'travelMemory'],
  ['journey', 'maintains', 'tripContinuity'],
  ['journey', 'maintains', 'travelContinuity'],
  ['incident', 'may_create', 'emergencyState'],
  ['disruption', 'updates', 'travelContinuity'],
  ['travelTelemetry', 'observes', 'journey'],
  ['mobilityEvent', 'updates', 'checkpoint']
];

const ecosystemCoverage = [
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

function getTravelOntology() {
  return {
    version: TRAVEL_ONTOLOGY_VERSION,
    domain: 'travel',
    runtimePack: 'CINTENT Travel Domain Runtime Pack',
    entities: travelEntities,
    relationships: ontologyRelationships.map(([from, relation, to]) => ({ from, relation, to })),
    ecosystemCoverage
  };
}

module.exports = {
  TRAVEL_ONTOLOGY_VERSION,
  travelEntities,
  ontologyRelationships,
  ecosystemCoverage,
  getTravelOntology
};
