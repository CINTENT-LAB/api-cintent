const crypto = require('crypto');

const CANONICAL_SCHEMA_VERSION = 'cintent.cognitive.v1.0.0';

const CORE_ENTITIES = [
  'workspace',
  'session',
  'domain',
  'application',
  'workflow',
  'orchestration',
  'replay',
  'telemetry',
  'simulation',
  'governance',
  'deployment',
  'sdk',
  'runtime_event',
  'agent',
  'context',
  'memory',
  'policy',
  'tenant',
  'user',
  'execution_artifact'
];

const CANONICAL_EVENT_TYPES = [
  'workspace.updated',
  'context.synchronized',
  'workflow.generated',
  'orchestration.started',
  'orchestration.stage.completed',
  'orchestration.recovered',
  'replay.generated',
  'replay.reconstructed',
  'telemetry.ingested',
  'telemetry.anomaly.detected',
  'governance.validated',
  'simulation.executed',
  'sdk.generated',
  'ask_cogni.reasoned',
  'deployment.prepared'
];

const DOMAIN_ALIASES = {
  drones: 'drone',
  uav: 'drone',
  'uav-drones': 'drone',
  legal: 'legal',
  judicial: 'legal',
  nyaynetra: 'legal',
  airports: 'airport',
  aviation: 'airport',
  factories: 'manufacturing',
  factory: 'manufacturing',
  robotics: 'robotics',
  cobotics: 'cobotics',
  healthcare: 'healthcare',
  travel: 'travel',
  bfsi: 'bfsi',
  banking: 'bfsi',
  edge: 'edge',
  iot: 'edge',
  logistics: 'logistics',
  enterprise: 'enterprise',
  'enterprise-workflow': 'enterprise',
  'smart-city': 'smart-city',
  smartcity: 'smart-city'
};

const DOMAIN_RUNTIME_PROFILES = {
  healthcare: {
    title: 'Healthcare',
    telemetryCategory: 'clinical-operational',
    governanceProfile: 'regulated-healthcare',
    defaultPolicies: ['tenant-isolation', 'consent-aware-replay', 'audit-lineage'],
    primitives: ['workflow', 'orchestration', 'replay', 'telemetry', 'governance', 'memory']
  },
  drone: {
    title: 'Drone and UAV',
    telemetryCategory: 'mission-telemetry',
    governanceProfile: 'airspace-safety',
    defaultPolicies: ['geo-boundary', 'mission-replay', 'edge-telemetry'],
    primitives: ['workflow', 'orchestration', 'replay', 'telemetry', 'governance', 'simulation']
  },
  manufacturing: {
    title: 'Smart Manufacturing',
    telemetryCategory: 'industrial-sensor',
    governanceProfile: 'industrial-safety',
    defaultPolicies: ['machine-safety', 'maintenance-escalation', 'operator-audit'],
    primitives: ['workflow', 'orchestration', 'replay', 'telemetry', 'simulation', 'deployment']
  },
  airport: {
    title: 'Airport Operations',
    telemetryCategory: 'facility-flow',
    governanceProfile: 'transport-operations',
    defaultPolicies: ['passenger-safety', 'baggage-lineage', 'operational-replay'],
    primitives: ['workflow', 'orchestration', 'replay', 'telemetry', 'simulation', 'governance']
  },
  legal: {
    title: 'Legal and Judicial',
    telemetryCategory: 'case-workflow',
    governanceProfile: 'evidence-governance',
    defaultPolicies: ['evidence-lineage', 'role-governance', 'replay-audit'],
    primitives: ['workflow', 'orchestration', 'replay', 'governance', 'memory', 'sdk']
  },
  bfsi: {
    title: 'BFSI',
    telemetryCategory: 'financial-risk',
    governanceProfile: 'financial-controls',
    defaultPolicies: ['fraud-replay', 'approval-lineage', 'tenant-isolation'],
    primitives: ['workflow', 'orchestration', 'replay', 'telemetry', 'governance', 'deployment']
  },
  travel: {
    title: 'Travel',
    telemetryCategory: 'travel-intent',
    governanceProfile: 'consumer-operations',
    defaultPolicies: ['locale-awareness', 'booking-replay', 'privacy-boundary'],
    primitives: ['workflow', 'orchestration', 'replay', 'simulation', 'memory', 'sdk']
  },
  robotics: {
    title: 'Robotics',
    telemetryCategory: 'robot-runtime',
    governanceProfile: 'robotic-safety',
    defaultPolicies: ['safety-envelope', 'human-override', 'runtime-replay'],
    primitives: ['workflow', 'orchestration', 'replay', 'telemetry', 'simulation', 'deployment']
  },
  cobotics: {
    title: 'Cobotics',
    telemetryCategory: 'human-robot-collaboration',
    governanceProfile: 'collaborative-safety',
    defaultPolicies: ['human-proximity', 'operator-override', 'shared-workspace-audit'],
    primitives: ['workflow', 'orchestration', 'replay', 'telemetry', 'governance', 'simulation']
  },
  logistics: {
    title: 'Logistics',
    telemetryCategory: 'supply-chain',
    governanceProfile: 'chain-of-custody',
    defaultPolicies: ['route-lineage', 'custody-replay', 'exception-governance'],
    primitives: ['workflow', 'orchestration', 'replay', 'telemetry', 'simulation', 'sdk']
  },
  edge: {
    title: 'IoT and Edge',
    telemetryCategory: 'edge-runtime',
    governanceProfile: 'edge-continuity',
    defaultPolicies: ['offline-continuity', 'edge-replay', 'regional-sync'],
    primitives: ['workflow', 'orchestration', 'replay', 'telemetry', 'deployment', 'memory']
  },
  enterprise: {
    title: 'Enterprise Operations',
    telemetryCategory: 'enterprise-runtime',
    governanceProfile: 'enterprise-controls',
    defaultPolicies: ['rbac', 'audit-lineage', 'tenant-boundary'],
    primitives: ['workspace', 'workflow', 'orchestration', 'replay', 'governance', 'deployment']
  }
};

