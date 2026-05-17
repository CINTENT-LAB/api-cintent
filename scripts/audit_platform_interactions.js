const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'public', 'CINTENT-PLATFORM-PROD.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function extractBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert(startIndex >= 0, `missing marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert(endIndex > startIndex, `missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

function assertIncludes(source, marker, label = marker) {
  assert(source.includes(marker), `missing ${label}`);
}

const expectedModules = [
  'learn',
  'operating',
  'docs',
  'discovery',
  'playground',
  'studio',
  'environments',
  'billing',
  'observability',
  'issues',
  'ask',
  'workspace',
  'sdk',
  'admin',
  'readiness',
  'standards',
  'dependencies',
  'visualizer',
  'memory',
  'agents',
  'governance',
  'marketplace',
  'enterprise-os',
  'healthcare',
  'audit',
  'usecase'
];

const modulesBlock = extractBetween(html, 'const modules = [', '];');
const moduleIds = [...modulesBlock.matchAll(/id:\s*'([^']+)'/g)].map(match => match[1]);
assert.deepStrictEqual(moduleIds, expectedModules, 'module registry should match the complete app navigation contract');

for (const id of expectedModules) {
  assertIncludes(html, `id="view-${id}"`, `view container for ${id}`);
  assertIncludes(html, `if (state.module === '${id}')`, `renderCurrentView mapping for ${id}`);
}

const rendererChecks = [
  ['renderLearn', 'Learn CINTENT'],
  ['renderOperatingWorkspace', 'Operating Workspace'],
  ['renderDocs', 'API Documentation'],
  ['renderDiscovery', 'Discovery'],
  ['renderPlayground', 'Playground'],
  ['renderStudio', 'Orchestration Studio'],
  ['renderEnvironments', 'Simulations'],
  ['renderBilling', 'Billing'],
  ['renderObservability', 'Observability'],
  ['renderIssues', 'Issues'],
  ['renderAsk', 'Ask COGNI'],
  ['renderWorkspace', 'Workspace'],
  ['renderSdk', 'SDK Center'],
  ['renderAdmin', 'Admin'],
  ['renderReadiness', 'Readiness'],
  ['renderStandards', 'Standards'],
  ['renderDependencies', 'Dependencies'],
  ['renderVisualizer', 'Visualizer'],
  ['renderMemory', 'Memory'],
  ['renderAgents', 'Agents'],
  ['renderGovernance', 'Governance'],
  ['renderMarketplace', 'Marketplace'],
  ['renderEnterpriseOs', 'Enterprise OS'],
  ['renderHealthcare', 'Healthcare'],
  ['renderAudit', 'Audit'],
  ['renderUsecase', 'Use Case']
];

for (const [fn, label] of rendererChecks) {
  assertIncludes(html, `function ${fn}(`, `${label} renderer`);
}

const eventContracts = [
  ['[data-module]', "const moduleBtn = event.target.closest('[data-module]')"],
  ['[data-domain]', "const domainBtn = event.target.closest('[data-domain]')"],
  ['[data-stage]', "const stageBtn = event.target.closest('[data-stage]')"],
  ['[data-api]', "const apiBtn = event.target.closest('[data-api]')"],
  ['[data-add-cart]', "const addBtn = event.target.closest('[data-add-cart]')"],
  ['[data-remove-cart]', "const removeBtn = event.target.closest('[data-remove-cart]')"],
  ['[data-open-cart]', "const openCartBtn = event.target.closest('[data-open-cart]')"],
  ['[data-play-api]', "const playBtn = event.target.closest('[data-play-api]')"],
  ['[data-plan]', "const planBtn = event.target.closest('[data-plan]')"],
  ['[data-simulation]', "const simulationBtn = event.target.closest('[data-simulation]')"],
  ['[data-discovery]', "const discoveryBtn = event.target.closest('[data-discovery]')"],
  ['[data-ask-domain]', "const askDomainBtn = event.target.closest('[data-ask-domain]')"],
  ['[data-cogni-action]', "const cogniActionBtn = event.target.closest('[data-cogni-action]')"],
  ['[data-ask-stage]', "const askStageBtn = event.target.closest('[data-ask-stage]')"],
  ['[data-ask-prompt]', "const askPromptBtn = event.target.closest('[data-ask-prompt]')"],
  ['[data-context-action]', "const contextActionBtn = event.target.closest('[data-context-action]')"],
  ['[data-ask-action]', "const askActionBtn = event.target.closest('[data-ask-action]')"],
  ['[data-ask-quick]', "const enterpriseQuickBtn = event.target.closest('[data-ask-quick]')"],
  ['[data-learning-query]', "const learningQueryBtn = event.target.closest('[data-learning-query]')"],
  ['[data-learning-section]', "const learningSectionBtn = event.target.closest('[data-learning-section]')"],
  ['[data-context-learn]', "const contextualLearn = event.target.closest('[data-context-learn]')"],
  ['[data-app-action]', "const appAction = event.target.closest('[data-app-action]')"],
  ['[data-app-card]', "const appCard = event.target.closest('[data-app-card]')"],
  ['[data-studio-add-node]', "const studioAdd = event.target.closest('[data-studio-add-node]')"],
  ['[data-memory-query]', "const memoryQueryBtn = event.target.closest('[data-memory-query]')"],
  ['[data-marketplace-package]', "const marketplacePackageBtn = event.target.closest('[data-marketplace-package]')"],
  ['[data-footer-action]', "const footerAction = event.target.closest('[data-footer-action]')"],
  ['[data-license-action]', "const licenseBtn = event.target.closest('[data-license-action]')"],
  ['[data-workspace-lifecycle]', "const lifecycleBtn = event.target.closest('[data-workspace-lifecycle]')"],
  ['[data-workspace-resume]', "const resumeBtn = event.target.closest('[data-workspace-resume]')"],
  ['[data-standards-query]', "const standardsQueryBtn = event.target.closest('[data-standards-query]')"]
];

