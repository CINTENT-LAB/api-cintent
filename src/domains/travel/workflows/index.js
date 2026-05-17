const workflowCatalog = [
  {
    id: 'trip-planning',
    title: 'Trip planning',
    coverage: ['trip-planning', 'personalized-travel-assistance', 'tourism-intelligence'],
    stages: ['capture_traveler_intent', 'resolve_preferences', 'compose_itinerary', 'govern_sensitive_fields', 'prepare_replay_seed']
  },
  {
    id: 'trip-lifecycle',
    title: 'Trip lifecycle',
    coverage: ['trip-planning', 'travel-continuity-management', 'cognitive-travel-orchestration'],
    stages: ['initialize_journey', 'activate_itinerary', 'monitor_checkpoints', 'close_or_continue_journey']
  },
  {
    id: 'itinerary-planning',
    title: 'Itinerary planning',
    coverage: ['trip-planning', 'multi-city-journey-coordination', 'hotel-coordination'],
    stages: ['collect_constraints', 'compose_segments', 'align_bookings', 'validate_continuity']
  },
  {
    id: 'airport-transfer',
    title: 'Airport transfer',
    coverage: ['airport-coordination', 'last-mile-transportation', 'flight-coordination'],
    stages: ['sync_flight_status', 'confirm_arrival_checkpoint', 'assign_last_mile_option', 'monitor_mobility_transition']
  },
  {
    id: 'itinerary-optimization',
    title: 'Itinerary optimization',
    coverage: ['multi-city-journey-coordination', 'hotel-coordination', 'tourism-intelligence'],
    stages: ['load_itinerary_graph', 'score_constraints', 'rebalance_segments', 'preserve_trip_continuity']
  },
  {
    id: 'emergency-rerouting',
    title: 'Emergency rerouting',
    coverage: ['emergency-travel-assistance', 'traveler-risk-intelligence', 'real-time-travel-alerts'],
    stages: ['classify_incident', 'escalate_emergency_policy', 'generate_safe_route', 'notify_travel_party', 'capture_disruption_replay']
  },
  {
    id: 'travel-disruption-handling',
    title: 'Travel disruption handling',
    coverage: ['flight-coordination', 'hotel-coordination', 'travel-insurance-workflow', 'travel-telemetry-runtime'],
    stages: ['detect_disruption', 'estimate_impact', 'coordinate_provider_options', 'apply_insurance_rules', 'commit_recovery_plan']
  },
  {
    id: 'disruption-recovery',
    title: 'Disruption recovery',
    coverage: ['real-time-travel-alerts', 'traveler-risk-intelligence', 'travel-continuity-management'],
    stages: ['classify_disruption', 'preserve_traveler_state', 'select_recovery_path', 'confirm_continuity_checkpoint']
  },
  {
    id: 'travel-continuity-recovery',
    title: 'Travel continuity recovery',
    coverage: ['travel-telemetry-runtime', 'journey-replay', 'cognitive-travel-orchestration'],
    stages: ['recover_last_known_state', 'reconstruct_trip_continuity', 'resume_active_segment', 'append_replay_checkpoint']
  },
  {
    id: 'cross-border-coordination',
    title: 'Cross-border coordination',
    coverage: ['visa-immigration-workflow', 'business-travel', 'medical-travel', 'group-travel-coordination'],
    stages: ['validate_visa_context', 'protect_passport_fields', 'coordinate_border_checkpoints', 'prepare_contingency_guidance']
  },
  {
    id: 'traveler-assistance',
    title: 'Traveler assistance workflows',
    coverage: ['personalized-travel-assistance', 'group-travel-coordination', 'business-travel', 'medical-travel'],
    stages: ['load_preference_context', 'adapt_assistance_mode', 'coordinate_party_state', 'record_assistance_memory']
  },
  {
    id: 'incident-escalation',
    title: 'Incident escalation',
    coverage: ['emergency-travel-assistance', 'traveler-risk-intelligence', 'real-time-travel-alerts'],
    stages: ['open_incident', 'apply_emergency_governance', 'notify_escalation_contacts', 'capture_incident_replay']
  }
];

function listTravelWorkflows() {
  return workflowCatalog.map(workflow => ({ ...workflow, stages: [...workflow.stages], coverage: [...workflow.coverage] }));
}

function getTravelWorkflow(id) {
  return listTravelWorkflows().find(workflow => workflow.id === id) || null;
}

function coverageMatrix() {
  return workflowCatalog.reduce((matrix, workflow) => {
    workflow.coverage.forEach(area => {
      if (!matrix[area]) matrix[area] = [];
      matrix[area].push(workflow.id);
    });
    return matrix;
  }, {});
}

module.exports = {
  workflowCatalog,
  listTravelWorkflows,
  getTravelWorkflow,
  coverageMatrix
};