function stableId(prefix, value) {
  return `${prefix}-${crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16)}`;
}

function now() {
  return new Date().toISOString();
}

function normalizeDomainKey(value = 'enterprise') {
  const raw = String(value || 'enterprise').trim().toLowerCase().replace(/\s+/g, '-');
  return DOMAIN_ALIASES[raw] || raw || 'enterprise';
}

function canonicalEventType(type = 'runtime.event') {
  const normalized = String(type || 'runtime.event').replace(/^eventbus\./, '').replace(/^trace\./, '');
  if (CANONICAL_EVENT_TYPES.includes(normalized)) return normalized;
  if (normalized.includes('telemetry')) return normalized.includes('anomaly') ? 'telemetry.anomaly.detected' : 'telemetry.ingested';
  if (normalized.includes('replay') && normalized.includes('reconstruct')) return 'replay.reconstructed';
  if (normalized.includes('replay')) return 'replay.generated';
  if (normalized.includes('simulation')) return 'simulation.executed';
  if (normalized.includes('sdk')) return 'sdk.generated';
  if (normalized.includes('governance')) return 'governance.validated';
  if (normalized.includes('workflow')) return 'workflow.generated';
  if (normalized.includes('orchestration')) return normalized.includes('recover') ? 'orchestration.recovered' : 'orchestration.started';
  if (normalized.includes('ask')) return 'ask_cogni.reasoned';
  if (normalized.includes('context')) return 'context.synchronized';
  return 'context.synchronized';
}

function baseEnvelope(entityType, input = {}) {
  const tenantId = input.tenant_id || input.tenantId || input.tenant || 'anonymous';
  const workspaceId = input.workspace_id || input.workspaceId || null;
  const sessionId = input.session_id || input.sessionId || input.session || null;
  const domain = normalizeDomainKey(input.domain || input.active_domain || input.selected_domain || 'enterprise');
  return {
    schema_version: CANONICAL_SCHEMA_VERSION,
    entity_type: entityType,
    entity_id: input.entity_id || input.id || stableId(entityType, `${tenantId}:${workspaceId}:${sessionId}:${domain}:${JSON.stringify(input.seed || input.source || '')}`),
    tenant_id: tenantId,
    workspace_id: workspaceId,
    session_id: sessionId,
    domain,
    application_id: input.application_id || input.applicationId || input.application || input.active_application || null,
    created_at: input.created_at || input.createdAt || input.timestamp || now(),
    updated_at: now()
  };
}

