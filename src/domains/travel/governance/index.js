const travelGovernancePolicies = [
  {
    id: 'traveler-privacy',
    appliesTo: ['travelers', 'preferences', 'travelMemory'],
    rule: 'Minimize traveler profile exposure and return preference-derived recommendations without raw private profile leakage.',
    severity: 'high'
  },
  {
    id: 'passport-visa-sensitivity',
    appliesTo: ['visas', 'travelers'],
    rule: 'Passport, visa, nationality, and date-of-birth fields are sensitive and must be masked in assistance and replay views.',
    severity: 'critical'
  },
  {
    id: 'location-data-protection',
    appliesTo: ['checkpoints', 'transportation', 'tripContinuity'],
    rule: 'Location continuity may be used for active assistance but precise location must be scoped to the active journey and tenant.',
    severity: 'critical'
  },
  {
    id: 'emergency-escalation',
    appliesTo: ['incidents', 'advisories'],
    rule: 'Emergency events require escalation guidance, contact-safe summaries, and replay capture of decision checkpoints.',
    severity: 'critical'
  },
  {
    id: 'insurance-restrictions',
    appliesTo: ['bookings', 'incidents'],
    rule: 'Insurance guidance may classify policy context and required documents but must not guarantee claim approval.',
    severity: 'high'
  },
  {
    id: 'cross-border-data-compliance',
    appliesTo: ['visas', 'travelers', 'journeys'],
    rule: 'Cross-border workflows must preserve jurisdictional data boundaries for passport, visa, health, and location context.',
    severity: 'critical'
  }
];

function evaluateTravelGovernance(payload = {}) {
  const text = JSON.stringify(payload).toLowerCase();
  const triggered = travelGovernancePolicies.filter(policy => {
    if (policy.id === 'passport-visa-sensitivity') return /passport|visa|nationality|date_of_birth|dob/.test(text);
    if (policy.id === 'location-data-protection') return /location|checkpoint|pickup|dropoff|last_known_location|geo/.test(text);
    if (policy.id === 'emergency-escalation') return /emergency|incident|medical|security|evacuation|lost|stranded/.test(text);
    if (policy.id === 'insurance-restrictions') return /insurance|claim|policy|coverage/.test(text);
    if (policy.id === 'cross-border-data-compliance') return /cross-border|border|immigration|international|jurisdiction|passport|visa/.test(text);
    return /traveler|preference|memory|profile/.test(text);
  });

  const decision = triggered.some(policy => policy.severity === 'critical') ? 'needs_review' : 'allowed';
  return {
    decision,
    triggeredPolicies: triggered.map(policy => policy.id),
    restrictions: triggered.map(policy => policy.rule),
    redactionRequired: triggered.some(policy => ['passport-visa-sensitivity', 'location-data-protection'].includes(policy.id)),
    emergencyEscalation: triggered.some(policy => policy.id === 'emergency-escalation')
  };
}

module.exports = {
  travelGovernancePolicies,
  evaluateTravelGovernance
};
