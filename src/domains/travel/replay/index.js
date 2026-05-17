function reconstructJourneyReplay({ journey = {}, itinerary = {}, telemetry = [], incidents = [] } = {}) {
  const itinerarySegments = Array.isArray(itinerary.segments) ? itinerary.segments : [];
  const timeline = [
    ...itinerarySegments.map((segment, index) => ({
      order: index + 1,
      type: 'itinerary_segment',
      id: segment.id || `segment-${index + 1}`,
      status: segment.status || 'planned',
      location: segment.location || segment.destination || null,
      timestamp: segment.expectedAt || segment.expected_at || null,
      payload: segment
    })),
    ...telemetry.map((event, index) => ({
      order: itinerarySegments.length + index + 1,
      type: 'telemetry',
      id: event.id || `telemetry-${index + 1}`,
      status: event.riskState || event.signal || 'observed',
      location: event.locationContinuity || event.location || null,
      timestamp: event.timestamp || null,
      payload: event
    })),
    ...incidents.map((incident, index) => ({
      order: itinerarySegments.length + telemetry.length + index + 1,
      type: 'incident',
      id: incident.id || incident.incident_id || `incident-${index + 1}`,
      status: incident.severity || 'incident',
      location: incident.location || null,
      timestamp: incident.detectedAt || incident.detected_at || null,
      payload: incident
    }))
  ].sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')) || a.order - b.order)
    .map((event, index) => ({ ...event, order: index + 1 }));

  return {
    replayType: 'travel-journey-replay',
    journeyId: journey.journeyId || journey.journey_id || itinerary.journeyId || itinerary.journey_id || 'journey-unknown',
    timeline,
    itineraryReplay: timeline.filter(event => event.type === 'itinerary_segment'),
    disruptionReplay: timeline.filter(event => event.type === 'incident' || /delay|delayed|missed|disruption|emergency|critical|recovered/.test(event.status)),
    continuityReconstruction: {
      lastKnownLocation: [...timeline].reverse().find(event => event.location)?.location || null,
      completedCheckpoints: timeline.filter(event => event.status === 'completed').map(event => event.id),
      recoveryRequired: timeline.some(event => /missed|critical|emergency|disruption/.test(event.status))
    }
  };
}

module.exports = {
  reconstructJourneyReplay
};