function governanceEnvelope({ tenantId = 'anonymous', user = {}, domain = 'enterprise', operation = 'runtime.operation', api = null, context = {} } = {}) {
  const domainKey = normalizeDomainKey(domain || api?.domain_key || context.domain);
  const profile = DOMAIN_RUNTIME_PROFILES[domainKey] || DOMAIN_RUNTIME_PROFILES.enterprise;
  const inheritedPolicies = [
    'schema-version-required',
    'tenant-boundary-required',
    'lineage-required',
    ...profile.defaultPolicies
  ];
  const constraints = [
    { id: 'tenant-scope', status: tenantId ? 'enforced' : 'blocked', reason: 'Every runtime operation must have tenant scope.' },
    { id: 'schema-version', status: 'enforced', reason: `${CANONICAL_SCHEMA_VERSION} attached to operation.` },
    { id: 'replay-lineage', status: context.replay_id || context.replayId || operation.includes('replay') ? 'enforced' : 'advisory', reason: 'Replay linkage is required when execution emits replayable state.' },
    { id: 'role-scope', status: ['admin', 'developer', 'viewer'].includes(user.role || 'viewer') ? 'enforced' : 'advisory', reason: `Role ${user.role || 'viewer'} mapped to canonical RBAC envelope.` }
  ];
  return {
    schema_version: CANONICAL_SCHEMA_VERSION,
    governance_id: stableId('governance', `${tenantId}:${domainKey}:${operation}:${JSON.stringify(context).slice(0, 256)}`),
    tenant_id: tenantId,
    domain: domainKey,
    operation,
    profile: profile.governanceProfile,
    inherited_policies: inheritedPolicies,
    constraints,
    decision: constraints.some(item => item.status === 'blocked') ? 'blocked' : 'allowed',
    evaluated_at: now()
  };
}

function normalizeTelemetryEvent(sample = {}, user = {}, links = {}) {
  const metrics = sample.metrics && typeof sample.metrics === 'object' ? sample.metrics : sample.sample?.metrics || sample;
  const domain = normalizeDomainKey(sample.domain || sample.stream_type || links.domain || 'enterprise');
  const profile = DOMAIN_RUNTIME_PROFILES[domain] || DOMAIN_RUNTIME_PROFILES.enterprise;
  const anomaly = Boolean(sample.anomaly || links.anomaly);
  return {
    ...baseEnvelope('telemetry', {
      ...sample,
      tenant_id: links.tenantId || sample.tenant_id || sample.tenant || user.tenant,
      session_id: links.sessionId || sample.session_id || user.sessionId || user.sub,
      workspace_id: links.workspaceId || sample.workspace_id,
      domain,
      entity_id: sample.id,
      timestamp: sample.timestamp
    }),
    event_type: 'telemetry.ingested',
    source: sample.source || 'runtime-telemetry',
    telemetry_category: profile.telemetryCategory,
    metrics,
    thresholds: sample.thresholds || {},
    confidence: Number.isFinite(Number(sample.confidence)) ? Number(sample.confidence) : anomaly ? 0.68 : 0.92,
    anomaly_state: anomaly ? 'anomaly_detected' : 'nominal',
    governance_state: links.governanceState || 'governed',
    links: {
      orchestration_id: links.orchestrationId || sample.orchestration_id || sample.orchestrationId || null,
      replay_id: links.replayId || sample.replay_id || sample.replayId || null,
      workflow_id: links.workflowId || sample.workflow_id || sample.workflowId || null,
      governance_id: links.governanceId || null
    }
  };
}

function normalizeReplayEvent(event = {}, links = {}) {
  return {
    ...baseEnvelope('replay', {
      ...event,
      tenant_id: links.tenantId || event.tenant_id || event.tenant,
      session_id: links.sessionId || event.session_id || event.session,
      workspace_id: links.workspaceId || event.workspace_id,
      domain: event.domain || event.payload?.domain || links.domain,
      entity_id: event.replay_event_id || event.id
    }),
    event_type: canonicalEventType(event.event_type || event.type || 'replay.generated'),
    replay_id: event.replay_id || event.replayId || links.replayId || null,
    sequence: Number.isFinite(Number(event.sequence)) ? Number(event.sequence) : null,
    payload: event.payload || event,
    links: {
      orchestration_id: links.orchestrationId || event.orchestration_id || event.payload?.orchestrationId || null,
      workflow_id: links.workflowId || event.workflow_id || event.payload?.workflowId || null,
      telemetry_id: links.telemetryId || event.telemetry_id || event.payload?.telemetryId || null,
      governance_id: links.governanceId || event.governance_id || event.payload?.governanceId || null
    },
    integrity_state: event.integrity?.valid === false ? 'invalid' : 'valid'
  };
}

