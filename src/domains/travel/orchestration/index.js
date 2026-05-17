const { getTravelWorkflow, listTravelWorkflows } = require('../workflows');
const { evaluateTravelGovernance } = require('../governance');

function compileTravelOrchestration(workflowId, context = {}) {
  const workflow = getTravelWorkflow(workflowId);
  if (!workflow) {
    return {
      status: 'rejected',
      reason: `Unknown travel workflow: ${workflowId}`,
      availableWorkflows: listTravelWorkflows().map(item => item.id)
    };
  }

  const governance = evaluateTravelGovernance(context);
  const stages = workflow.stages.map((stage, index) => ({
    order: index + 1,
    stage,
    domain: 'travel',
    workflowId: workflow.id,
    checkpoint: `travel.${workflow.id}.${stage}`,
    replayable: true,
    governanceGate: governance.triggeredPolicies.length ? governance.triggeredPolicies : ['traveler-privacy']
  }));

  return {
    status: governance.decision === 'needs_review' ? 'needs_review' : 'compiled',
    runtimePack: 'CINTENT Travel Domain Runtime Pack',
    workflow: {
      id: workflow.id,
      title: workflow.title,
      coverage: workflow.coverage
    },
    stages,
    handoffContracts: [
      'canonical-orchestration-input',
      'travel-telemetry-context',
      'travel-governance-envelope',
      'journey-replay-seed'
    ],
    governance,
    replayPlan: {
      timelineSource: 'travel-checkpoints + telemetry + incidents',
      checkpointCount: stages.length,
      reconstructionModes: ['timeline', 'itinerary', 'disruption', 'continuity']
    }
  };
}

module.exports = {
  compileTravelOrchestration
};
