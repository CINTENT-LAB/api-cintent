const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const baseUrl = (process.argv[2] || process.env.CINTENT_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const evidenceDir = path.join(root, 'audit-evidence', 'complete-app-coverage');
fs.mkdirSync(evidenceDir, { recursive: true });

let cookie = '';

function parseBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(route, options = {}) {
  const headers = { accept: 'application/json', ...(options.headers || {}) };
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${baseUrl}${route}`, { ...options, headers });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await response.text();
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: parseBody(text),
    text
  };
}

function save(name, payload) {
  fs.writeFileSync(path.join(evidenceDir, name), JSON.stringify(payload, null, 2));
}

function expectStatus(response, expected, label) {
  assert.equal(response.status, expected, `${label} should return ${expected}`);
  return response;
}

(async () => {
  const html = fs.readFileSync(path.join(root, 'public', 'CINTENT-PLATFORM-PROD.html'), 'utf8');
  assert.ok(html.includes('const modules = ['), 'platform shell should include module registry');
  assert.ok(html.includes('renderCurrentView()'), 'platform shell should include current view dispatcher');

  const email = `qa+${Date.now()}@cintent.local`;
  const password = 'Codex!23456';

  const health = expectStatus(await request('/api/health'), 200, 'health');
  const signup = expectStatus(await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Codex QA Complete App' })
  }), 200, 'signup');
  const verify = expectStatus(await request(signup.body.nextStep), 200, 'verify email');
  const login = expectStatus(await request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  }), 200, 'login');
  const sessionBeforeLicense = expectStatus(await request('/api/auth/session'), 200, 'session before license');
  const platformPage = expectStatus(await request('/platform'), 200, 'platform before license');
  const protectedApiBeforeLicense = expectStatus(await request('/api/studio/nodes'), 451, 'protected api before license');
  assert.equal(protectedApiBeforeLicense.body.error, 'Enterprise license acceptance required', 'protected api should report license gating before acceptance');

  expectStatus(await request('/api/license/view', { method: 'POST' }), 200, 'license view');
  expectStatus(await request('/api/license/accept', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'acknowledgedReview=true'
  }), 200, 'license accept');

  const platformAfterLicense = expectStatus(await request('/platform'), 200, 'platform after license');
  const billingPlans = expectStatus(await request('/api/billing/plans'), 200, 'billing plans');
  const activateProfessional = expectStatus(await request('/api/billing/activate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ plan: 'professional', provider: 'sandbox' })
  }), 200, 'activate professional');
  const subscription = expectStatus(await request('/api/billing/subscription'), 200, 'billing subscription');
  const sessionAfterActivation = expectStatus(await request('/api/auth/session'), 200, 'session after activation');
  assert.equal(sessionAfterActivation.body.user.subscription.tier, 'professional', 'professional tier should be active for complete app sweep');

  const runtimeStatus = expectStatus(await request('/api/platform/runtime/status'), 200, 'platform runtime status');
  const enterpriseStatus = expectStatus(await request('/api/enterprise-ux/status?domain=drone&application=CHAXU'), 200, 'operating workspace status');
  const runtimeEvidence = expectStatus(await request('/api/runtime/integration/evidence'), 200, 'runtime evidence');
  const readiness = expectStatus(await request('/api/ready'), 200, 'readiness');
  const status = expectStatus(await request('/api/status'), 200, 'status');
  const metrics = expectStatus(await request('/api/metrics'), 200, 'metrics');
  const dashboardMetrics = expectStatus(await request('/api/dashboard/metrics'), 200, 'dashboard metrics');
  const traces = expectStatus(await request('/api/traces'), 200, 'trace list');

  const domains = expectStatus(await request('/api/domains'), 200, 'domains');
  const firstDomain = (domains.body.domains || [])[0];
  const domainDetail = expectStatus(await request(`/api/domains/${encodeURIComponent(firstDomain.domain_key)}`), 200, 'domain detail');
  const catalog = expectStatus(await request('/api/catalog'), 200, 'catalog');
  const search = expectStatus(await request('/api/search?q=drone%20fleet%20edge%20governance'), 200, 'semantic search');
  const applications = expectStatus(await request('/api/applications'), 200, 'applications');
  const learningCenter = expectStatus(await request('/api/learning/center?q=replay%20governance'), 200, 'learning center');

  const api = catalog.body.apis[0];
  const apiIdentifier = api && (api.id || api.api_key);
  assert.ok(api && api.api_key && apiIdentifier, 'catalog should provide at least one API entry with a stable identifier');
  const apiDetail = expectStatus(await request(`/api/api/${encodeURIComponent(apiIdentifier)}`), 200, 'api detail');

  const workspaceId = `complete-app-${Date.now()}`;
  const workspacePayload = {
    workspace_id: workspaceId,
    domain: 'drone',
    application_id: 'chaxu',
    selected_apis: [api.api_key],
    selected_workflow: 'drone swarm emergency coordination',
    selected_simulation: '',
    state: {
      context: {
        domain: 'drone',
        applicationId: 'chaxu',
        applicationName: 'CHAXU',
        selectedApis: [api.api_key],
        selectedApiNames: [api.name],
        selectedWorkflow: 'drone swarm emergency coordination',
        environment: 'sandbox',
        mode: 'engineering'
      },
      runtime_environment: 'sandbox',
      user_mode: 'engineering'
    }
  };

  const workspaceListBefore = expectStatus(await request('/api/workspaces/state'), 200, 'workspace list before');
  const workspacePersist = expectStatus(await request('/api/workspaces/state', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(workspacePayload)
  }), 200, 'workspace persist');
  const workspaceState = expectStatus(await request(`/api/workspace/state?workspaceId=${encodeURIComponent(workspaceId)}`), 200, 'workspace state');
  const workspaceRestore = expectStatus(await request(`/api/workspace/restore?workspaceId=${encodeURIComponent(workspaceId)}`), 200, 'workspace restore');

  const askContext = {
    workspaceId,
    domain: 'drone',
    applicationId: 'chaxu',
    applicationName: 'CHAXU',
    selectedApis: [api.api_key],
    selectedApiNames: [api.name],
    selectedWorkflow: 'drone swarm emergency coordination',
    selectedSimulation: '',
    mode: 'engineering',
    environment: 'sandbox'
  };

  const askContextSync = expectStatus(await request('/api/ask/context/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ context: askContext, eventType: 'context.sync', query: 'plan drone fleet orchestration' })
  }), 200, 'ask context sync');
  const ask = expectStatus(await request('/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'Plan a drone fleet orchestration with replay and governance', context: askContext })
  }), 200, 'ask cogni');
  const askQuickActionWorkflow = expectStatus(await request('/api/ask/quick-action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'create-workflow', context: askContext })
  }), 200, 'ask quick action workflow');
  const askQuickActionSdk = expectStatus(await request('/api/ask/quick-action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'generate-sdk', context: askContext })
  }), 200, 'ask quick action sdk');
  const askQuickActionReplay = expectStatus(await request('/api/ask/quick-action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'open-replay', context: askContext })
  }), 200, 'ask quick action replay');
  const askMemory = expectStatus(await request(`/api/ask/memory?workspaceId=${encodeURIComponent(workspaceId)}&q=drone`), 200, 'ask memory');

  const sdkIntelligence = expectStatus(await request('/api/sdk/intelligence', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      apiKeys: [api.api_key],
      domain: 'drone',
      problem: 'Coordinate drone fleet replay and governance',
      deploymentMode: 'edge'
    })
  }), 200, 'sdk intelligence');
  const sdkSnippet = expectStatus(await request('/api/sdk/snippet', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ language: 'curl', method: 'GET', path: '/api/catalog' })
  }), 200, 'sdk snippet');
  const sdkGenerate = expectStatus(await request('/api/sdk/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: api.api_key,
      language: 'python',
      context: {
        apiKeys: [api.api_key],
        domain: 'drone',
        problem: 'Coordinate drone fleet replay and governance',
        deploymentMode: 'edge'
      }
    })
  }), 200, 'sdk generate');

  const studioNodes = expectStatus(await request('/api/studio/nodes'), 200, 'studio nodes');
  const selectedNodes = studioNodes.body.nodes.slice(0, 3);
  const compiledWorkflow = expectStatus(await request('/api/studio/compile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Complete App Coverage Workflow',
      description: 'End-to-end orchestration coverage workflow',
      nodes: selectedNodes,
      edges: [
        { from: selectedNodes[0].id, to: selectedNodes[1].id, label: 'governance-aware-flow' },
        { from: selectedNodes[1].id, to: selectedNodes[2].id, label: 'replay-aware-flow' }
      ],
      apiKeys: [api.api_key],
      domain: 'drone',
      ecosystem: 'px4',
      standard: 'mavlink',
      deploymentMode: 'edge'
    })
  }), 200, 'studio compile');
  const studioExecute = expectStatus(await request('/api/studio/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ compiledWorkflow: compiledWorkflow.body, mode: 'sandbox' })
  }), 200, 'studio execute');
  const studioExport = expectStatus(await request(`/api/studio/workflows/${encodeURIComponent(compiledWorkflow.body.workflowId)}/export`), 200, 'studio export');

  const playgroundExecute = expectStatus(await request('/api/playground/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: api.api_key,
      mode: 'sandbox',
      input: {
        workflow: 'drone swarm emergency coordination',
        replayRequested: true,
        roboticsEcosystem: 'px4',
        uavStandard: 'mavlink',
        uavEcosystem: 'mavsdk',
        protocolMode: 'edge-swarm'
      },
      governanceContext: {
        policy: 'enterprise-default',
        roboticsEcosystem: 'px4',
        uavStandard: 'mavlink',
        uavEcosystem: 'mavsdk',
        protocolMode: 'edge-swarm'
      }
    })
  }), 200, 'playground execute');
  const playgroundStatus = expectStatus(await request(`/api/executions/${encodeURIComponent(playgroundExecute.body.executionId)}/status`), 200, 'playground execution status');

  const simulations = expectStatus(await request('/api/simulations/catalog'), 200, 'simulation catalog');
  const simulation = simulations.body.simulations.find(item => item.launchable) || simulations.body.simulations[0];
  const simulationExecute = expectStatus(await request('/api/simulations/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      simulationId: simulation.id,
      mode: 'sandbox',
      input: {
        requestedFrom: 'complete-app-coverage',
        roboticsEcosystem: 'px4',
        uavStandard: 'mavlink',
        uavEcosystem: 'mavsdk',
        protocolMode: 'edge-swarm',
        replay: true,
        governance: true,
        application: 'chaxu'
      }
    })
  }), 200, 'simulation execute');

  const orchestration = expectStatus(await request('/api/orchestration/fabric/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      workflow: { title: 'Complete App Fabric Run', apiKeys: [api.api_key], domain: 'drone' },
      mode: 'sandbox',
      input: { domain: 'drone', workflow: 'Complete App Fabric Run', simulationId: simulation.id }
    })
  }), 200, 'orchestration fabric execute');
  const orchestrationId = orchestration.body.run.orchestrationId;
  const replayId = orchestration.body.run.replay.replayId;
  const orchestrationGet = expectStatus(await request(`/api/orchestration/fabric/${encodeURIComponent(orchestrationId)}`), 200, 'orchestration fabric get');
  const orchestrationRecover = expectStatus(await request(`/api/orchestration/fabric/${encodeURIComponent(orchestrationId)}/recover`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'retry' })
  }), 200, 'orchestration recovery');
  const replayReconstruct = expectStatus(await request(`/api/replay/reconstruct/${encodeURIComponent(replayId)}`), 200, 'replay reconstruct');
  const replayExport = expectStatus(await request(`/api/replay/export/${encodeURIComponent(replayId)}`), 200, 'replay export');
  const visualizerData = expectStatus(await request('/api/visualizer/data'), 200, 'visualizer data');

  const keysBefore = expectStatus(await request('/api/keys'), 200, 'keys before');
  const keyGenerate = expectStatus(await request('/api/keys', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ label: 'Complete App QA Key' })
  }), 200, 'generate api key');
  const keysAfter = expectStatus(await request('/api/keys'), 200, 'keys after');

  const invoicePreview = expectStatus(await request('/api/billing/invoice-preview', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ plan: 'professional', apiIds: [api.id], quoteType: 'complete-app-coverage' })
  }), 200, 'invoice preview');
  const invoiceOpen = expectStatus(await request(`/api/billing/invoices/${encodeURIComponent(invoicePreview.body.invoice.id)}`), 200, 'invoice open');
  const enterpriseInquiry = expectStatus(await request('/api/billing/enterprise-inquiry', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      requestType: 'enterprise-commercial-request',
      domains: ['drone', 'travel'],
      requirements: 'Complete app onboarding and governance validation',
      sla: 'Enterprise SLA requested',
      compliance: 'Replay and governance',
      budgetRange: 'Enterprise review',
      timeline: '30-60 days'
    })
  }), 200, 'enterprise inquiry');

  const standards = expectStatus(await request('/api/standards/compliance'), 200, 'standards compliance');
  const standardsExplorer = expectStatus(await request('/api/standards/explorer?q=MAVLink'), 200, 'standards explorer');
  const dependencies = expectStatus(await request('/api/dependencies'), 200, 'dependencies');
  const metadataValidation = expectStatus(await request('/api/metadata/validation'), 200, 'metadata validation');
  const canonicalValidation = expectStatus(await request('/api/canonical/validation'), 200, 'canonical validation');

  const issuesReport = expectStatus(await request('/api/issues/report', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      severity: 'medium',
      executionId: orchestration.body.run.executionId || orchestration.body.run.orchestrationId,
      summary: 'Complete app coverage issue package smoke test'
    })
  }), 200, 'issues report');

  const memorySummary = expectStatus(await request('/api/memory/summary'), 200, 'memory summary');
  const memoryTimeline = expectStatus(await request('/api/memory/timeline'), 200, 'memory timeline');
  const memorySearch = expectStatus(await request('/api/memory/search?q=replay'), 200, 'memory search');
  let memoryReconstruct = null;
  const memoryResult = (memorySearch.body.results || [])[0];
  if (memoryResult && memoryResult.id) {
    memoryReconstruct = expectStatus(await request(`/api/memory/reconstruct/${encodeURIComponent(memoryResult.id)}`), 200, 'memory reconstruct');
  }

  const agentsRegistry = expectStatus(await request('/api/agents/registry'), 200, 'agents registry');
  const agentsCoordinate = expectStatus(await request('/api/agents/coordinate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ objective: 'Coordinate drone fleet response and replay lineage', domain: 'drone', mode: 'sandbox' })
  }), 200, 'agents coordinate');
  const agentsReplay = expectStatus(await request(`/api/agents/replay/${encodeURIComponent(agentsCoordinate.body.execution.id)}`), 200, 'agents replay');
  const agentsMetrics = expectStatus(await request('/api/agents/metrics'), 200, 'agents metrics');

  const governancePolicies = expectStatus(await request('/api/governance/policies'), 200, 'governance policies');
  const governanceEvaluate = expectStatus(await request('/api/governance/evaluate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ objective: 'Validate drone replay governance', domain: 'drone', operation: 'flight coordination', context: { replay: true, edge: true } })
  }), 200, 'governance evaluate');
  const governanceReplay = expectStatus(await request(`/api/governance/replay/${encodeURIComponent(governanceEvaluate.body.execution.id)}`), 200, 'governance replay');
  const governanceMetrics = expectStatus(await request('/api/governance/metrics'), 200, 'governance metrics');

  const marketplacePackages = expectStatus(await request('/api/marketplace/packages?q=drone'), 200, 'marketplace packages');
  const marketplacePackage = marketplacePackages.body.packages[0];
  const marketplacePackageDetail = expectStatus(await request(`/api/marketplace/packages/${encodeURIComponent(marketplacePackage.id)}`), 200, 'marketplace package detail');
  const marketplaceApis = expectStatus(await request('/api/marketplace/apis'), 200, 'marketplace apis');
  const marketplaceCompile = expectStatus(await request('/api/marketplace/compile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ packageId: marketplacePackage.id, query: 'drone edge', mode: 'sandbox' })
  }), 200, 'marketplace compile');
  const marketplaceReplay = expectStatus(await request(`/api/marketplace/replay/${encodeURIComponent(marketplaceCompile.body.execution.id)}`), 200, 'marketplace replay');
  const marketplaceMetrics = expectStatus(await request('/api/marketplace/metrics'), 200, 'marketplace metrics');

  const enterpriseOsSummary = expectStatus(await request('/api/enterprise-os/summary'), 200, 'enterprise os summary');
  const enterpriseDomain = (enterpriseOsSummary.body.operational_domains || [])[0];
  const enterpriseCommand = expectStatus(await request('/api/enterprise-os/command', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      objective: 'Show enterprise operational risks and executive summary',
      domain: enterpriseDomain && enterpriseDomain.id ? enterpriseDomain.id : 'drone',
      mode: 'sandbox'
    })
  }), 200, 'enterprise os command');
  const enterpriseReplay = expectStatus(await request(`/api/enterprise-os/replay/${encodeURIComponent(enterpriseCommand.body.execution.id)}`), 200, 'enterprise os replay');
  const enterpriseMetrics = expectStatus(await request('/api/enterprise-os/metrics'), 200, 'enterprise os metrics');

  const healthcareSummary = expectStatus(await request('/api/healthcare/summary'), 200, 'healthcare summary');
  const healthcareMetrics = expectStatus(await request('/api/healthcare/metrics'), 200, 'healthcare metrics');
  const healthcareSchema = expectStatus(await request('/api/healthcare/api-development/schema'), 200, 'healthcare api schema');
  const healthcareApis = expectStatus(await request('/api/healthcare/api-development/apis'), 200, 'healthcare api inventory');
  const healthcareValidateApis = expectStatus(await request('/api/healthcare/api-development/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'sandbox', suites: ['functional', 'compliance', 'performance'] })
  }), 200, 'healthcare api validation');
  const healthcareWorkflow = expectStatus(await request('/api/healthcare/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ objective: 'Coordinate ICU telemetry and care escalation', workflow: 'clinical care coordination', branch: 'provider', mode: 'sandbox' })
  }), 200, 'healthcare workflow');
  const healthcareReplay = expectStatus(await request(`/api/healthcare/replay/${encodeURIComponent(healthcareWorkflow.body.execution.id)}`), 200, 'healthcare replay');
  const healthcareApi = (healthcareApis.body.apis || healthcareApis.body.metadata_apis || [])[0];
  let healthcareApiDevelopmentExecute = null;
  let healthcareApiDevelopmentReplay = null;
  if (healthcareApi && (healthcareApi.api_key || healthcareApi.id)) {
    healthcareApiDevelopmentExecute = expectStatus(await request('/api/healthcare/api-development/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_key: healthcareApi.api_key || healthcareApi.id,
        mode: 'sandbox',
        input: { replayRequested: true, governanceValidation: true, sdkGeneration: true }
      })
    }), 200, 'healthcare api development execute');
    healthcareApiDevelopmentReplay = expectStatus(await request(`/api/healthcare/api-development/replay/${encodeURIComponent(healthcareApiDevelopmentExecute.body.execution.id)}`), 200, 'healthcare api development replay');
  }
  const healthcareGroups = expectStatus(await request('/api/v1/healthcare/runtime/groups'), 200, 'healthcare runtime groups');
  const healthcareGroup = (healthcareGroups.body.runtimeGroups || healthcareGroups.body.groups || [])[0];
  const healthcareAction = healthcareGroup && healthcareGroup.actions ? healthcareGroup.actions[0] : 'create-patient';
  const healthcareRuntimeExecute = expectStatus(await request('/api/v1/healthcare/runtime/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      group: healthcareGroup && healthcareGroup.id ? healthcareGroup.id : 'patient-clinical',
      action: healthcareAction.id || healthcareAction,
      mode: 'sandbox',
      patient: { name: 'CINTENT Runtime Patient', clinicalContext: 'complete app coverage' },
      objective: 'Execute healthcare API through orchestration, governance, replay, telemetry, and semantic memory runtime.'
    })
  }), 200, 'healthcare runtime execute');
  const healthcareRuntimeReplay = expectStatus(await request(`/api/v1/healthcare/runtime/replay/${encodeURIComponent(healthcareRuntimeExecute.body.execution.id)}`), 200, 'healthcare runtime replay');
  const healthcareDashboard = expectStatus(await request('/api/v1/healthcare/dashboard'), 200, 'healthcare dashboard');
  const healthcareHardeningExecute = expectStatus(await request('/api/v1/healthcare/hardening/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      scenario: 'icu-telemetry-latency',
      mode: 'sandbox',
      objective: 'Validate enterprise healthcare production hardening and failover recovery.'
    })
  }), 200, 'healthcare hardening execute');
  const healthcareHardeningReplay = expectStatus(await request(`/api/v1/healthcare/hardening/replay/${encodeURIComponent(healthcareHardeningExecute.body.execution.id)}`), 200, 'healthcare hardening replay');
  const healthcareHardeningValidate = expectStatus(await request('/api/v1/healthcare/hardening/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scenario: 'icu-telemetry-latency' })
  }), 200, 'healthcare hardening validate');
  const healthcareHardeningDashboard = expectStatus(await request('/api/v1/healthcare/hardening/dashboard'), 200, 'healthcare hardening dashboard');
  const healthcareHardeningCertification = expectStatus(await request('/api/v1/healthcare/hardening/production-certification'), 200, 'healthcare hardening certification');
  const healthcareAdvanced = expectStatus(await request('/api/healthcare/advanced/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ objective: 'Coordinate surgical robotics and diagnostics', workflow: 'advanced healthcare coordination', mode: 'sandbox' })
  }), 200, 'healthcare advanced');
  const healthcareAdvancedReplay = expectStatus(await request(`/api/healthcare/advanced/replay/${encodeURIComponent(healthcareAdvanced.body.execution.id)}`), 200, 'healthcare advanced replay');
  const healthcareIntegration = expectStatus(await request('/api/healthcare/integration/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ objective: 'Coordinate FHIR and DICOM federation', workflow: 'healthcare interoperability', mode: 'sandbox' })
  }), 200, 'healthcare integration');
  const healthcareIntegrationReplay = expectStatus(await request(`/api/healthcare/integration/replay/${encodeURIComponent(healthcareIntegration.body.execution.id)}`), 200, 'healthcare integration replay');
  const healthcareCommercial = expectStatus(await request('/api/healthcare/commercial/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ objective: 'Coordinate pharma procurement and insurance signals', workflow: 'healthcare commercial flow', mode: 'sandbox' })
  }), 200, 'healthcare commercial');
  const healthcareCommercialReplay = expectStatus(await request(`/api/healthcare/commercial/replay/${encodeURIComponent(healthcareCommercial.body.execution.id)}`), 200, 'healthcare commercial replay');
  const healthcareGlobal = expectStatus(await request('/api/healthcare/global/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ objective: 'Coordinate public health and resilience response', workflow: 'global healthcare resilience', mode: 'sandbox' })
  }), 200, 'healthcare global');
  const healthcareGlobalReplay = expectStatus(await request(`/api/healthcare/global/replay/${encodeURIComponent(healthcareGlobal.body.execution.id)}`), 200, 'healthcare global replay');
  const healthcareCompliance = expectStatus(await request('/api/healthcare/compliance/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ objective: 'Validate HIPAA and AI governance', workflow: 'healthcare compliance audit', mode: 'sandbox' })
  }), 200, 'healthcare compliance');
  const healthcareComplianceReplay = expectStatus(await request(`/api/healthcare/compliance/replay/${encodeURIComponent(healthcareCompliance.body.execution.id)}`), 200, 'healthcare compliance replay');
  const clinicalData = expectStatus(await request('/api/healthcare/clinical-data/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ objective: 'Coordinate patient consultation and prescriptions', workflow: 'clinical data workflow', mode: 'sandbox' })
  }), 200, 'clinical data');
  const clinicalDataReplay = expectStatus(await request(`/api/healthcare/clinical-data/replay/${encodeURIComponent(clinicalData.body.execution.id)}`), 200, 'clinical data replay');

  const observabilityForensics = expectStatus(await request('/api/observability/forensics'), 200, 'observability forensics');
  const persistenceStatus = expectStatus(await request('/api/persistence/status'), 200, 'persistence status');

  const auditLogs = expectStatus(await request('/api/audit/logs'), 200, 'audit logs');
  const auditExport = expectStatus(await request('/api/audit/export?type=governance&format=json'), 200, 'audit export');
  const useCase = expectStatus(await request('/api/use-cases', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      companyName: 'Cognivanta Labs QA',
      contactPerson: 'Codex QA',
      email,
      phone: '+91-0000000000',
      industry: 'Aerospace',
      domain: 'drone',
      problemStatement: 'Validate end-to-end cognitive orchestration, replay, and governance coverage.',
      expectedApis: api.api_key,
      expectedIntegration: 'Platform-wide validation',
      timelineExpectation: 'Immediate',
      budgetRange: 'Internal QA'
    })
  }), 200, 'use case request');

  const adminRestricted = expectStatus(await request('/admin'), 403, 'admin route for non-admin');
  const workspaceReset = expectStatus(await request('/api/workspace/reset', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason: 'complete-app-coverage-reset' })
  }), 200, 'workspace reset');
  const workspaceListAfterReset = expectStatus(await request('/api/workspaces/state'), 200, 'workspace list after reset');

  const summary = {
    status: 'passed',
    baseUrl,
    evidenceDir,
    user: email,
    modulesCovered: [
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
    ],
    artifacts: {
      professionalTier: sessionAfterActivation.body.user.subscription.tier,
      platformHtml: platformAfterLicense.status,
      catalogCount: catalog.body.apis.length,
      searchCount: search.body.results.length,
      learningSections: learningCenter.body.sections.length,
      simulations: simulations.body.simulations.length,
      marketplacePackages: marketplacePackages.body.packages.length,
      auditEvents: (auditLogs.body.events || []).length,
      apiKeys: (keysAfter.body.keys || []).length
    }
  };

  save('summary.json', summary);
  save('auth.json', { health: health.body, signup: signup.body, verify: verify.body, login: login.body, sessionBeforeLicense: sessionBeforeLicense.body, sessionAfterActivation: sessionAfterActivation.body });
  save('core-runtime.json', { runtimeStatus: runtimeStatus.body, enterpriseStatus: enterpriseStatus.body, runtimeEvidence: runtimeEvidence.body, readiness: readiness.body, status: status.body });
  save('discovery.json', { domains: domains.body, domainDetail: domainDetail.body, catalogCount: catalog.body.apis.length, search: search.body, applications: applications.body, apiDetail: apiDetail.body, learningCenter: learningCenter.body });
  save('workspace-ask.json', { workspaceListBefore: workspaceListBefore.body, workspacePersist: workspacePersist.body, workspaceState: workspaceState.body, workspaceRestore: workspaceRestore.body, askContextSync: askContextSync.body, ask: ask.body, askQuickActionWorkflow: askQuickActionWorkflow.body, askQuickActionSdk: askQuickActionSdk.body, askQuickActionReplay: askQuickActionReplay.body, askMemory: askMemory.body });
  save('playground-studio-simulation.json', { sdkIntelligence: sdkIntelligence.body, sdkSnippet: sdkSnippet.body, sdkGenerate: sdkGenerate.body, studioNodes: studioNodes.body, compiledWorkflow: compiledWorkflow.body, studioExecute: studioExecute.body, studioExport: studioExport.body, playgroundExecute: playgroundExecute.body, playgroundStatus: playgroundStatus.body, simulations: simulations.body, simulationExecute: simulationExecute.body });
  save('orchestration-visualizer-memory.json', { orchestration: orchestration.body, orchestrationGet: orchestrationGet.body, orchestrationRecover: orchestrationRecover.body, replayReconstruct: replayReconstruct.body, replayExport: replayExport.body, visualizerData: visualizerData.body, memorySummary: memorySummary.body, memoryTimeline: memoryTimeline.body, memorySearch: memorySearch.body, memoryReconstruct: memoryReconstruct && memoryReconstruct.body });
  save('advanced-modules.json', { agentsRegistry: agentsRegistry.body, agentsCoordinate: agentsCoordinate.body, agentsReplay: agentsReplay.body, agentsMetrics: agentsMetrics.body, governancePolicies: governancePolicies.body, governanceEvaluate: governanceEvaluate.body, governanceReplay: governanceReplay.body, governanceMetrics: governanceMetrics.body, marketplacePackages: marketplacePackages.body, marketplacePackageDetail: marketplacePackageDetail.body, marketplaceApis: marketplaceApis.body, marketplaceCompile: marketplaceCompile.body, marketplaceReplay: marketplaceReplay.body, marketplaceMetrics: marketplaceMetrics.body, enterpriseOsSummary: enterpriseOsSummary.body, enterpriseCommand: enterpriseCommand.body, enterpriseReplay: enterpriseReplay.body, enterpriseMetrics: enterpriseMetrics.body });
  save('healthcare.json', { healthcareSummary: healthcareSummary.body, healthcareMetrics: healthcareMetrics.body, healthcareSchema: healthcareSchema.body, healthcareApis: healthcareApis.body, healthcareValidateApis: healthcareValidateApis.body, healthcareWorkflow: healthcareWorkflow.body, healthcareReplay: healthcareReplay.body, healthcareApiDevelopmentExecute: healthcareApiDevelopmentExecute && healthcareApiDevelopmentExecute.body, healthcareApiDevelopmentReplay: healthcareApiDevelopmentReplay && healthcareApiDevelopmentReplay.body, healthcareGroups: healthcareGroups.body, healthcareRuntimeExecute: healthcareRuntimeExecute.body, healthcareRuntimeReplay: healthcareRuntimeReplay.body, healthcareDashboard: healthcareDashboard.body, healthcareHardeningExecute: healthcareHardeningExecute.body, healthcareHardeningReplay: healthcareHardeningReplay.body, healthcareHardeningValidate: healthcareHardeningValidate.body, healthcareHardeningDashboard: healthcareHardeningDashboard.body, healthcareHardeningCertification: healthcareHardeningCertification.body, healthcareAdvanced: healthcareAdvanced.body, healthcareAdvancedReplay: healthcareAdvancedReplay.body, healthcareIntegration: healthcareIntegration.body, healthcareIntegrationReplay: healthcareIntegrationReplay.body, healthcareCommercial: healthcareCommercial.body, healthcareCommercialReplay: healthcareCommercialReplay.body, healthcareGlobal: healthcareGlobal.body, healthcareGlobalReplay: healthcareGlobalReplay.body, healthcareCompliance: healthcareCompliance.body, healthcareComplianceReplay: healthcareComplianceReplay.body, clinicalData: clinicalData.body, clinicalDataReplay: clinicalDataReplay.body });
  save('billing-audit-usecase.json', { billingPlans: billingPlans.body, activateProfessional: activateProfessional.body, subscription: subscription.body, keysBefore: keysBefore.body, keyGenerate: keyGenerate.body, keysAfter: keysAfter.body, invoicePreview: invoicePreview.body, invoiceOpenStatus: invoiceOpen.status, enterpriseInquiry: enterpriseInquiry.body, standards: standards.body, standardsExplorer: standardsExplorer.body, dependencies: dependencies.body, metadataValidation: metadataValidation.body, canonicalValidation: canonicalValidation.body, issuesReport: issuesReport.body, observabilityForensics: observabilityForensics.body, persistenceStatus: persistenceStatus.body, auditLogs: auditLogs.body, auditExport: auditExport.body, useCase: useCase.body, adminRestrictedStatus: adminRestricted.status, workspaceReset: workspaceReset.body, workspaceListAfterReset: workspaceListAfterReset.body });

  console.log(JSON.stringify(summary, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