function normalizeOrchestrationRun(run = {}, user = {}) {
  const domain = normalizeDomainKey(run.domain || run.workflow?.domain || run.compiledWorkflow?.domain || run.input?.domain || 'enterprise');
  const stages = Array.isArray(run.stages) ? run.stages : Array.isArray(run.executionPlan?.stages) ? run.executionPlan.stages : [];
  return {
    ...baseEnvelope('orchestration', {
      tenant_id: run.tenant || run.tenant_id || user.tenant,
      session_id: run.sessionId || run.session_id || user.sessionId || user.sub,
      workspace_id: run.workspaceId || run.workspace_id,
      domain,
      entity_id: run.orchestrationId || run.id
    }),
    orchestration_id: run.orchestrationId || run.id,
    workflow_id: run.workflowId || run.workflow_id || run.compiledWorkflow?.workflowId || null,
    replay_id: run.replay?.replayId || run.replay_id || null,
    state: run.status || run.state || 'running',
    stages: stages.map((stage, index) => ({
      stage_id: stage.stageId || stage.id || `${run.orchestrationId || run.id || 'orch'}-stage-${index + 1}`,
      name: stage.name || stage.title || `Stage ${index + 1}`,
      type: stage.type || 'runtime-stage',
      status: stage.status || 'completed',
      sequence: index + 1,
      checkpoint_id: stage.checkpointId || stage.checkpoint_id || null
    })),
    transitions: (run.transitions || stages.slice(1).map((stage, index) => ({
      from: stages[index]?.stageId || stages[index]?.id || `stage-${index + 1}`,
      to: stage.stageId || stage.id || `stage-${index + 2}`,
      type: 'sequential'
    }))),
    confidence_timeline: run.confidenceTimeline || run.confidenceEvolution || [],
    recovery: run.recovery || { retryable: true, checkpoint_restore: true },
    governance: run.governance || governanceEnvelope({ tenantId: run.tenant || user.tenant, user, domain, operation: 'orchestration.started', context: run })
  };
}

function normalizeRuntimeEvent(type, user = {}, payload = {}, metadata = {}) {
  const canonicalType = canonicalEventType(type);
  const domain = normalizeDomainKey(payload.domain || payload.active_domain || payload.context?.domain || metadata.domain || 'enterprise');
  return {
    ...baseEnvelope('runtime_event', {
      tenant_id: user.tenant || payload.tenant || payload.tenant_id,
      session_id: user.sessionId || user.sub || payload.sessionId,
      workspace_id: payload.workspace_id || payload.workspaceId,
      domain,
      entity_id: payload.id || payload.event_id
    }),
    event_type: canonicalType,
    source_event_type: type,
    payload,
    metadata,
    governance: governanceEnvelope({ tenantId: user.tenant || 'anonymous', user, domain, operation: canonicalType, context: payload }),
    lineage: buildLineage({
      domain,
      tenantId: user.tenant,
      workspaceId: payload.workspace_id || payload.workspaceId,
      orchestrationId: payload.orchestrationId || payload.orchestration_id || payload.replay?.orchestrationId,
      replayId: payload.replayId || payload.replay_id || payload.replay?.replayId,
      telemetryId: payload.telemetryId || payload.telemetry_id,
      workflowId: payload.workflowId || payload.workflow_id
    })
  };
}

function buildLineage({ domain = 'enterprise', tenantId = 'anonymous', workspaceId = null, workflowId = null, orchestrationId = null, replayId = null, telemetryId = null, governanceId = null } = {}) {
  const nodes = [
    { id: tenantId, type: 'tenant' },
    workspaceId && { id: workspaceId, type: 'workspace' },
    { id: normalizeDomainKey(domain), type: 'domain' },
    workflowId && { id: workflowId, type: 'workflow' },
    orchestrationId && { id: orchestrationId, type: 'orchestration' },
    telemetryId && { id: telemetryId, type: 'telemetry' },
    replayId && { id: replayId, type: 'replay' },
    governanceId && { id: governanceId, type: 'governance' }
  ].filter(Boolean);
  const edges = [];
  for (let index = 1; index < nodes.length; index += 1) {
    edges.push({ from: nodes[index - 1].id, to: nodes[index].id, relation: `${nodes[index - 1].type}_to_${nodes[index].type}` });
  }
  return { nodes, edges };
}

