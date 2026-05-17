const { getTravelOntology, ecosystemCoverage } = require('./ontology');
const { listTravelWorkflows, getTravelWorkflow, coverageMatrix } = require('./workflows');
const { compileTravelOrchestration } = require('./orchestration');
const { travelTelemetrySignals, normalizeTravelTelemetry, evaluateTravelRisk } = require('./telemetry');
const { travelGovernancePolicies, evaluateTravelGovernance } = require('./governance');
const { reconstructJourneyReplay } = require('./replay');
const { travelVocabulary, contextualizeTravelAsk } = require('./ask-cogni');
const { travelApiContracts, travelApiHandlers } = require('./apis');
const { travelTemplates } = require('./templates');

function createTravelRuntimePack() {
  return {
    domain: 'travel',
    runtimePack: 'CINTENT Travel Domain Runtime Pack',
    version: 'phase-6.domain.travel.v1',
    status: 'domain-runtime-ready',
    coverage: ecosystemCoverage,
    ontology: getTravelOntology(),
    workflows: listTravelWorkflows(),
    workflowCoverage: coverageMatrix(),
    telemetrySignals: travelTelemetrySignals,
    governancePolicies: travelGovernancePolicies,
    askCogni: {
      vocabulary: travelVocabulary,
      contextualizer: 'contextualizeTravelAsk'
    },
    apiContracts: travelApiContracts,
    templates: travelTemplates
  };
}

module.exports = {
  createTravelRuntimePack,
  getTravelOntology,
  listTravelWorkflows,
  getTravelWorkflow,
  coverageMatrix,
  compileTravelOrchestration,
  travelTelemetrySignals,
  normalizeTravelTelemetry,
  evaluateTravelRisk,
  travelGovernancePolicies,
  evaluateTravelGovernance,
  reconstructJourneyReplay,
  travelVocabulary,
  contextualizeTravelAsk,
  travelApiContracts,
  travelApiHandlers,
  travelTemplates
};
