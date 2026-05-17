const travelVocabulary = [
  'journey',
  'itinerary',
  'booking',
  'checkpoint',
  'airport transfer',
  'visa',
  'immigration',
  'flight',
  'hotel',
  'last mile',
  'disruption',
  'rerouting',
  'travel continuity',
  'traveler preference',
  'journey replay'
];

function contextualizeTravelAsk(prompt = '', context = {}) {
  const text = String(prompt).toLowerCase();
  const intent = /emergency|stranded|lost|medical|evacuation|unsafe/.test(text)
    ? 'emergency-travel-assistance'
    : /visa|passport|immigration|border/.test(text)
      ? 'visa-immigration-workflow'
      : /delay|cancel|disruption|reroute|missed/.test(text)
        ? 'travel-disruption-handling'
        : /airport|transfer|gate|terminal|last mile/.test(text)
          ? 'airport-transfer'
          : /multi-city|itinerary|optimize|schedule/.test(text)
            ? 'itinerary-optimization'
            : 'trip-planning';

  return {
    domain: 'travel',
    runtimePack: 'CINTENT Travel Domain Runtime Pack',
    intent,
    vocabulary: travelVocabulary,
    contextualFocus: [
      'itinerary reasoning',
      'traveler preference preservation',
      'trip continuity',
      'replay-aware assistance',
      'governed handling of passport, visa, location, emergency, and insurance data'
    ],
    memoryHints: {
      preferences: context.preferences || {},
      activeJourney: context.journeyId || context.journey_id || null,
      continuityState: context.continuityState || context.tripContinuity || 'unknown',
      replayRef: context.replayRef || null
    },
    responseGuidance: [
      'Ask for missing journey constraints before irreversible provider handoff.',
      'Use replay checkpoints when explaining why a route or itinerary changed.',
      'Mask sensitive passport, visa, and precise location fields in user-facing text.',
      'Escalate emergencies before optimizing cost or convenience.'
    ]
  };
}

module.exports = {
  travelVocabulary,
  contextualizeTravelAsk
};