function normalizeApi(api = {}) {
  const domain = normalizeDomainKey(api.domain_key || api.domain || api.healthcare_domain || api.category || 'enterprise');
  return {
    schema_version: CANONICAL_SCHEMA_VERSION,
    entity_type: 'api',
    api_id: api.api_id || api.api_key || api.id || stableId('api', api.name),
    api_key: api.api_key || api.id,
    name: api.name || api.api_name || api.api_key,
    domain,
    subdomain: api.subdomain || api.category || null,
    orchestration_mapping: api.orchestration_dependencies || api.dependencies || [],
    replay_mapping: api.replay_dependencies || [],
    telemetry_mapping: api.observability_tags || api.telemetry_tags || [],
    governance_requirements: api.governance_dependencies || api.compliance_tags || api.regulatory_alignment || [],
    sdk_compatibility: api.sdk_support || api.sdk_examples || ['REST'],
    deployment_compatibility: api.deployment_modes || ['sandbox'],
    lifecycle_state: api.lifecycle_state || api.status || 'beta',
    pricing_tier: api.pricing_tier || 'developer'
  };
}

function buildMetadataRegistry({ catalog = [], simulations = [] } = {}) {
  const normalizedApis = catalog.map(normalizeApi);
  const domainKeys = [...new Set([
    ...Object.keys(DOMAIN_RUNTIME_PROFILES),
    ...normalizedApis.map(api => api.domain),
    ...simulations.map(sim => normalizeDomainKey(sim.domain))
  ])].sort();
  const domains = domainKeys.map(domain => {
    const profile = DOMAIN_RUNTIME_PROFILES[domain] || {
      title: domain.replace(/-/g, ' '),
      telemetryCategory: 'runtime',
      governanceProfile: 'standard-controls',
      defaultPolicies: ['tenant-boundary', 'replay-lineage'],
      primitives: ['workflow', 'orchestration', 'replay', 'telemetry', 'governance']
    };
    return {
      schema_version: CANONICAL_SCHEMA_VERSION,
      entity_type: 'domain',
      domain,
      title: profile.title,
      runtime_profile: profile,
      api_count: normalizedApis.filter(api => api.domain === domain).length,
      simulation_count: simulations.filter(sim => normalizeDomainKey(sim.domain) === domain).length
    };
  });
  return {
    schema_version: CANONICAL_SCHEMA_VERSION,
    generated_at: now(),
    primitives: CORE_ENTITIES,
    event_specification: CANONICAL_EVENT_TYPES,
    domains,
    apis: normalizedApis,
    simulations: simulations.map(sim => ({
      schema_version: CANONICAL_SCHEMA_VERSION,
      entity_type: 'simulation',
      simulation_id: sim.id,
      title: sim.title,
      domain: normalizeDomainKey(sim.domain),
      orchestration_mapping: sim.apiKey ? [sim.apiKey] : [],
      telemetry_mapping: sim.signals || [],
      governance_requirements: [sim.governanceLevel || 'standard']
    })),
    sdk_registry: {
      languages: ['Python', 'TypeScript', 'REST', 'ROS2', 'PX4', 'MAVLink', 'HEBI', 'NVIDIA Isaac'],
      source: 'canonical-metadata-registry',
      template_policy: 'derive-from-api-contracts'
    },
    governance_fabric: {
      inheritance: ['global', 'tenant', 'domain', 'application', 'workflow', 'runtime-operation'],
      default_policies: ['schema-version-required', 'tenant-boundary-required', 'lineage-required', 'replay-compatible']
    }
  };
}

function validateCanonicalObject(object = {}, expectedType = null) {
  const errors = [];
  if (!object.schema_version) errors.push('schema_version is required');
  if (!object.entity_type) errors.push('entity_type is required');
  if (expectedType && object.entity_type !== expectedType) errors.push(`entity_type must be ${expectedType}`);
  if (!object.tenant_id && !['domain', 'api', 'simulation'].includes(object.entity_type)) errors.push('tenant_id is required');
  if (object.domain && object.domain !== normalizeDomainKey(object.domain)) errors.push('domain must be normalized');
  return { valid: errors.length === 0, errors };
}

module.exports = {
  CANONICAL_SCHEMA_VERSION,
  CORE_ENTITIES,
  CANONICAL_EVENT_TYPES,
  DOMAIN_RUNTIME_PROFILES,
  normalizeDomainKey,
  normalizeApi,
  normalizeTelemetryEvent,
  normalizeReplayEvent,
  normalizeOrchestrationRun,
  normalizeRuntimeEvent,
  buildMetadataRegistry,
  governanceEnvelope,
  buildLineage,
  validateCanonicalObject
};