for (const [selector, handlerMarker] of eventContracts) {
  assertIncludes(html, selector, `${selector} markup`);
  assertIncludes(html, handlerMarker, `${selector} handler`);
}

const clickIdContracts = [
  'runPlayground',
  'runSimulation',
  'askBtn',
  'generateApiKey',
  'runSdkIntelligence',
  'compileStudioWorkflow',
  'executeStudioWorkflow',
  'exportStudioWorkflow',
  'standardsSearchBtn',
  'generateIssue',
  'invoiceBtn',
  'enterpriseInquiryBtn',
  'subscribeBtn',
  'runMemorySearch',
  'runAgentCoordination',
  'runGovernanceEvaluation',
  'runMarketplaceSearch',
  'compileMarketplacePackage',
  'runEnterpriseCommand',
  'runHealthcareWorkflow',
  'runHealthcareImplRuntime',
  'loadHealthcareImplDashboard',
  'runHealthcareHardening',
  'validateHealthcareHardening',
  'loadHealthcareHardeningDashboard',
  'runHealthcareApiDevelopment',
  'validateHealthcareApis',
  'runAdvancedHealthcare',
  'runHealthcareIntegration',
  'runHealthcareCommercial',
  'runHealthcareGlobal',
  'runHealthcareCompliance',
  'runClinicalData'
];

for (const id of clickIdContracts) {
  assertIncludes(html, `id="${id}"`, `${id} markup`);
  assertIncludes(html, `event.target.id === '${id}'`, `${id} click handler`);
}

const changeIdContracts = [
  'playApi',
  'playMode',
  'playEcosystem',
  'playUavStandard',
  'playUavEcosystem',
  'playProtocolMode',
  'sdkDomain',
  'sdkDeploymentMode',
  'sdkEcosystem',
  'sdkStandard',
  'studioWorkflowTitle',
  'studioDescription',
  'memorySearchInput',
  'marketplaceSearch',
  'marketplacePackage',
  'askDomain',
  'askApplicationId',
  'askMode',
  'askEnvironment',
  'askSelectedSimulation',
  'askSelectedWorkflow'
];

for (const id of changeIdContracts) {
  assertIncludes(html, `id="${id}"`, `${id} markup`);
  assertIncludes(html, `event.target.id === '${id}'`, `${id} change handler`);
}

[
  'Start Fresh Workspace',
  'Resume Previous Workspace',
  'Open Sandbox Example',
  'Load Template',
  'Run simulated execution',
  'Launch simulation',
  'Ask COGNI Workspace',
  'Generate API key',
  'Compile Workflow',
  'Search Packages',
  'Run Enterprise Command',
  'Run Healthcare Workflow',
  'Export Replay JSON',
  'Submit Use Case',
  'Workspace Initialization'
].forEach(label => assertIncludes(html, label));

const report = {
  status: 'pass',
  suite: 'platform-interaction-audit',
  modules: expectedModules.length,
  renderers: rendererChecks.length,
  selectorContracts: eventContracts.length,
  clickIdContracts: clickIdContracts.length,
  changeIdContracts: changeIdContracts.length,
  file: htmlPath
};

console.log(JSON.stringify(report, null, 2));
