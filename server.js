/**
 * CINTENT Developer Platform v2 - Simple Express Server
 * Copy to server.js for Hostinger deployment
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database connection
const hasPostgresEnv = Boolean(process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME && process.env.DB_PASSWORD));
const dbConfig = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
} : (hasPostgresEnv ? {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
} : null);

const pool = dbConfig ? new Pool(dbConfig) : null;
const dbEnabled = !!pool;

const COOKIE_NAME = 'cintent_session';
const JWT_SECRET = process.env.JWT_SECRET || 'cintent-demo-secret';
const JWT_EXPIRES_IN = '2h';
const DEMO_EXPIRES_IN = '1h';

const users = new Map();
const emailVerificationTokens = new Map();
const passwordResetTokens = new Map();
const executionSessions = new Map();
const executionEvents = [];
const simulationEvents = [];
const auditEvents = [];
const subscriptions = new Map();
const apiKeys = new Map();
const useCaseRequests = [];
const invoiceRecords = new Map();
const enterpriseInquiries = [];

const TIER_RANK = { demo: 0, free: 1, developer: 2, professional: 3, startup: 3, enterprise: 4 };
const PLAN_DEFINITIONS = [
    { id: 'demo', name: 'Demo', price: 0, quota: 'Sandbox only', fit: 'Limited platform walkthrough', scope: 'simulated APIs, documentation, Ask COGNI, playground, limited dashboards', billingCycle: 'sample-only', paymentTerms: 'No commercial billing active' },
    { id: 'free', name: 'Free', price: 0, quota: '5k calls/month', fit: 'Evaluation and docs exploration', scope: 'documentation, discovery, sandbox APIs, basic SDK previews', billingCycle: 'monthly', paymentTerms: 'Due on receipt after paid activation' },
    { id: 'developer', name: 'Developer', price: 149, quota: '100k calls/month', fit: 'SDK onboarding and early integration', scope: 'sandbox execution, API keys, SDK generation, replay previews', billingCycle: 'monthly', paymentTerms: 'Due on receipt' },
    { id: 'professional', name: 'Professional', price: 799, quota: '1M calls/month', fit: 'Production pilots and orchestration usage', scope: 'advanced observability, audit exports, governance analytics', billingCycle: 'monthly', paymentTerms: 'Net 15 or card autopay' },
    { id: 'enterprise', name: 'Enterprise', price: 4200, quota: 'Custom quota', fit: 'SLA, SSO, invoicing, governance, support', scope: 'production orchestration, tenant management, premium governance exports', billingCycle: 'annual or monthly invoice', paymentTerms: 'Enterprise invoicing' }
];

const TIER_DOMAINS = {
    demo: ['travel', 'drone'],
    free: ['travel', 'enterprise-workflow'],
    developer: ['travel', 'drone', 'enterprise-workflow', 'smart-governance'],
    professional: ['travel', 'drone', 'robotics', 'cobotics', 'enterprise-workflow', 'smart-governance'],
    enterprise: ['*']
};

const SIMULATION_TEMPLATES = [
    { id: 'travel-orchestration', title: 'Travel orchestration', domain: 'travel', apiKey: 'travel-intent', category: 'orchestration', governanceLevel: 'standard', agents: ['travel planner', 'mobility agent', 'governance agent', 'replay agent'], signals: ['itinerary', 'location', 'accessibility', 'disruption'] },
    { id: 'drone-fleet-coordination', title: 'Drone fleet coordination', domain: 'drone', apiKey: 'drone-fleet', category: 'distributed-coordination', governanceLevel: 'high', agents: ['mission planner', 'drone coordination agent', 'edge sync agent', 'replay agent'], signals: ['telemetry', 'geofence', 'battery', 'airspace'] },
    { id: 'autonomous-mission', title: 'Autonomous mission execution', domain: 'drone', apiKey: 'drone-fleet', category: 'autonomous-mission', governanceLevel: 'high', agents: ['mission agent', 'risk agent', 'edge recovery agent', 'governance agent'], signals: ['mission state', 'edge health', 'route risk', 'fallback'] },
    { id: 'governance-propagation', title: 'Governance propagation', domain: 'smart-governance', apiKey: 'gov-validate', category: 'governance', governanceLevel: 'enterprise', agents: ['policy agent', 'tenant boundary agent', 'audit agent', 'explainability agent'], signals: ['policy', 'scope', 'audit', 'override'] },
    { id: 'replay-reconstruction', title: 'Replay reconstruction', domain: 'enterprise-workflow', apiKey: 'replay-core', category: 'replay', governanceLevel: 'standard', agents: ['replay agent', 'lineage agent', 'confidence agent', 'audit agent'], signals: ['trace', 'snapshot', 'lineage', 'governance'] },
    { id: 'distributed-coordination', title: 'Distributed coordination', domain: 'enterprise-workflow', apiKey: 'phase-decision', category: 'distributed-cognition', governanceLevel: 'standard', agents: ['orchestration planner', 'dependency agent', 'sync agent', 'recovery agent'], signals: ['dependency', 'synchronization', 'latency', 'handoff'] },
    { id: 'multimodal-cognition', title: 'Multimodal cognition', domain: 'multilingual', apiKey: 'phase-intent', category: 'multimodal', governanceLevel: 'standard', agents: ['signal fusion agent', 'intent agent', 'context agent', 'explainability agent'], signals: ['speech', 'text', 'metadata', 'context'] },
    { id: 'enterprise-workflow', title: 'Enterprise workflow orchestration', domain: 'enterprise-workflow', apiKey: 'phase-domain', category: 'workflow', governanceLevel: 'standard', agents: ['workflow agent', 'approval agent', 'observability agent', 'replay agent'], signals: ['workflow', 'approval', 'quota', 'sla'] },
    { id: 'multilingual-cognition', title: 'Multilingual cognition', domain: 'multilingual', apiKey: 'phase-intent', category: 'language-cognition', governanceLevel: 'standard', agents: ['speech agent', 'translation agent', 'regional context agent', 'governance agent'], signals: ['speech', 'translation', 'locale', 'intent'] },
    { id: 'robotics-orchestration', title: 'Robotics orchestration', domain: 'robotics', apiKey: 'rbt-task-orchestrate', category: 'robotics', governanceLevel: 'high', agents: ['workflow agent', 'robotics coordinator', 'safety agent', 'replay agent'], signals: ['workflow', 'sensor state', 'safety zone', 'task route'] },
    { id: 'warehouse-robotics', title: 'Warehouse robotics fleet coordination', domain: 'robotics', apiKey: 'rbt-fleet-coordinate', category: 'robotic-fleet', governanceLevel: 'high', agents: ['fleet planner', 'traffic coordinator', 'resource balancer', 'replay agent'], signals: ['task queue', 'aisle congestion', 'battery state', 'robotic traffic'] },
    { id: 'airport-robotics', title: 'Airport robotics orchestration', domain: 'robotics', apiKey: 'rbt-task-orchestrate', category: 'robotics', governanceLevel: 'high', agents: ['airport workflow agent', 'mobility coordinator', 'restricted zone agent', 'audit replay agent'], signals: ['baggage flow', 'terminal zone', 'passenger proximity', 'route constraint'] },
    { id: 'hospital-robotics', title: 'Hospital robotics assistance', domain: 'robotics', apiKey: 'rbt-human-aware-coordinate', category: 'human-aware-robotics', governanceLevel: 'enterprise', agents: ['care workflow agent', 'human-aware coordinator', 'safety governance agent', 'replay agent'], signals: ['care route', 'human proximity', 'accessibility signal', 'restricted area'] },
    { id: 'industrial-robotics', title: 'Industrial robotics workflow', domain: 'robotics', apiKey: 'rbt-task-orchestrate', category: 'industrial-robotics', governanceLevel: 'enterprise', agents: ['industrial workflow agent', 'station coordinator', 'safety envelope agent', 'observability agent'], signals: ['assembly step', 'station health', 'shared workspace', 'quality event'] },
    { id: 'edge-robotics', title: 'Edge robotics coordination', domain: 'robotics', apiKey: 'rbt-edge-coordinate', category: 'edge-robotics', governanceLevel: 'high', agents: ['edge coordinator', 'regional sync agent', 'recovery agent', 'replay agent'], signals: ['edge state', 'disconnect window', 'regional handoff', 'recovery vector'] },
    { id: 'robotic-safety-governance', title: 'Robotic safety governance', domain: 'robotics', apiKey: 'rbt-safety-governance', category: 'robotic-governance', governanceLevel: 'enterprise', agents: ['safety policy agent', 'restricted-zone agent', 'override coordinator', 'audit replay agent'], signals: ['safety zone', 'collision risk', 'human override', 'fail-safe'] },
    { id: 'robotic-digital-twin', title: 'Robotics digital twin interface', domain: 'robotics', apiKey: 'rbt-digital-twin-interface', category: 'digital-twin', governanceLevel: 'high', agents: ['twin contract agent', 'simulation agent', 'replay twin agent', 'observability agent'], signals: ['twin state', 'orchestration twin', 'replay twin', 'operational delta'] },
    { id: 'cobotics-coordination', title: 'Cobotics coordination', domain: 'cobotics', apiKey: 'cbt-workspace', category: 'cobotics', governanceLevel: 'high', agents: ['human-machine context agent', 'safety agent', 'collaboration agent', 'explainability agent'], signals: ['human intent', 'machine state', 'safety', 'handoff'] },
    { id: 'warehouse-cobotics', title: 'Warehouse human-robot collaboration', domain: 'cobotics', apiKey: 'cbt-shared-workspace', category: 'collaborative-logistics', governanceLevel: 'high', agents: ['operator intent agent', 'shared workspace agent', 'task balancing agent', 'collaborative replay agent'], signals: ['operator intent', 'pick route', 'human proximity', 'workload balance'] },
    { id: 'airport-cobotics-assistance', title: 'Airport assistance cobots', domain: 'cobotics', apiKey: 'cbt-human-aware', category: 'cobotics-assistance', governanceLevel: 'enterprise', agents: ['passenger context agent', 'operator awareness agent', 'safe-zone agent', 'explainability agent'], signals: ['passenger request', 'operator signal', 'terminal safe zone', 'handoff'] },
    { id: 'hospital-cobotics', title: 'Hospital collaborative robots', domain: 'cobotics', apiKey: 'cbt-safety-governance', category: 'human-first-cobotics', governanceLevel: 'enterprise', agents: ['care team intent agent', 'proximity governance agent', 'override agent', 'replay agent'], signals: ['care context', 'human proximity', 'operator override', 'restricted area'] },
    { id: 'industrial-assembly-cobots', title: 'Industrial assembly cobots', domain: 'cobotics', apiKey: 'cbt-adaptive-coordinate', category: 'industrial-cobotics', governanceLevel: 'enterprise', agents: ['assembly intent agent', 'workspace orchestration agent', 'adaptive balancing agent', 'safety governance agent'], signals: ['assembly step', 'operator load', 'shared tool state', 'safety envelope'] },
    { id: 'manufacturing-support-cobots', title: 'Manufacturing support cobots', domain: 'cobotics', apiKey: 'cbt-intent-sync', category: 'manufacturing-cobotics', governanceLevel: 'high', agents: ['operator intent agent', 'task reassignment agent', 'confidence agent', 'observability agent'], signals: ['operator intent', 'station load', 'task handoff', 'confidence drift'] },
    { id: 'hri-industrial-cobotics', title: 'HRI industrial cobotics interaction', domain: 'cobotics', apiKey: 'hri-collaboration-orchestrate', category: 'hri-industrial-collaboration', governanceLevel: 'enterprise', agents: ['human intent agent', 'multimodal interaction agent', 'trust confidence agent', 'override governance agent'], signals: ['operator command', 'gesture cue', 'assembly context', 'trust confidence'] },
    { id: 'hri-airport-assistance', title: 'HRI airport assistance robotics', domain: 'cobotics', apiKey: 'hri-multimodal-interaction', category: 'hri-airport-assistance', governanceLevel: 'high', agents: ['passenger intent agent', 'multilingual interaction agent', 'proximity safety agent', 'explainability agent'], signals: ['speech', 'gesture', 'terminal context', 'accessibility need'] },
    { id: 'hri-healthcare-assistance', title: 'HRI healthcare robotics coordination', domain: 'cobotics', apiKey: 'hri-safety-propagate', category: 'hri-healthcare-safety', governanceLevel: 'enterprise', agents: ['care intent agent', 'behavioral signal agent', 'safety propagation agent', 'interaction replay agent'], signals: ['care request', 'human proximity', 'behavioral signal', 'restricted zone'] },
    { id: 'hri-multilingual-assistance', title: 'HRI multilingual assistance', domain: 'cobotics', apiKey: 'hri-multimodal-coordinate', category: 'hri-multilingual-cognition', governanceLevel: 'high', agents: ['Shunya-AI language agent', 'intent cognition agent', 'gesture interpretation agent', 'collaboration agent'], signals: ['speech', 'translation', 'gesture', 'contextual intent'] },
    { id: 'hri-safety-critical-collaboration', title: 'HRI safety-critical collaboration', domain: 'cobotics', apiKey: 'hri-override-governance', category: 'hri-safety-critical', governanceLevel: 'enterprise', agents: ['override governance agent', 'human presence agent', 'safety replay agent', 'escalation agent'], signals: ['emergency override', 'human proximity', 'restricted action', 'escalation confidence'] },
    { id: 'smart-factory-industrial-robotics', title: 'Smart factory industrial robotics', domain: 'robotics', apiKey: 'irobot-manufacturing-orchestrate', category: 'industrial-robotics', governanceLevel: 'enterprise', agents: ['manufacturing orchestration agent', 'factory synchronization agent', 'industrial governance agent', 'production replay agent'], signals: ['production order', 'factory line state', 'restricted operation', 'production confidence'] },
    { id: 'manufacturing-line-orchestration', title: 'Manufacturing line orchestration', domain: 'robotics', apiKey: 'irobot-assembly-sync', category: 'manufacturing-orchestration', governanceLevel: 'enterprise', agents: ['assembly-line synchronization agent', 'workflow coordinator', 'quality anomaly agent', 'replay agent'], signals: ['assembly step', 'station sync', 'quality signal', 'line throughput'] },
    { id: 'distributed-manufacturing', title: 'Distributed manufacturing coordination', domain: 'robotics', apiKey: 'irobot-factory-coordinate', category: 'distributed-manufacturing', governanceLevel: 'enterprise', agents: ['factory balancing agent', 'multi-line coordinator', 'load propagation agent', 'observability agent'], signals: ['line load', 'station availability', 'production balancing', 'factory vector'] },
    { id: 'predictive-maintenance-coordination', title: 'Predictive maintenance coordination', domain: 'robotics', apiKey: 'irobot-predictive-coordinate', category: 'predictive-industrial', governanceLevel: 'enterprise', agents: ['predictive coordination agent', 'anomaly anticipation agent', 'maintenance workflow agent', 'explainability agent'], signals: ['failure precursor', 'maintenance window', 'anomaly forecast', 'redistribution plan'] },
    { id: 'industrial-logistics-robotics', title: 'Industrial logistics robotics', domain: 'robotics', apiKey: 'irobot-smart-factory-coordinate', category: 'industrial-logistics', governanceLevel: 'high', agents: ['industrial logistics agent', 'warehouse automation agent', 'synchronization agent', 'governance agent'], signals: ['material movement', 'line-side inventory', 'warehouse robot state', 'restricted lane'] },
    { id: 'smart-infrastructure', title: 'Smart infrastructure coordination', domain: 'iot-smart-infrastructure', apiKey: 'phase-domain', category: 'smart-infrastructure', governanceLevel: 'enterprise', agents: ['infrastructure agent', 'iot signal agent', 'edge agent', 'anomaly agent'], signals: ['iot stream', 'edge state', 'facility health', 'anomaly'] }
];

const ROBOTICS_RUNTIME_SERVICES = [
    { id: 'robotics-runtime-service', name: 'Robotics Runtime Service', apiKey: 'rbt-runtime-core', responsibility: 'Tenant-aware robotics execution sessions, lifecycle state, runtime telemetry, and orchestration envelope management.', stateModel: ['queued', 'initializing', 'coordinating', 'governance-check', 'replay-capturing', 'synchronizing', 'executing', 'completed', 'degraded', 'failed', 'recovered'] },
    { id: 'robotics-orchestration-engine', name: 'Robotics Orchestration Engine', apiKey: 'rbt-task-orchestrate', responsibility: 'Metadata-driven robotic task, workflow, role-assignment, and adaptive coordination orchestration.', stateModel: ['initializing', 'coordinating', 'executing', 'completed'] },
    { id: 'robotics-execution-session-manager', name: 'Robotics Execution Session Manager', apiKey: 'rbt-runtime-core', responsibility: 'SSE streaming, polling fallback, replay package binding, tenant boundary checks, and execution persistence.', stateModel: ['queued', 'initializing', 'coordinating', 'completed', 'failed'] },
    { id: 'robotics-replay-runtime', name: 'Robotics Replay Runtime', apiKey: 'rbt-replay', responsibility: 'Robotic orchestration replay, governance replay, execution reconstruction, confidence replay, and synchronization replay.', stateModel: ['replay-capturing', 'completed'] },
    { id: 'robotics-governance-runtime', name: 'Robotics Governance Runtime', apiKey: 'rbt-governance', responsibility: 'Safety, collision, restricted-zone, human-aware, escalation, and emergency override propagation.', stateModel: ['governance-check', 'degraded', 'recovered', 'completed'] },
    { id: 'robotics-confidence-propagation-engine', name: 'Robotics Confidence Propagation Engine', apiKey: 'rbt-observability', responsibility: 'Initial, propagated, governance-adjusted, synchronization, and final execution confidence tracking.', stateModel: ['coordinating', 'governance-check', 'synchronizing', 'completed'] },
    { id: 'distributed-robot-coordination-runtime', name: 'Distributed Robot Coordination Runtime', apiKey: 'rbt-distributed-coordinate', responsibility: 'Fleet synchronization, traffic coordination, resource propagation, vector-clock synchronization, and edge handoff.', stateModel: ['coordinating', 'synchronizing', 'degraded', 'recovered'] },
    { id: 'human-aware-coordination-runtime', name: 'Human-Aware Coordination Runtime', apiKey: 'rbt-human-aware-coordinate', responsibility: 'Human proximity cognition, shared workspace awareness, collaborative intent sync, and human override governance.', stateModel: ['coordinating', 'governance-check', 'executing'] },
    { id: 'robotics-simulation-runtime', name: 'Robotics Simulation Runtime', apiKey: 'rbt-digital-twin-interface', responsibility: 'Warehouse, airport, hospital, industrial, fleet, cobotics, edge, and digital-twin simulation execution.', stateModel: ['queued', 'coordinating', 'synchronizing', 'replay-capturing', 'completed'] },
    { id: 'robotics-observability-runtime', name: 'Robotics Observability Runtime', apiKey: 'rbt-observability', responsibility: 'Orchestration latency, synchronization health, replay activity, governance interventions, anomalies, confidence drift, and coordination activity.', stateModel: ['executing', 'completed', 'degraded'] }
];

const COBOTICS_RUNTIME_SERVICES = [
    { id: 'cobotics-collaboration-runtime', name: 'Cobotics Collaboration Runtime', apiKey: 'cbt-collaboration-runtime', responsibility: 'Human-robot collaborative execution sessions, shared workspace lifecycle, and collaboration envelope management.', stateModel: ['detecting-human', 'synchronizing-intent', 'collaborative-planning', 'coordinating', 'executing', 'completed'] },
    { id: 'human-aware-coordination-engine', name: 'Human-Aware Coordination Engine', apiKey: 'cbt-human-aware', responsibility: 'Human proximity cognition, operator awareness, collaborative awareness, and operator intent context.', stateModel: ['detecting-human', 'synchronizing-intent', 'coordinating'] },
    { id: 'collaborative-safety-governance-runtime', name: 'Collaborative Safety Governance Runtime', apiKey: 'cbt-safety-governance', responsibility: 'Human-first governance, proximity governance, collision governance, restricted-zone enforcement, emergency override, and collaborative fail-safe propagation.', stateModel: ['governance-validation', 'safety-paused', 'recovered', 'completed'] },
    { id: 'shared-workspace-orchestration-layer', name: 'Shared Workspace Orchestration Layer', apiKey: 'cbt-shared-workspace', responsibility: 'Collaborative workspace orchestration, safe-zone coordination, path synchronization, task balancing, and execution propagation.', stateModel: ['collaborative-planning', 'coordinating', 'executing'] },
    { id: 'intent-synchronization-engine', name: 'Intent Synchronization Engine', apiKey: 'cbt-intent-sync', responsibility: 'Operator intention awareness, workload negotiation, contextual synchronization, and dynamic reassignment.', stateModel: ['synchronizing-intent', 'adaptive-balancing', 'coordinating'] },
    { id: 'collaborative-replay-runtime', name: 'Collaborative Replay Runtime', apiKey: 'cbt-replay-explain', responsibility: 'Collaborative replay, human-robot decision replay, governance replay, synchronization replay, and explainability replay.', stateModel: ['replay-capturing', 'completed'] },
    { id: 'adaptive-coordination-runtime', name: 'Adaptive Coordination Runtime', apiKey: 'cbt-adaptive-coordinate', responsibility: 'Adaptive robotic behavior, workload redistribution, task reassignment, dynamic coordination balancing, and contextual adaptation.', stateModel: ['adaptive-balancing', 'coordinating', 'recovered'] },
    { id: 'collaborative-confidence-evolution-engine', name: 'Collaborative Confidence Evolution Engine', apiKey: 'cbt-observability', responsibility: 'Collaborative, operator, synchronization, governance-adjusted, and execution confidence tracking.', stateModel: ['synchronizing-intent', 'governance-validation', 'adaptive-balancing', 'completed'] },
    { id: 'cobotics-simulation-runtime', name: 'Cobotics Simulation Runtime', apiKey: 'cbt-simulation-runtime', responsibility: 'Warehouse, airport, hospital, industrial assembly, collaborative logistics, and manufacturing support cobotics simulations.', stateModel: ['detecting-human', 'collaborative-planning', 'governance-validation', 'replay-capturing', 'completed'] },
    { id: 'human-robot-observability-layer', name: 'Human-Robot Observability Layer', apiKey: 'cbt-observability', responsibility: 'Collaborative telemetry, human interaction metrics, synchronization health, safety interventions, anomaly propagation, and collaborative execution metrics.', stateModel: ['executing', 'degraded', 'completed'] },
    { id: 'collaborative-explainability-runtime', name: 'Collaborative Explainability Runtime', apiKey: 'cbt-replay-explain', responsibility: 'Explainable collaboration traces, task reassignment reasons, safety intervention explanations, and operator override rationale.', stateModel: ['replay-capturing', 'completed'] },
    { id: 'tenant-aware-cobotics-governance-layer', name: 'Tenant-Aware Cobotics Governance Layer', apiKey: 'cbt-governance', responsibility: 'Enterprise-only collaborative API controls, RBAC, replay authorization, governance authorization, and tenant boundary enforcement.', stateModel: ['governance-validation', 'completed'] }
];

const HRI_RUNTIME_SERVICES = [
    { id: 'human-intent-runtime', name: 'Human Intent Runtime', apiKey: 'hri-intent-cognition', responsibility: 'Human command cognition, contextual intent mapping, ambiguity resolution, and workflow intention propagation.', stateModel: ['intent-recognition', 'contextual-interpretation', 'ambiguity-resolution', 'completed'] },
    { id: 'multimodal-interaction-engine', name: 'Multimodal Interaction Engine', apiKey: 'hri-multimodal-interaction', responsibility: 'Voice, gesture, visual cue, contextual signal, multilingual, and environmental interaction orchestration.', stateModel: ['multimodal-capture', 'interaction-interpretation', 'contextual-adaptation', 'completed'] },
    { id: 'cognitive-collaboration-runtime', name: 'Cognitive Collaboration Runtime', apiKey: 'hri-collaboration-orchestrate', responsibility: 'Human-aware robotic orchestration, collaborative execution, shared task coordination, and adaptive collaboration.', stateModel: ['collaborative-planning', 'adaptive-collaboration', 'executing', 'completed'] },
    { id: 'contextual-adaptation-engine', name: 'Contextual Adaptation Engine', apiKey: 'hri-context-adapt', responsibility: 'Cognitive context adaptation, environmental awareness, behavioral interpretation, and adaptive workflow interpretation.', stateModel: ['contextual-interpretation', 'contextual-adaptation', 'adaptive-collaboration', 'completed'] },
    { id: 'human-override-governance-runtime', name: 'Human Override Governance Runtime', apiKey: 'hri-override-governance', responsibility: 'Emergency override, escalation propagation, human authority, restricted action governance, and override explainability.', stateModel: ['override-governance', 'escalation-propagation', 'safety-paused', 'recovered'] },
    { id: 'human-safety-propagation-runtime', name: 'Human Safety Propagation Runtime', apiKey: 'hri-safety-propagate', responsibility: 'Proximity-aware orchestration, collaborative safety propagation, restricted execution governance, and safety replay.', stateModel: ['safety-validation', 'override-governance', 'replay-capturing', 'completed'] },
    { id: 'human-trust-confidence-engine', name: 'Human Trust Confidence Engine', apiKey: 'hri-trust-confidence', responsibility: 'Trust confidence scoring, interaction confidence, collaborative certainty, anomaly confidence evolution, and behavioral confidence.', stateModel: ['trust-scoring', 'confidence-propagation', 'completed'] },
    { id: 'cognitive-interaction-replay-runtime', name: 'Cognitive Interaction Replay Runtime', apiKey: 'hri-interaction-replay', responsibility: 'Interaction replay, decision replay, collaboration reconstruction, human override replay, and explainable coordination traces.', stateModel: ['replay-capturing', 'completed'] },
    { id: 'human-aware-explainability-runtime', name: 'Human-Aware Explainability Runtime', apiKey: 'hri-explainability', responsibility: 'Explainable interaction, adaptation, escalation, overrides, confidence evolution, and collaboration rationale.', stateModel: ['explainability-reconstruction', 'completed'] },
    { id: 'contextual-behavioral-analysis-runtime', name: 'Contextual Behavioral Analysis Runtime', apiKey: 'hri-behavior-analysis', responsibility: 'Emotion and behavioral signal awareness, anomaly interpretation, and contextual behavioral analysis.', stateModel: ['behavioral-signal-analysis', 'trust-scoring', 'completed'] },
    { id: 'adaptive-interaction-orchestrator', name: 'Adaptive Interaction Orchestrator', apiKey: 'hri-adaptive-interaction', responsibility: 'Adaptive interaction orchestration, task adaptation, collaboration certainty, and low-latency interaction adjustment.', stateModel: ['adaptive-collaboration', 'executing', 'completed'] },
    { id: 'human-presence-synchronization-runtime', name: 'Human Presence Synchronization Runtime', apiKey: 'hri-presence-sync', responsibility: 'Human presence, proximity, operator state, shared workspace, and edge synchronization.', stateModel: ['presence-synchronization', 'synchronizing', 'completed'] },
    { id: 'collaboration-telemetry-runtime', name: 'Collaboration Telemetry Runtime', apiKey: 'hri-collaboration-telemetry', responsibility: 'Interaction telemetry, trust metrics, escalation metrics, confidence, override frequency, governance events, and behavioral anomaly tracking.', stateModel: ['executing', 'completed'] },
    { id: 'multimodal-coordination-runtime', name: 'Multimodal Coordination Runtime', apiKey: 'hri-multimodal-coordinate', responsibility: 'Voice, gesture, visual, behavioral, multilingual, and environmental coordination aligned with Shunya-AI multilingual cognition infrastructure.', stateModel: ['multimodal-capture', 'interaction-interpretation', 'synchronizing', 'completed'] },
    { id: 'human-escalation-runtime', name: 'Human Escalation Runtime', apiKey: 'hri-escalation', responsibility: 'Escalation handling, human intervention routing, override authority, and escalation replay.', stateModel: ['escalation-propagation', 'override-governance', 'completed'] }
];

const INDUSTRIAL_ROBOTICS_RUNTIME_SERVICES = [
    { id: 'industrial-robotics-runtime', name: 'Industrial Robotics Runtime', apiKey: 'irobot-runtime', responsibility: 'Tenant-aware industrial robotic orchestration sessions, production lifecycle, and factory execution envelopes.', stateModel: ['initializing-production', 'coordinating-workflow', 'executing', 'completed'] },
    { id: 'manufacturing-orchestration-engine', name: 'Manufacturing Orchestration Engine', apiKey: 'irobot-manufacturing-orchestrate', responsibility: 'Production orchestration, robotic scheduling, workflow propagation, and manufacturing execution orchestration.', stateModel: ['initializing-production', 'coordinating-workflow', 'executing'] },
    { id: 'industrial-workflow-coordination-layer', name: 'Industrial Workflow Coordination Layer', apiKey: 'irobot-workflow-coordinate', responsibility: 'Industrial workflow coordination, robotic task propagation, adaptive manufacturing routes, and workcell handoffs.', stateModel: ['coordinating-workflow', 'balancing-production', 'completed'] },
    { id: 'distributed-factory-coordination-runtime', name: 'Distributed Factory Coordination Runtime', apiKey: 'irobot-factory-coordinate', responsibility: 'Multi-line coordination, robotic station synchronization, distributed production balancing, and load propagation.', stateModel: ['synchronizing-factory', 'balancing-production', 'recovered'] },
    { id: 'industrial-replay-runtime', name: 'Industrial Replay Runtime', apiKey: 'irobot-replay-explain', responsibility: 'Industrial execution replay, production replay, synchronization replay, governance replay, anomaly replay, and explainability replay.', stateModel: ['replay-capturing', 'completed'] },
    { id: 'industrial-governance-runtime', name: 'Industrial Governance Runtime', apiKey: 'irobot-governance', responsibility: 'Industrial safety governance, restricted operation governance, emergency shutdown propagation, escalation, compliance, and factory governance enforcement.', stateModel: ['governance-validating', 'paused', 'recovered', 'completed'] },
    { id: 'predictive-coordination-engine', name: 'Predictive Coordination Engine', apiKey: 'irobot-predictive-coordinate', responsibility: 'Workflow prediction, anomaly anticipation, adaptive redistribution, predictive balancing, and optimization propagation.', stateModel: ['anomaly-detecting', 'balancing-production', 'recovered'] },
    { id: 'production-confidence-evolution-runtime', name: 'Production Confidence Evolution Runtime', apiKey: 'irobot-observability', responsibility: 'Production, synchronization, predictive, governance-adjusted, and completion confidence tracking.', stateModel: ['synchronizing-factory', 'governance-validating', 'completed'] },
    { id: 'industrial-simulation-runtime', name: 'Industrial Simulation Runtime', apiKey: 'irobot-simulation-runtime', responsibility: 'Smart factory, warehouse automation, manufacturing line, assembly, industrial logistics, predictive maintenance, and distributed manufacturing simulations.', stateModel: ['initializing-production', 'synchronizing-factory', 'anomaly-detecting', 'replay-capturing', 'completed'] },
    { id: 'industrial-observability-runtime', name: 'Industrial Observability Runtime', apiKey: 'irobot-observability', responsibility: 'Factory telemetry, orchestration latency, synchronization metrics, execution health, anomaly metrics, confidence telemetry, and distributed coordination metrics.', stateModel: ['executing', 'degraded', 'completed'] },
    { id: 'industrial-explainability-runtime', name: 'Industrial Explainability Runtime', apiKey: 'irobot-replay-explain', responsibility: 'Explainable industrial orchestration, production redistribution rationale, anomaly propagation explanations, and governance intervention context.', stateModel: ['replay-capturing', 'completed'] },
    { id: 'tenant-aware-industrial-governance-layer', name: 'Tenant-Aware Industrial Governance Layer', apiKey: 'irobot-tenant-governance', responsibility: 'Enterprise-only industrial API controls, industrial RBAC, replay authorization, governance authorization, and tenant factory boundaries.', stateModel: ['governance-validating', 'completed'] },
    { id: 'smart-factory-coordination-runtime', name: 'Smart Factory Coordination Runtime', apiKey: 'irobot-smart-factory-coordinate', responsibility: 'Smart factory coordination, orchestration twin readiness, and factory-wide robotic workflow propagation.', stateModel: ['synchronizing-factory', 'balancing-production', 'completed'] },
    { id: 'assembly-line-synchronization-engine', name: 'Assembly-Line Synchronization Engine', apiKey: 'irobot-assembly-sync', responsibility: 'Assembly synchronization, station handoff, production cadence balancing, and robotic station coordination.', stateModel: ['synchronizing-factory', 'coordinating-workflow', 'completed'] },
    { id: 'industrial-anomaly-coordination-runtime', name: 'Industrial Anomaly Coordination Runtime', apiKey: 'irobot-anomaly-coordinate', responsibility: 'Anomaly-aware orchestration, production halt propagation, recovery routing, and predictive degradation handling.', stateModel: ['anomaly-detecting', 'degraded', 'paused', 'recovered'] }
];

const ROBOTICS_ECOSYSTEM_COMPATIBILITY = [
    { id: 'ros2', name: 'ROS 2', currentStable: 'Kilted Kaiju', currentLts: 'Jazzy Jalisco', stackType: 'middleware', integrationReadiness: ['topics', 'services', 'actions', 'lifecycle nodes', 'telemetry streams', 'distributed coordination', 'edge deployments', 'DDS middleware', 'ROS graph propagation'], orchestrationRole: 'CINTENT sits above ROS 2 and DDS as cognitive orchestration infrastructure, not as a ROS replacement.', vla: false, edge: true, simulation: true, replay: true, governance: true, observability: true, synchronization: ['DDS graph', 'distributed ROS graph', 'multi-agent coordination'] },
    { id: 'hebi', name: 'HEBI Robotics APIs', stackType: 'robotics-api', integrationReadiness: ['MATLAB APIs', 'Python APIs', 'C# APIs', 'actuator orchestration metadata', 'telemetry propagation', 'coordination synchronization'], orchestrationRole: 'CINTENT captures actuator-level telemetry as orchestration metadata without implementing actuator firmware.', vla: false, edge: true, simulation: false, replay: true, governance: true, observability: true, synchronization: ['group command metadata', 'robotic confidence telemetry'] },
    { id: 'gemini-robotics', name: 'Gemini Robotics APIs', stackType: 'vla-api', integrationReadiness: ['Vision-Language-Action orchestration', 'multimodal cognition', 'visual reasoning', 'language-guided robotics', 'intent-aware coordination', 'cognitive adaptation'], orchestrationRole: 'CINTENT operationalizes VLA outputs as governed, replayable robotic cognition and collaboration context.', vla: true, edge: true, simulation: true, replay: true, governance: true, observability: true, synchronization: ['multimodal intent graph', 'VLA coordination trace'] },
    { id: 'nvidia-isaac', name: 'NVIDIA Isaac SDK / Isaac Sim', stackType: 'simulation-edge-ai', integrationReadiness: ['robotic simulation orchestration', 'edge AI coordination', 'GPU-accelerated orchestration', 'perception pipelines', 'distributed edge robotics', 'Isaac Sim visibility'], orchestrationRole: 'CINTENT uses Isaac-compatible simulation and perception metadata without replacing Isaac runtime or simulation tooling.', vla: true, edge: true, simulation: true, replay: true, governance: true, observability: true, synchronization: ['simulation clock', 'edge perception pipeline', 'distributed GPU runtime'] },
    { id: 'abb-rws', name: 'ABB Robot Web Services (RWS)', stackType: 'industrial-rest-api', integrationReadiness: ['RESTful robotic orchestration', 'remote robotic execution', 'telemetry ingestion', 'distributed coordination', 'governance-aware execution'], orchestrationRole: 'CINTENT provides Web/API-based industrial cognition above ABB RWS, not robot controller logic.', vla: false, edge: true, simulation: false, replay: true, governance: true, observability: true, synchronization: ['REST telemetry', 'industrial execution envelope'] },
    { id: 'kuka', name: 'KUKA Robotics APIs', stackType: 'industrial-robotics-api', integrationReadiness: ['industrial workflow orchestration', 'smart factory coordination', 'robotic synchronization', 'industrial replayability', 'governance propagation'], orchestrationRole: 'CINTENT prepares metadata contracts for KUKA orchestration above KUKA robot APIs.', vla: false, edge: true, simulation: true, replay: true, governance: true, observability: true, synchronization: ['station synchronization', 'factory workflow replay'] },
    { id: 'fairino', name: 'Fairino APIs', stackType: 'cobotics-industrial-api', integrationReadiness: ['collaborative robotics', 'industrial coordination', 'distributed task propagation', 'replay-aware execution', 'governance-aware orchestration'], orchestrationRole: 'CINTENT coordinates collaborative/industrial cognition above Fairino APIs without replacing hardware control.', vla: false, edge: true, simulation: true, replay: true, governance: true, observability: true, synchronization: ['collaborative task propagation', 'industrial synchronization'] },
    { id: 'lynxmotion-lss', name: 'Lynxmotion Smart Servos (LSS)', stackType: 'servo-edge-api', integrationReadiness: ['actuator telemetry metadata', 'servo orchestration metadata', 'edge robotics synchronization', 'confidence propagation', 'distributed coordination'], orchestrationRole: 'CINTENT records servo and actuator telemetry as orchestration metadata; it does not implement low-level servo firmware.', vla: false, edge: true, simulation: false, replay: true, governance: true, observability: true, synchronization: ['edge servo telemetry', 'distributed actuator confidence'] },
    { id: 'flask-iot', name: 'Flask-based IoT / Embedded APIs', stackType: 'edge-rest-gateway', integrationReadiness: ['embedded robotics', 'edge gateways', 'IoT robotic coordination', 'lightweight orchestration bridges', 'local runtime integration', 'REST ingestion'], orchestrationRole: 'CINTENT ingests REST gateway events for edge robotic cognition and local runtime orchestration.', vla: false, edge: true, simulation: true, replay: true, governance: true, observability: true, synchronization: ['REST bridge', 'local edge gateway', 'IoT coordination'] }
];

const UAV_STANDARDS_COMPATIBILITY = [
    { id: 'astm-f3411', name: 'ASTM F3411 Remote ID', standardType: 'remote-id', readiness: ['broadcast Remote ID', 'network Remote ID', 'digital drone identity', 'remote discovery', 'fleet identity propagation', 'secure registration mapping'], governance: true, replay: true, observability: true, airspace: true, identity: true },
    { id: 'iso-21384-3', name: 'ISO 21384-3 UAS Operations', standardType: 'operations-safety', readiness: ['operational safety policies', 'mission governance', 'execution authorization', 'operational restrictions', 'escalation handling', 'autonomous flight governance'], governance: true, replay: true, observability: true, airspace: true, identity: false },
    { id: '3gpp-uav-rel17', name: '3GPP UAV Standards Release 17+', standardType: 'connectivity', readiness: ['5G drone communication', 'network-based drone identity', 'command and control metadata', 'low-latency edge coordination', 'distributed aerial telemetry', 'UAV edge orchestration'], governance: true, replay: true, observability: true, airspace: false, identity: true },
    { id: 'icao-utm', name: 'ICAO UTM Framework', standardType: 'utm-airspace', readiness: ['airspace coordination', 'UTM telemetry exchange', 'traffic-aware orchestration', 'airspace governance', 'mission conflict awareness', 'USS interoperability readiness'], governance: true, replay: true, observability: true, airspace: true, identity: true },
    { id: 'nato-stanag-4671', name: 'NATO STANAG 4671', standardType: 'airworthiness-readiness', readiness: ['mission governance', 'safety validation', 'operational compliance', 'distributed coordination', 'tactical orchestration awareness'], governance: true, replay: true, observability: true, airspace: true, identity: false, noCertificationClaim: true },
    { id: 'dgca-india-2021', name: 'DGCA India Drone Rules 2021', standardType: 'india-governance', readiness: ['DigitalSky integration readiness', 'UIN metadata mapping', 'NPNT orchestration readiness', 'Nano/Micro/Small/Medium/Large UAV categories', 'operational zone governance', 'Indian compliance metadata'], governance: true, replay: true, observability: true, airspace: true, identity: true },
    { id: 'easa-drone-framework', name: 'EASA Drone Regulatory Framework', standardType: 'eu-governance', readiness: ['operator registration metadata', 'open/specific/certified category governance', 'C-class drone metadata', 'operational authorization flows'], governance: true, replay: true, observability: true, airspace: true, identity: true },
    { id: 'ansi-uassc', name: 'ANSI UASSC Standards Alignment', standardType: 'interoperability-governance', readiness: ['standards compatibility', 'governance mapping', 'interoperability orchestration'], governance: true, replay: true, observability: true, airspace: true, identity: false },
    { id: 'mavlink', name: 'MAVLink Ecosystem', standardType: 'uav-telemetry-command', readiness: ['telemetry ingestion', 'command propagation metadata', 'distributed drone coordination', 'replay-aware mission execution', 'fleet telemetry synchronization', 'mission explainability', 'PX4/DroneKit/ArduPilot/ROS drone systems'], governance: true, replay: true, observability: true, airspace: false, identity: false }
];

const UAV_ECOSYSTEM_COMPATIBILITY = [
    { id: 'dji-sdk', name: 'DJI SDKs', ecosystemType: 'commercial-uav-sdk', readiness: ['DJI Mobile SDK orchestration', 'DJI Payload SDK readiness', 'payload telemetry', 'aerial sensor orchestration', 'mission replayability', 'explainable mission flows'], mavlink: false, edge: true, swarm: false },
    { id: 'px4', name: 'PX4', ecosystemType: 'autopilot', readiness: ['PX4 telemetry orchestration', 'MAVLink propagation', 'autonomous mission coordination', 'distributed aerial replay', 'edge synchronization'], mavlink: true, edge: true, swarm: true },
    { id: 'dronekit', name: 'DroneKit', ecosystemType: 'mission-scripting', readiness: ['DroneKit orchestration metadata', 'mission scripting integration', 'autonomous coordination', 'telemetry replay'], mavlink: true, edge: true, swarm: false },
    { id: 'ardupilot', name: 'ArduPilot', ecosystemType: 'autopilot', readiness: ['ArduPilot mission orchestration', 'telemetry synchronization', 'distributed fleet coordination', 'replay reconstruction', 'governance-aware execution'], mavlink: true, edge: true, swarm: true },
    { id: 'ros2-uav', name: 'ROS / ROS 2 Drone Systems', ecosystemType: 'robotics-middleware-uav', readiness: ['drone telemetry topics', 'aerial action orchestration', 'distributed UAV coordination', 'swarm propagation', 'edge synchronization'], mavlink: true, edge: true, swarm: true },
    { id: 'mavsdk', name: 'MAVSDK', ecosystemType: 'mavlink-sdk', readiness: ['MAVLink SDK orchestration', 'mission telemetry ingestion', 'fleet command metadata', 'edge replay synchronization'], mavlink: true, edge: true, swarm: true },
    { id: 'qgroundcontrol', name: 'QGroundControl Interoperability', ecosystemType: 'ground-control', readiness: ['mission plan interoperability', 'fleet telemetry visualization readiness', 'mission replay context', 'operator workflow metadata'], mavlink: true, edge: false, swarm: false },
    { id: 'edge-uav-runtime', name: 'Edge UAV Runtimes', ecosystemType: 'edge-aerial-runtime', readiness: ['low-latency orchestration', 'distributed edge telemetry', 'autonomous edge reasoning', 'aerial edge replay', 'offline synchronization recovery'], mavlink: true, edge: true, swarm: true }
];

const APPLICATION_REGISTRY = [
    {
        id: 'nyaynetra',
        name: 'NyayNetra',
        logoText: 'NN',
        positioning: 'Legal cognitive intelligence platform for explainable legal workflows, governance-aware orchestration, and judicial cognition assistance.',
        status: 'Enterprise Pilot',
        domains: ['legal', 'smart-governance'],
        tags: ['Legal', 'Governance', 'Explainability', 'Replay'],
        relatedApis: ['gov-validate', 'phase-intent', 'phase-domain'],
        orchestrationExamples: ['legal-intent-capture', 'policy-governance-check', 'explainability-trace', 'replay-package'],
        replayExamples: ['legal reasoning trace replay', 'governance intervention replay'],
        sdkReferences: ['rest', 'ts', 'py'],
        lifecycle: 'enterprise_pilot'
    },
    {
        id: 'blisstrail',
        name: 'BlissTrail',
        logoText: 'BT',
        positioning: 'Personalized cognitive travel orchestration platform using multimodal, replayable, and adaptive travel intelligence.',
        status: 'Active',
        domains: ['travel'],
        tags: ['Travel', 'Orchestration', 'Multimodal', 'Accessibility'],
        relatedApis: ['travel-intent', 'travel-decision', 'travel-emergency', 'phase-domain'],
        orchestrationExamples: ['travel-intent-graph', 'accessibility-aware-routing', 'emergency-handoff', 'itinerary-replay'],
        replayExamples: ['travel decision replay', 'accessibility route replay'],
        sdkReferences: ['rest', 'ts'],
        lifecycle: 'active'
    },
    {
        id: 'shunya-ai',
        name: 'Shunya-AI',
        logoText: 'SA',
        positioning: 'Multilingual cognitive communication infrastructure for speech, translation, contextual orchestration, and regional intelligence.',
        status: 'Beta',
        domains: ['multilingual', 'enterprise-workflow'],
        tags: ['Multilingual', 'Speech', 'Translation', 'Contextual Cognition'],
        relatedApis: ['phase-intent', 'cef-metadata', 'cef-execution'],
        orchestrationExamples: ['speech-intent-normalization', 'translation-context-routing', 'regional-cognition-loop'],
        replayExamples: ['multilingual context replay', 'speech routing replay'],
        sdkReferences: ['rest', 'ts', 'edge'],
        lifecycle: 'beta'
    },
    {
        id: 'chaxu',
        name: 'CHAXU',
        logoText: 'CX',
        positioning: 'Drone and autonomous systems cognitive infrastructure for distributed coordination, replayable operations, and mission orchestration.',
        status: 'Active',
        domains: ['drone', 'autonomous-systems'],
        tags: ['Drone', 'Autonomous Systems', 'Distributed Coordination', 'Edge Cognition'],
        relatedApis: ['drone-fleet', 'gov-validate', 'phase-routing'],
        orchestrationExamples: ['mission-orchestration', 'edge-synchronization', 'fleet-governance', 'operation-replay'],
        replayExamples: ['fleet mission replay', 'edge coordination replay'],
        sdkReferences: ['rest', 'ts', 'edge'],
        lifecycle: 'active'
    }
];

function recordAudit(type, user, detail) {
    const event = {
        id: `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        type,
        tenant: user && user.tenant ? user.tenant : 'anonymous',
        subject: user && user.sub ? user.sub : null,
        demo: Boolean(user && user.demo),
        detail,
        timestamp: new Date().toISOString()
    };
    auditEvents.unshift(event);
    if (auditEvents.length > 250) auditEvents.pop();
    return event;
}

function parseCookies(req) {
    const cookieHeader = req.headers.cookie || '';
    return cookieHeader.split(';').reduce((cookies, cookie) => {
        const [name, ...rest] = cookie.trim().split('=');
        if (!name) return cookies;
        cookies[name] = decodeURIComponent(rest.join('='));
        return cookies;
    }, {});
}

function getAuthToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    const cookies = parseCookies(req);
    return cookies[COOKIE_NAME];
}

function buildToken(payload, expiresIn = JWT_EXPIRES_IN) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function sendSessionCookie(res, token, expiresIn = JWT_EXPIRES_IN) {
    const maxAge = expiresIn === DEMO_EXPIRES_IN ? 1000 * 60 * 60 : 1000 * 60 * 60 * 2;
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'Lax',
        secure: NODE_ENV === 'production',
        maxAge
    });
}

function clearSessionCookie(res) {
    res.cookie(COOKIE_NAME, '', {
        httpOnly: true,
        sameSite: 'Lax',
        secure: NODE_ENV === 'production',
        maxAge: 0
    });
}

function authMiddleware(req, res, next) {
    const token = getAuthToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }
}

function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient role privileges' });
        }
        next();
    };
}

function requireNonDemo(req, res, next) {
    if (req.user && req.user.demo) {
        return res.status(403).json({ error: 'Demo users are not authorized for this operation' });
    }
    next();
}

function requireScopes(...scopes) {
    return (req, res, next) => {
        const grantedScopes = req.user && Array.isArray(req.user.scopes) ? req.user.scopes : [];
        const allowed = scopes.every(scope => grantedScopes.includes(scope));
        if (!allowed) {
            return res.status(403).json({ error: 'Required API scope is not available for this session' });
        }
        next();
    };
}

function normalizeTier(tier) {
    const value = String(tier || 'free').toLowerCase();
    return value === 'startup' ? 'professional' : value;
}

function tierRank(tier) {
    return TIER_RANK[normalizeTier(tier)] ?? TIER_RANK.free;
}

function getSessionEntitlement(user) {
    if (!user) {
        return { tier: 'anonymous', status: 'none', active: false, quota: '0', locked: true };
    }
    if (user.demo) {
        return { tier: 'demo', status: 'demo', active: true, quota: 'sandbox-only', locked: false };
    }
    const stored = subscriptions.get(user.sub || user.id);
    if (stored) return stored;
    return { tier: 'free', status: 'active', active: true, quota: '5k calls/month', locked: false };
}

function getPlanDefinition(tier) {
    return PLAN_DEFINITIONS.find(plan => plan.id === normalizeTier(tier)) || PLAN_DEFINITIONS.find(plan => plan.id === 'free');
}

function moneyAmount(value) {
    return Number(value || 0);
}

function formatMoney(value) {
    return `$${moneyAmount(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function addDays(days) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function buildInvoiceNumber(user, sample = false) {
    const tenantPart = String(user.tenant || 'tenant').replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || 'TENANT';
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${sample ? 'SAMPLE-' : ''}CVI-${tenantPart}-${datePart}-${suffix}`;
}

function buildBillingInvoice({ user, planId, apiIds = [], quoteType = 'invoice-preview', catalog = [] }) {
    const entitlement = getSessionEntitlement(user);
    const demo = Boolean(user.demo);
    const selectedPlan = getPlanDefinition(demo ? 'demo' : (planId || entitlement.tier || 'developer'));
    const subscribedPlan = getPlanDefinition(entitlement.tier);
    const chosenApis = apiIds.map(id => catalog.find(api => api.api_key === id || api.id === id)).filter(Boolean);
    const addonUnit = demo ? 0 : 49;
    const planAmount = demo ? 0 : moneyAmount(selectedPlan.price);
    const addons = chosenApis.map(api => ({
        id: api.api_key || api.id,
        name: api.name,
        domain: api.domain_key || domainKeyForApi(api),
        billingModel: api.pricing_visibility ? api.pricing_visibility.billing_model : 'Subscription add-on',
        quotaModel: api.rate_limit || api.quota_limit || 'Tenant quota policy',
        amount: addonUnit
    }));
    const tenantEvents = executionEvents.filter(event => event.tenant === user.tenant || !user.demo);
    const subtotal = planAmount + addons.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = 0;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    const invoice = {
        id: `inv-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        invoiceNumber: buildInvoiceNumber(user, demo),
        sample: demo,
        type: demo ? 'sample-invoice-preview' : quoteType,
        branding: {
            issuer: 'Cognivanta Labs',
            product: 'CINTENT Cognitive Infrastructure Platform',
            website: 'https://cognivantalabs.com',
            platform: 'https://api-cintent.cognivantalabs.com'
        },
        customer: {
            tenant: user.tenant,
            name: user.name || user.email || 'CINTENT workspace',
            email: user.email,
            workspaceType: demo ? 'Demo sandbox workspace' : 'Authenticated enterprise workspace'
        },
        subscription: {
            selectedPlan: selectedPlan.name,
            selectedTier: selectedPlan.id,
            currentPlan: subscribedPlan ? subscribedPlan.name : entitlement.tier,
            status: demo ? 'Demo Mode - no commercial billing active' : (entitlement.status || 'preview'),
            billingCycle: selectedPlan.billingCycle,
            paymentTerms: selectedPlan.paymentTerms,
            validityStart: new Date().toISOString(),
            validityEnd: entitlement.validUntil || addDays(30),
            renewalDate: entitlement.renewalDate || addDays(30),
            quota: selectedPlan.quota
        },
        lineItems: [
            {
                description: `${selectedPlan.name} subscription`,
                detail: selectedPlan.scope,
                quantity: 1,
                unitPrice: planAmount,
                amount: planAmount
            },
            ...addons.map(addon => ({
                description: addon.name,
                detail: `${addon.domain} API add-on | ${addon.quotaModel}`,
                quantity: 1,
                unitPrice: addon.amount,
                amount: addon.amount
            }))
        ],
        quotaSummary: {
            planQuota: selectedPlan.quota,
            apiAddOns: addons.length,
            orchestrationUsage: tenantEvents.length,
            replayUsage: tenantEvents.filter(event => event.replay && event.replay.replayId).length,
            balance: entitlement.balance || 0
        },
        totals: { subtotal, taxRate, tax, total },
        paymentStatus: demo ? 'Not payable - sample only' : 'Preview - payment not captured',
        issueDate: new Date().toISOString(),
        dueDate: demo ? null : addDays(15),
        taxNote: 'Tax calculation is future-ready and will be finalized through Stripe, Razorpay, or enterprise invoicing configuration.',
        authorization: {
            tenant: user.tenant,
            generatedFor: user.sub,
            exportAllowed: !demo,
            demoSafe: demo
        }
    };
    invoiceRecords.set(invoice.id, invoice);
    return invoice;
}

function renderInvoiceHtml(invoice) {
    const rows = invoice.lineItems.map(item => `
      <tr><td><strong>${item.description}</strong><div>${item.detail}</div></td><td>${item.quantity}</td><td>${formatMoney(item.unitPrice)}</td><td>${formatMoney(item.amount)}</td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>${invoice.sample ? 'Sample ' : ''}Invoice ${invoice.invoiceNumber}</title><style>
body{font-family:Arial,sans-serif;color:#111827;margin:0;background:#f5f7fb}.invoice{max-width:920px;margin:24px auto;background:#fff;border:1px solid #d8e0ea;padding:34px}.top{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #111827;padding-bottom:18px}.brand{display:flex;gap:14px;align-items:center}.mark{width:52px;height:52px;border-radius:10px;background:#111827;color:#fff;display:grid;place-items:center;font-weight:900}h1{margin:0;font-size:26px}h2{margin:24px 0 10px;font-size:15px;text-transform:uppercase;letter-spacing:.05em;color:#5f6b7a}p{margin:4px 0;color:#5f6b7a;line-height:1.45}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{text-align:left;border-bottom:1px solid #d8e0ea;padding:12px;vertical-align:top}th{color:#5f6b7a;font-size:12px;text-transform:uppercase}td div{color:#5f6b7a;font-size:12px;margin-top:4px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.summary{margin-left:auto;width:340px}.summary div{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #d8e0ea}.total{font-size:18px;font-weight:900;color:#111827}.badge{display:inline-block;border:1px solid #b9c7d6;border-radius:999px;padding:6px 10px;font-weight:800;background:#f8fafc}.sample{color:#9a5b00;background:#fff7e5;border-color:#f3cc84}.foot{margin-top:28px;padding-top:16px;border-top:1px solid #d8e0ea;font-size:12px;color:#5f6b7a}@media print{body{background:#fff}.invoice{border:0;margin:0;max-width:none}}
</style></head><body><main class="invoice"><section class="top"><div class="brand"><div class="mark">CL</div><div><h1>Cognivanta Labs</h1><p>CINTENT Cognitive Infrastructure Platform</p><p>https://api-cintent.cognivantalabs.com</p></div></div><div><span class="badge ${invoice.sample ? 'sample' : ''}">${invoice.sample ? 'Sample invoice' : 'Invoice preview'}</span><p><strong>${invoice.invoiceNumber}</strong></p><p>Issued ${invoice.issueDate.slice(0, 10)}</p><p>${invoice.paymentStatus}</p></div></section><section class="grid"><div><h2>Customer</h2><p><strong>${invoice.customer.name}</strong></p><p>${invoice.customer.email}</p><p>${invoice.customer.tenant}</p><p>${invoice.customer.workspaceType}</p></div><div><h2>Subscription</h2><p><strong>${invoice.subscription.selectedPlan}</strong></p><p>Status: ${invoice.subscription.status}</p><p>Cycle: ${invoice.subscription.billingCycle}</p><p>Validity: ${invoice.subscription.validityStart.slice(0, 10)} to ${invoice.subscription.validityEnd.slice(0, 10)}</p><p>Renewal: ${invoice.subscription.renewalDate.slice(0, 10)}</p></div></section><h2>Commercial line items</h2><table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><section class="summary"><div><span>Subtotal</span><strong>${formatMoney(invoice.totals.subtotal)}</strong></div><div><span>Taxes</span><strong>${formatMoney(invoice.totals.tax)}</strong></div><div class="total"><span>Total</span><strong>${formatMoney(invoice.totals.total)}</strong></div></section><section class="grid"><div><h2>Quota summary</h2><p>Plan quota: ${invoice.quotaSummary.planQuota}</p><p>API add-ons: ${invoice.quotaSummary.apiAddOns}</p><p>Orchestration usage: ${invoice.quotaSummary.orchestrationUsage}</p><p>Replay usage: ${invoice.quotaSummary.replayUsage}</p></div><div><h2>Operational notes</h2><p>${invoice.taxNote}</p><p>${invoice.sample ? 'Demo Mode is sandbox-only and cannot generate payable invoices.' : 'Payment capture is Stripe/Razorpay/enterprise-invoice ready.'}</p></div></section><div class="foot">Generated from tenant billing metadata, subscription policy, API add-ons, quota models, and CINTENT billing infrastructure. Raw backend payloads are not customer-facing invoice artifacts.</div></main></body></html>`;
}

function getAllowedDomains(user) {
    const entitlement = getSessionEntitlement(user);
    const domains = TIER_DOMAINS[normalizeTier(entitlement.tier)] || TIER_DOMAINS.free;
    return domains.includes('*') ? null : domains;
}

function getDomainAccess(domain, user) {
    if (domain.status === 'coming_soon') {
        return {
            visible: true,
            executable: false,
            status: 'coming_soon',
            label: 'Coming Soon',
            reason: 'Roadmap visibility is available; execution awaits domain release.'
        };
    }
    const allowed = getAllowedDomains(user);
    const hasAccess = !allowed || allowed.includes(domain.domain_key);
    return {
        visible: true,
        executable: hasAccess,
        status: hasAccess ? 'available' : 'upgrade_required',
        label: hasAccess ? 'Available' : 'Upgrade Required',
        reason: hasAccess
            ? 'Domain is available for this session entitlement.'
            : 'This domain requires a higher subscription tier or tenant provisioning.'
    };
}

function hasTier(user, requiredTier) {
    return tierRank(getSessionEntitlement(user).tier) >= tierRank(requiredTier);
}

function apiRequiredTier(api) {
    return normalizeTier(api.min_tier || 'developer');
}

function canExecuteApi(api, user, mode = 'sandbox') {
    const requiredTier = apiRequiredTier(api);
    if (user && user.demo) {
        return mode === 'sandbox' && requiredTier !== 'enterprise' && requiredTier !== 'professional';
    }
    if (mode === 'production' || mode === 'production-preview') {
        return hasTier(user, 'enterprise');
    }
    return hasTier(user, requiredTier);
}

function requireTier(requiredTier) {
    return (req, res, next) => {
        if (!hasTier(req.user, requiredTier)) {
            return res.status(403).json({
                error: 'Subscription tier required',
                requiredTier: normalizeTier(requiredTier),
                current: getSessionEntitlement(req.user),
                upgradePath: '/api/billing/activate'
            });
        }
        next();
    };
}

function getUserByEmail(email) {
    return Array.from(users.values()).find(user => user.email.toLowerCase() === email.toLowerCase());
}

function getUserById(id) {
    return users.get(id);
}

let authSchemaReady = false;
async function ensureAuthSchema() {
    if (!dbEnabled || authSchemaReady) return false;
    try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT \'user\'');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant VARCHAR DEFAULT \'enterprise-demo\'');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS scopes JSONB DEFAULT \'["read:api","search:api","execute:sandbox","ask:cognitive","read:replay"]\'::jsonb');
        authSchemaReady = true;
        return true;
    } catch (error) {
        console.warn('PostgreSQL auth schema unavailable, using in-memory auth fallback:', error.message);
        return false;
    }
}

function normalizeDbUser(row) {
    if (!row) return null;
    return {
        id: row.id,
        email: row.email,
        name: row.name || [row.first_name, row.last_name].filter(Boolean).join(' ') || 'CINTENT user',
        passwordHash: row.password_hash,
        role: row.role || 'user',
        emailVerified: !!row.email_verified,
        tenant: row.tenant || 'enterprise-demo',
        scopes: Array.isArray(row.scopes) ? row.scopes : ['read:api', 'search:api', 'execute:sandbox', 'ask:cognitive', 'read:replay']
    };
}

async function getUserByEmailAsync(email) {
    if (await ensureAuthSchema()) {
        const result = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
        return normalizeDbUser(result.rows[0]);
    }
    return getUserByEmail(email);
}

async function getUserByIdAsync(id) {
    if (await ensureAuthSchema()) {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return normalizeDbUser(result.rows[0]);
    }
    return getUserById(id);
}

async function createUserRecord({ email, passwordHash, name }) {
    if (await ensureAuthSchema()) {
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, name, role, email_verified, tenant, scopes)
             VALUES ($1, $2, $3, 'user', false, 'enterprise-demo', '["read:api","search:api","execute:sandbox","ask:cognitive","read:replay"]'::jsonb)
             RETURNING *`,
            [email, passwordHash, name || 'CINTENT user']
        );
        return normalizeDbUser(result.rows[0]);
    }
    const id = crypto.randomUUID();
    const user = {
        id,
        email,
        name: name || 'CINTENT user',
        passwordHash,
        role: 'user',
        emailVerified: false,
        tenant: 'enterprise-demo',
        scopes: ['read:api', 'search:api', 'execute:sandbox', 'ask:cognitive', 'read:replay'],
        createdAt: new Date().toISOString()
    };
    users.set(id, user);
    return user;
}

async function markUserVerified(id) {
    if (await ensureAuthSchema()) {
        const result = await pool.query('UPDATE users SET email_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
        return normalizeDbUser(result.rows[0]);
    }
    const user = getUserById(id);
    if (user) user.emailVerified = true;
    return user;
}

async function updateUserPassword(id, passwordHash) {
    if (await ensureAuthSchema()) {
        const result = await pool.query('UPDATE users SET password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id, passwordHash]);
        return normalizeDbUser(result.rows[0]);
    }
    const user = getUserById(id);
    if (user) user.passwordHash = passwordHash;
    return user;
}

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: [
        'https://api-cintent.cognivantalabs.com',
        'https://cintent.cognivantalabs.com',
        'https://cognivantalabs.com',
        'http://localhost:3000',
        'http://localhost:8080'
    ],
    credentials: true
}));

// Explicit CSP override to allow the PROD page inline script execution
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:; object-src 'none'; frame-ancestors 'self';");
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const prodHtmlPath = path.join(__dirname, 'public', 'CINTENT-PLATFORM-PROD.html');
function sendProdPage(res) {
    let html = fs.readFileSync(prodHtmlPath, 'utf8');
    if (!html.includes('<script src="/dynamic-metadata.js"></script>')) {
        html = html.replace('</body>', '  <script src="/dynamic-metadata.js"></script>\n</body>');
    }
    res.send(html);
}

const fallbackCatalog = [
    {
        api_key: 'phase-intent',
        name: 'Phase Intent Engine API',
        version: '1.0',
        short_description: 'Transforms raw user or system input into graph-native cognitive intent.',
        full_description: 'Intent cognition API that normalizes inputs, extracts intent, and returns a structured cognitive intent definition.',
        capabilities: ['intent', 'workflow', 'multimodal'],
        tags: ['intent', 'workflow', 'multimodal'],
        sdk_available: true,
        sdk_languages: ['ts', 'py', 'rest'],
        requires_authentication: true,
        min_tier: 'developer',
        quota_limit: '10000 requests/hour',
        rate_limit: '10000 requests/hour',
        endpoints: [{ method: 'POST', path: '/api/v1/cognitive/intent/parse', request_schema: { tenantId: 'string', input: 'object' }, response_schema: { status: 'ok', intent: 'object' } }],
        cognitive_dimensions: { intent: true, workflow: true },
        simulation_behavior: { primitive: 'intent-sim' },
        status_name: 'production',
        category_name: 'phase-core'
    },
    {
        api_key: 'phase-domain',
        name: 'Domain Taxonomy API',
        version: '1.0',
        short_description: 'Discovers supported domains, capabilities, inheritance, and composition constraints.',
        full_description: 'Domain taxonomy service for discovering API domains and cognitive capability maps.',
        capabilities: ['domain', 'taxonomy', 'composition'],
        tags: ['domain', 'taxonomy', 'composition'],
        sdk_available: true,
        sdk_languages: ['ts', 'py', 'rest'],
        requires_authentication: true,
        min_tier: 'developer',
        quota_limit: '10000 requests/hour',
        rate_limit: '10000 requests/hour',
        endpoints: [{ method: 'GET', path: '/api/v1/platform/domains/taxonomy', request_schema: { tenantId: 'string' }, response_schema: { domains: 'array' } }],
        cognitive_dimensions: { taxonomy: true },
        simulation_behavior: { primitive: 'domain-sim' },
        status_name: 'production',
        category_name: 'phase-core'
    },
    {
        api_key: 'travel-intent',
        name: 'Travel Intent Cognition API',
        version: '1.0',
        short_description: 'Builds hierarchical travel intent graphs without booking or provider execution.',
        full_description: 'Travel cognition API that generates a structured travel intent graph for higher-order orchestration.',
        capabilities: ['travel', 'accessibility', 'multimodal'],
        tags: ['travel', 'accessibility', 'multimodal'],
        sdk_available: true,
        sdk_languages: ['ts', 'py', 'rest'],
        requires_authentication: true,
        min_tier: 'startup',
        quota_limit: '5000 requests/hour',
        rate_limit: '5000 requests/hour',
        endpoints: [{ method: 'POST', path: '/api/v1/cognitive/travel/intent/parse', request_schema: { tenantId: 'string', travelDetails: 'object' }, response_schema: { status: 'ok', travelIntentGraph: 'object' } }],
        cognitive_dimensions: { travel: true },
        simulation_behavior: { primitive: 'travel-sim' },
        status_name: 'production',
        category_name: 'travel'
    },
    {
        api_key: 'drone-fleet',
        name: 'Drone Fleet Coordination API',
        version: '1.0',
        short_description: 'Coordinates drone fleet cognition, edge autonomy, safety policies, and replay traces.',
        full_description: 'Fleet coordination API for edge-aware drone operations with governance and replay support.',
        capabilities: ['drone', 'fleet', 'edge'],
        tags: ['drone', 'fleet', 'edge'],
        sdk_available: true,
        sdk_languages: ['ts', 'py', 'rest'],
        requires_authentication: true,
        min_tier: 'enterprise',
        quota_limit: '2500 requests/hour',
        rate_limit: '2500 requests/hour',
        endpoints: [{ method: 'POST', path: '/api/v1/cognitive/drone/fleet/coordinate', request_schema: { tenantId: 'string', fleetState: 'object' }, response_schema: { status: 'ok', coordinationPlan: 'object' } }],
        cognitive_dimensions: { drone: true },
        simulation_behavior: { primitive: 'drone-sim' },
        status_name: 'production',
        category_name: 'drone'
    },
    {
        api_key: 'gov-validate',
        name: 'Governance Validation API',
        version: '1.0',
        short_description: 'Validates cognitive artifacts against tenant, safety, industrial, healthcare, privacy, and workflow policies.',
        full_description: 'Governance validation service for policy, safety, and tenant-level compliance checks.',
        capabilities: ['governance', 'policy', 'audit'],
        tags: ['governance', 'policy', 'audit'],
        sdk_available: true,
        sdk_languages: ['ts', 'py', 'rest'],
        requires_authentication: true,
        min_tier: 'enterprise',
        quota_limit: '5000 requests/hour',
        rate_limit: '5000 requests/hour',
        endpoints: [{ method: 'POST', path: '/api/v1/cognitive/governance/validate', request_schema: { tenantId: 'string', artifact: 'object' }, response_schema: { status: 'ok', policyTrace: 'array' } }],
        cognitive_dimensions: { governance: true },
        simulation_behavior: { primitive: 'governance-sim' },
        status_name: 'production',
        category_name: 'governance'
    }
];

function getFallbackDependencies() {
    return fallbackCatalog.map(entry => ({
        api: entry.api_key,
        name: entry.name,
        depends_on: entry.dependencies || inferDependencies(entry)
    }));
}

function inferDependencies(entry) {
    const tags = new Set([...(entry.tags || []), ...(entry.capabilities || [])].map(value => String(value).toLowerCase()));
    const dependencies = ['phase-intent', 'phase-domain'];
    if (tags.has('governance') || tags.has('policy') || tags.has('audit')) dependencies.push('gov-validate');
    if (tags.has('drone') || tags.has('fleet') || tags.has('edge')) dependencies.push('gov-validate');
    if (tags.has('travel') || tags.has('accessibility')) dependencies.push('phase-domain');
    if (tags.has('robotics') || tags.has('robotic') || tags.has('cobotics') || tags.has('cobot')) dependencies.push('rbt-runtime-core', 'rbt-governance', 'rbt-replay', 'rbt-observability');
    if (tags.has('human-aware') || tags.has('human') || tags.has('proximity') || tags.has('collaboration') || tags.has('cobotics')) dependencies.push('rbt-human-aware-coordinate', 'rbt-safety-governance');
    if (tags.has('fleet') || tags.has('multi-robot') || tags.has('distributed') || tags.has('traffic')) dependencies.push('rbt-fleet-coordinate', 'rbt-distributed-coordinate');
    if (tags.has('edge') || tags.has('disconnected') || tags.has('recovery')) dependencies.push('rbt-edge-coordinate');
    if (tags.has('multimodal') || tags.has('sensor') || tags.has('vision') || tags.has('speech') || tags.has('telemetry') || tags.has('environmental')) dependencies.push('rbt-multimodal-cognition');
    if (tags.has('safety') || tags.has('collision') || tags.has('restricted-zone') || tags.has('override') || tags.has('fail-safe')) dependencies.push('rbt-safety-governance');
    if (tags.has('digital-twin') || tags.has('simulation')) dependencies.push('rbt-digital-twin-interface');
    return [...new Set(dependencies.filter(apiKey => apiKey !== entry.api_key))];
}

function enrichMetadata(entry) {
    const endpoint = Array.isArray(entry.endpoints) ? entry.endpoints[0] || {} : {};
    const domain = entry.category_name || 'platform';
    const lifecycle = entry.lifecycle_state || entry.status_name || 'production';
    const governanceSupport = entry.governance_support || (entry.capabilities || []).some(cap => String(cap).toLowerCase().includes('governance') || String(cap).toLowerCase().includes('policy'));
    const replaySupport = entry.replay_support || (entry.capabilities || []).some(cap => String(cap).toLowerCase().includes('replay') || ['drone', 'governance', 'travel'].includes(String(cap).toLowerCase()));
    const domainKey = entry.domain_key || domainKeyForApi(entry);
    const domainRoadmap = getDomainRoadmap().find(domain => domain.domain_key === domainKey);
    return {
        ...entry,
        domain_key: domainKey,
        domain_title: domainRoadmap ? domainRoadmap.title : domain,
        domain_status: domainRoadmap ? domainRoadmap.status : 'operational',
        roadmap: domainRoadmap || null,
        lifecycle_state: lifecycle,
        dependencies: entry.dependencies || inferDependencies(entry),
        governance_support: governanceSupport,
        replay_support: replaySupport,
        replay_examples: entry.replay_examples || [
            `Replay ${entry.api_key}: reconstruct request envelope, cognitive graph state, governance checkpoints, confidence deltas, and response artifact.`
        ],
        orchestration_examples: entry.orchestration_examples || [
            `Orchestrate ${entry.api_key}: authenticate tenant, resolve domain, execute sandbox cognition, propagate governance, capture replay, return explainability envelope.`
        ],
        explainability_examples: entry.explainability_examples || [
            `Explain ${entry.api_key}: show why the selected option ranked highest, where governance intervened, and how confidence changed by stage.`
        ],
        operational_notes: entry.operational_notes || `Use ${entry.name} through sandbox first. Production access requires tenant entitlement, quota activation, replay authorization, and governance policy review.`,
        pricing_visibility: entry.pricing_visibility || {
            min_tier: entry.min_tier,
            quota_limit: entry.quota_limit,
            billing_model: entry.min_tier === 'enterprise' ? 'Enterprise entitlement' : 'Usage and subscription ready'
        },
        sdk_examples: entry.sdk_examples || {
            ts: `await cintent.execute({ api: "${entry.api_key}", mode: "sandbox" });`,
            py: `client.execute(api="${entry.api_key}", mode="sandbox")`,
            rest: `${endpoint.method || 'POST'} ${endpoint.path || '/api/unknown'}`
        },
        documentation_source: 'api-metadata-registry',
        rag_context: [
            entry.name,
            entry.short_description,
            entry.full_description,
            domain,
            domainKey,
            domainRoadmap ? JSON.stringify(domainRoadmap) : '',
            lifecycle,
            ...(entry.tags || []),
            ...(entry.capabilities || []),
            JSON.stringify(endpoint),
            governanceSupport ? 'governance policy tenant isolation audit' : '',
            replaySupport ? 'replay deterministic trace confidence lineage' : ''
        ].join(' ')
    };
}

function getFallbackCatalog() {
    const metadataRegistryPath = path.join(__dirname, 'api-metadata-registry.json');
    try {
        const registry = JSON.parse(fs.readFileSync(metadataRegistryPath, 'utf8'));
        const registryApis = Array.isArray(registry.apis) ? registry.apis : [];
        if (registryApis.length) {
            return registryApis.map(enrichMetadata);
        }
    } catch (error) {
        console.warn('Backend metadata registry load failed:', error.message);
    }
    return fallbackCatalog.map(enrichMetadata);
}

function loadMetadataRegistry() {
    const metadataRegistryPath = path.join(__dirname, 'api-metadata-registry.json');
    try {
        return JSON.parse(fs.readFileSync(metadataRegistryPath, 'utf8'));
    } catch (error) {
        console.warn('Backend metadata registry load failed:', error.message);
        return { apis: fallbackCatalog, domains: [] };
    }
}

function getDomainRoadmap() {
    const registry = loadMetadataRegistry();
    return Array.isArray(registry.domains) ? registry.domains : [];
}

function domainKeyForApi(api) {
    const category = String(api.category_name || '').toLowerCase();
    if (category === 'travel') return 'travel';
    if (category === 'drone' || category === 'drone-ops') return 'drone';
    if (category === 'robotics') return 'robotics';
    if (category === 'cobotics') return 'cobotics';
    if (category === 'governance') return 'smart-governance';
    if (category === 'iot-smart-infrastructure' || category === 'smart-infrastructure') return 'iot-smart-infrastructure';
    return 'enterprise-workflow';
}

function applySessionPolicy(api, user) {
    const minTier = apiRequiredTier(api);
    const entitlement = getSessionEntitlement(user);
    const demoRestricted = Boolean(user && user.demo && (minTier === 'enterprise' || minTier === 'professional'));
    const executableSandbox = canExecuteApi(api, user, 'sandbox');
    const executableProduction = canExecuteApi(api, user, 'production-preview');
    return {
        ...api,
        domain_key: api.domain_key || domainKeyForApi(api),
        domain_status: api.domain_status || (getDomainRoadmap().find(domain => domain.domain_key === (api.domain_key || domainKeyForApi(api))) || {}).status || 'operational',
        access_policy: {
            session_type: user && user.demo ? 'demo' : 'authenticated',
            tenant: user && user.tenant ? user.tenant : 'unknown',
            scopes: user && Array.isArray(user.scopes) ? user.scopes : [],
            entitlement,
            required_tier: minTier,
            locked: !executableSandbox,
            can_execute_sandbox: executableSandbox,
            can_execute_production: executableProduction,
            demo_restricted: demoRestricted,
            allowed_modes: user && user.demo ? ['sandbox'] : ['sandbox', 'simulated', 'production-preview'],
            note: demoRestricted
                ? 'Demo Mode can view documentation but cannot execute professional or enterprise APIs.'
                : executableSandbox
                    ? 'Session can use documentation and permitted sandbox/simulated execution paths.'
                    : `Upgrade to ${minTier} to execute this API. Documentation remains visible.`
        }
    };
}

function normalizeApiRow(row) {
    return {
        api_key: row.api_key,
        domain_key: row.domain_key,
        name: row.name,
        version: row.version || '1.0',
        short_description: row.short_description,
        full_description: row.full_description,
        capabilities: Array.isArray(row.capabilities) ? row.capabilities : (typeof row.capabilities === 'string' ? row.capabilities.split(',').map(t => t.trim()) : []),
        tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? row.tags.split(',').map(t => t.trim()) : []),
        sdk_available: row.sdk_available,
        sdk_languages: row.sdk_languages,
        requires_authentication: row.requires_authentication,
        min_tier: row.min_tier,
        quota_limit: row.quota_limit,
        rate_limit: row.rate_limit,
        endpoints: row.endpoints,
        cognitive_dimensions: row.cognitive_dimensions,
        simulation_behavior: row.simulation_behavior,
        status_name: row.status_name,
        category_name: row.category_name,
        lifecycle_state: row.lifecycle_state || row.status_name || 'production',
        dependencies: row.dependencies || [],
        explainability_examples: row.explainability_examples || [],
        operational_notes: row.operational_notes || '',
        replay_support: row.replay_support || false,
        governance_support: row.governance_support || false
    };
}

async function loadCatalogEntries() {
    if (!dbEnabled) {
        return getFallbackCatalog();
    }

    const query = `
        SELECT am.api_key, am.name, am.version, am.short_description, am.full_description,
               am.capabilities, am.tags, am.sdk_available, am.sdk_languages,
               am.requires_authentication, am.min_tier, am.quota_limit, am.rate_limit,
               am.endpoints, am.cognitive_dimensions, am.simulation_behavior,
               am.lifecycle_state, am.dependencies, am.explainability_examples,
               am.operational_notes, am.replay_support, am.governance_support,
               s.name AS status_name, c.name AS category_name
        FROM api_metadata am
        LEFT JOIN api_statuses s ON am.status_id = s.id
        LEFT JOIN api_categories c ON am.category_id = c.id
    `;

    const result = await pool.query(query);
    const dbCatalog = result.rows.map(normalizeApiRow);
    const registry = loadMetadataRegistry();
    const registryApis = Array.isArray(registry.apis) ? registry.apis : [];
    const merged = new Map(dbCatalog.map(api => [api.api_key, api]));
    registryApis.forEach(api => merged.set(api.api_key, { ...merged.get(api.api_key), ...api }));
    return Array.from(merged.values()).map(enrichMetadata);
}

function searchApiCatalog(catalog, filters) {
    const { q = '', domain, stage, governance, replay, sdk, lifecycle } = filters;
    const query = String(q || '').trim().toLowerCase();
    const queryTerms = tokenizeQuery(query);
    return catalog.filter(api => {
        const matchesDomain = !domain || api.category_name === domain || api.category_name.toLowerCase() === domain.toLowerCase() || api.capabilities.some(cap => cap.toLowerCase() === domain.toLowerCase());
        const matchesStage = !stage || api.status_name === stage || api.lifecycle_state === stage;
        const matchesGovernance = governance ? api.capabilities.some(cap => cap.toLowerCase().includes('governance')) || api.governance_support : true;
        const matchesReplay = replay ? api.replay_support || api.capabilities.some(cap => cap.toLowerCase().includes('replay')) : true;
        const matchesSdk = sdk ? (Array.isArray(api.sdk_languages) ? api.sdk_languages.includes(sdk) : false) : true;
        const matchesLifecycle = lifecycle ? api.lifecycle_state === lifecycle : true;
        const haystack = [
            api.name,
            api.short_description,
            api.full_description,
            api.tags.join(' '),
            api.capabilities.join(' '),
            api.category_name,
            api.status_name,
            api.lifecycle_state,
            api.operational_notes,
            api.rag_context,
            JSON.stringify(api.replay_examples || []),
            JSON.stringify(api.orchestration_examples || []),
            JSON.stringify(api.explainability_examples || []),
            JSON.stringify(api.dependencies || []),
            JSON.stringify(api.sdk_examples || {}),
            (api.endpoints || []).map(e => `${e.method} ${e.path} ${JSON.stringify(e.request_schema)} ${JSON.stringify(e.response_schema)}`).join(' ')
        ].join(' ').toLowerCase();
        const matchesQuery = !queryTerms.length || queryTerms.some(token => haystack.includes(token));
        return matchesDomain && matchesStage && matchesGovernance && matchesReplay && matchesSdk && matchesLifecycle && matchesQuery;
    });
}

function tokenizeQuery(query) {
    const stopwords = new Set(['show', 'which', 'what', 'how', 'the', 'and', 'or', 'with', 'for', 'about', 'api', 'apis', 'compare', 'between', 'me']);
    return String(query || '')
        .toLowerCase()
        .split(/\s+/)
        .map(token => token.replace(/[^a-z0-9-]/g, ''))
        .filter(token => token && !stopwords.has(token));
}

function buildDomainPayload(catalog, user) {
    const counts = catalog.reduce((map, api) => {
        const key = api.domain_key || domainKeyForApi(api);
        map[key] = (map[key] || 0) + 1;
        return map;
    }, {});
    return getDomainRoadmap().map(domain => {
        const access = getDomainAccess(domain, user);
        return {
            ...domain,
            api_count: counts[domain.domain_key] || 0,
            executable: access.executable,
            access,
            session_type: user && user.demo ? 'demo' : 'authenticated',
            entitlement: getSessionEntitlement(user)
        };
    });
}

function searchDomains(domains, query) {
    const tokens = tokenizeQuery(query);
    if (!tokens.length) return domains;
    return domains
        .map(domain => {
        const haystack = [
            domain.title,
            domain.nav_title,
            domain.status,
            domain.vision,
            domain.roadmap_visibility,
            ...(domain.planned_capabilities || []),
            ...(domain.future_api_categories || []),
            ...(domain.orchestration_areas || []),
            ...(domain.enterprise_use_cases || [])
        ].join(' ').toLowerCase();
        const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
        return { domain, score };
    })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.domain);
}

function searchApplications(query) {
    const tokens = tokenizeQuery(query);
    if (!tokens.length) return APPLICATION_REGISTRY;
    return APPLICATION_REGISTRY
        .map(app => {
            const haystack = [
                app.name,
                app.positioning,
                app.status,
                app.lifecycle,
                ...(app.domains || []),
                ...(app.tags || []),
                ...(app.relatedApis || []),
                ...(app.orchestrationExamples || []),
                ...(app.replayExamples || []),
                ...(app.sdkReferences || [])
            ].join(' ').toLowerCase();
            const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
            return { app, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.app);
}

function isRoboticsRuntimeApi(api) {
    const domain = api.domain_key || domainKeyForApi(api);
    const text = [domain, api.category_name, api.name, api.short_description, api.full_description, ...(api.tags || []), ...(api.capabilities || [])].join(' ').toLowerCase();
    return ['robotics', 'cobotics'].includes(domain) || text.includes('robotic') || text.includes('cobotic') || text.includes('human-aware');
}

function isCoboticsRuntimeApi(api) {
    const domain = api.domain_key || domainKeyForApi(api);
    const text = [domain, api.category_name, api.name, api.short_description, api.full_description, ...(api.tags || []), ...(api.capabilities || [])].join(' ').toLowerCase();
    return domain === 'cobotics' || text.includes('cobotic') || text.includes('collaborative') || text.includes('shared workspace') || text.includes('operator') || text.includes('human-robot');
}

function isHriRuntimeApi(api) {
    const domain = api.domain_key || domainKeyForApi(api);
    const text = [domain, api.api_key, api.category_name, api.name, api.short_description, api.full_description, ...(api.tags || []), ...(api.capabilities || [])].join(' ').toLowerCase();
    return text.includes('hri') || text.includes('human-robot interaction') || text.includes('human intent') || text.includes('multimodal interaction') || text.includes('trust confidence') || text.includes('behavioral signal') || text.includes('emotion') || text.includes('override governance') || text.includes('interaction replay') || text.includes('human escalation');
}

function isIndustrialRoboticsRuntimeApi(api) {
    const domain = api.domain_key || domainKeyForApi(api);
    const text = [domain, api.api_key, api.category_name, api.name, api.short_description, api.full_description, ...(api.tags || []), ...(api.capabilities || [])].join(' ').toLowerCase();
    return text.includes('irobot') || text.includes('industrial') || text.includes('manufacturing') || text.includes('factory') || text.includes('assembly') || text.includes('production') || text.includes('predictive coordination');
}

function normalizeEcosystemId(value) {
    const key = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const aliases = {
        ros: 'ros2',
        'ros-2': 'ros2',
        isaac: 'nvidia-isaac',
        'isaac-sdk': 'nvidia-isaac',
        'isaac-sim': 'nvidia-isaac',
        gemini: 'gemini-robotics',
        abb: 'abb-rws',
        rws: 'abb-rws',
        'abb-robot-web-services': 'abb-rws',
        lss: 'lynxmotion-lss',
        lynxmotion: 'lynxmotion-lss',
        flask: 'flask-iot',
        iot: 'flask-iot'
    };
    return aliases[key] || key;
}

function resolveRoboticsEcosystems(api, input = {}, governanceContext = {}) {
    const requested = [
        input.roboticsEcosystem,
        input.ecosystem,
        input.stack,
        governanceContext.roboticsEcosystem,
        governanceContext.ecosystem,
        ...(Array.isArray(input.roboticsEcosystems) ? input.roboticsEcosystems : []),
        ...(Array.isArray(input.ecosystems) ? input.ecosystems : [])
    ].filter(Boolean).map(normalizeEcosystemId);
    const metadataIds = [
        ...((api.compatibility_contract && api.compatibility_contract.supported_ecosystems) || []),
        ...((api.compatibility_contract && api.compatibility_contract.stack_types) || [])
    ].map(normalizeEcosystemId);
    const text = [api.api_key, api.name, api.short_description, api.full_description, ...(api.tags || []), ...(api.capabilities || [])].join(' ').toLowerCase();
    const inferred = ROBOTICS_ECOSYSTEM_COMPATIBILITY
        .filter(item => text.includes(item.id) || text.includes(item.name.toLowerCase()) || (item.id === 'gemini-robotics' && text.includes('vla')) || (item.id === 'nvidia-isaac' && text.includes('isaac')))
        .map(item => item.id);
    const ids = [...new Set([...requested, ...metadataIds, ...inferred])];
    return ROBOTICS_ECOSYSTEM_COMPATIBILITY.filter(item => ids.includes(item.id));
}

function isUavRuntimeApi(api) {
    const domain = api.domain_key || domainKeyForApi(api);
    const text = [domain, api.api_key, api.category_name, api.name, api.short_description, api.full_description, ...(api.tags || []), ...(api.capabilities || [])].join(' ').toLowerCase();
    return domain === 'drone' || text.includes('drone') || text.includes('uav') || text.includes('aerial') || text.includes('mavlink') || text.includes('utm') || text.includes('remote id');
}

function normalizeUavCompatibilityId(value) {
    const key = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const aliases = {
        remoteid: 'astm-f3411',
        'remote-id': 'astm-f3411',
        astm: 'astm-f3411',
        iso: 'iso-21384-3',
        'iso-21384': 'iso-21384-3',
        '3gpp': '3gpp-uav-rel17',
        utm: 'icao-utm',
        icao: 'icao-utm',
        stanag: 'nato-stanag-4671',
        nato: 'nato-stanag-4671',
        dgca: 'dgca-india-2021',
        digitalsky: 'dgca-india-2021',
        npnt: 'dgca-india-2021',
        easa: 'easa-drone-framework',
        ansi: 'ansi-uassc',
        qgc: 'qgroundcontrol',
        ros: 'ros2-uav',
        ros2: 'ros2-uav',
        dji: 'dji-sdk',
        edge: 'edge-uav-runtime'
    };
    return aliases[key] || key;
}

function resolveUavStandards(api, input = {}, governanceContext = {}) {
    const requested = [
        input.uavStandard,
        input.uavCompliance,
        governanceContext.uavStandard,
        governanceContext.uavCompliance,
        ...(Array.isArray(input.uavStandards) ? input.uavStandards : [])
    ].filter(Boolean).map(normalizeUavCompatibilityId);
    const metadataIds = ((api.uav_compliance_contract && api.uav_compliance_contract.standards) || []).map(normalizeUavCompatibilityId);
    const text = [api.api_key, api.name, api.short_description, api.full_description, ...(api.tags || []), ...(api.capabilities || [])].join(' ').toLowerCase();
    const inferred = UAV_STANDARDS_COMPATIBILITY
        .filter(item => text.includes(item.id) || text.includes(item.name.toLowerCase()) || (item.id === 'mavlink' && text.includes('mavlink')) || (item.id === 'dgca-india-2021' && (text.includes('dgca') || text.includes('npnt') || text.includes('digitalsky'))))
        .map(item => item.id);
    const defaults = isUavRuntimeApi(api) ? ['astm-f3411', 'iso-21384-3', 'icao-utm', 'dgca-india-2021', 'easa-drone-framework', 'mavlink'] : [];
    const ids = [...new Set([...defaults, ...requested, ...metadataIds, ...inferred])];
    return UAV_STANDARDS_COMPATIBILITY.filter(item => ids.includes(item.id));
}

function resolveUavEcosystems(api, input = {}, governanceContext = {}) {
    const requested = [
        input.uavEcosystem,
        input.droneEcosystem,
        governanceContext.uavEcosystem,
        ...(Array.isArray(input.uavEcosystems) ? input.uavEcosystems : []),
        ...(Array.isArray(input.droneEcosystems) ? input.droneEcosystems : [])
    ].filter(Boolean).map(normalizeUavCompatibilityId);
    const metadataIds = ((api.uav_compliance_contract && api.uav_ecosystems) || []).map(normalizeUavCompatibilityId);
    const text = [api.api_key, api.name, api.short_description, api.full_description, ...(api.tags || []), ...(api.capabilities || [])].join(' ').toLowerCase();
    const inferred = UAV_ECOSYSTEM_COMPATIBILITY
        .filter(item => text.includes(item.id) || text.includes(item.name.toLowerCase()) || (item.id === 'px4' && text.includes('px4')) || (item.id === 'ardupilot' && text.includes('ardupilot')) || (item.id === 'dji-sdk' && text.includes('dji')))
        .map(item => item.id);
    const defaults = isUavRuntimeApi(api) ? ['mavsdk', 'px4', 'ardupilot', 'ros2-uav', 'edge-uav-runtime'] : [];
    const ids = [...new Set([...defaults, ...requested, ...metadataIds, ...inferred])];
    return UAV_ECOSYSTEM_COMPATIBILITY.filter(item => ids.includes(item.id));
}

function roboticsGovernanceEvents(stage, api, governanceContext = {}) {
    const policy = governanceContext.policy || governanceContext.governanceLevel || 'robotics-runtime-default';
    const stageId = stage[0];
    if (isHriRuntimeApi(api)) {
        const base = { policy, status: 'passed', api: api.api_key, runtime: 'human-override-governance-runtime', humanFirst: true, tenantBoundary: 'collaboration-isolated' };
        if (stageId.includes('override') || stageId.includes('escalation')) {
            return [{ ...base, intervention: 'human-override-and-escalation-governance', overrideAuthority: 'validated', escalationRoute: 'prepared', explainability: 'required' }];
        }
        if (stageId.includes('safety') || stageId.includes('proximity') || stageId.includes('restricted')) {
            return [{ ...base, intervention: 'collaborative-safety-propagation', proximityGovernance: 'active', restrictedAction: 'validated', safetyReplay: 'enabled' }];
        }
        return [{ ...base, intervention: 'human-intent-and-trust-governance', trustAware: true, interactionBoundary: 'approved' }];
    }
    if (isIndustrialRoboticsRuntimeApi(api)) {
        const base = { policy, status: 'passed', api: api.api_key, runtime: 'industrial-governance-runtime', complianceGovernance: true, tenantBoundary: 'factory-isolated' };
        if (stageId.includes('anomaly')) return [{ ...base, intervention: 'industrial-anomaly-escalation', anomalyPropagation: 'captured', recoveryRoute: 'prepared' }];
        if (stageId.includes('halt') || stageId.includes('shutdown') || stageId.includes('governance') || stageId.includes('restricted')) return [{ ...base, intervention: 'industrial-safety-restricted-operation-governance', emergencyShutdown: 'ready', productionHalt: 'propagatable', compliance: 'validated' }];
        return [{ ...base, intervention: 'factory-governance-enforcement', restrictedOperation: 'validated' }];
    }
    if (isCoboticsRuntimeApi(api)) {
        const base = { policy, status: 'passed', api: api.api_key, runtime: 'collaborative-safety-governance-runtime', humanFirst: true, tenantBoundary: 'enforced' };
        if (stageId.includes('human') || stageId.includes('operator') || stageId.includes('intent')) {
            return [{ ...base, intervention: 'operator-authority-and-proximity-governance', proximityGovernance: 'active', operatorAuthority: 'preferred' }];
        }
        if (stageId.includes('safety') || stageId.includes('failsafe') || stageId.includes('override')) {
            return [{ ...base, intervention: 'collaborative-safety-escalation', collisionGovernance: 'active', restrictedZone: 'validated', emergencyOverride: 'propagated', failSafe: 'armed' }];
        }
        return [{ ...base, intervention: 'human-first-collaboration-policy', collaborativeScope: 'approved' }];
    }
    if (!isRoboticsRuntimeApi(api)) {
        return [{ policy, status: 'passed', intervention: api.governance_support ? 'policy-check' : 'tenant-isolation' }];
    }
    const base = { policy, status: 'passed', api: api.api_key, runtime: 'robotics-governance-runtime' };
    if (stageId.includes('human') || stageId.includes('collaborative')) {
        return [{ ...base, intervention: 'human-aware-governance', safetyBoundary: 'shared-workspace', overrideReady: true }];
    }
    if (stageId.includes('safety') || stageId.includes('failsafe')) {
        return [{ ...base, intervention: 'safety-collision-restricted-zone-check', collisionGovernance: 'clear', emergencyOverride: 'armed', escalation: 'not-required' }];
    }
    if (stageId.includes('governance') || stageId.includes('policy')) {
        return [{ ...base, intervention: 'robotics-policy-propagation', restrictedZone: 'validated', tenantBoundary: 'enforced' }];
    }
    return [{ ...base, intervention: 'robotics-runtime-governance-check', tenantBoundary: 'enforced' }];
}

function roboticsReplayEvents(stage, api, startedAt) {
    const replayId = `replay-${api.api_key}-${startedAt}`;
    if (isHriRuntimeApi(api)) {
        return [{
            replayId,
            snapshot: `${stage[0]}-hri-runtime-snapshot`,
            deterministic: true,
            runtime: 'cognitive-interaction-replay-runtime',
            captures: ['interaction-replay', 'decision-replay', 'collaboration-reconstruction', 'human-override-replay', 'explainable-coordination', 'confidence-replay']
        }];
    }
    if (isIndustrialRoboticsRuntimeApi(api)) {
        return [{
            replayId,
            snapshot: `${stage[0]}-industrial-runtime-snapshot`,
            deterministic: true,
            runtime: 'industrial-replay-runtime',
            captures: ['execution-replay', 'production-replay', 'synchronization-replay', 'governance-replay', 'anomaly-replay', 'explainability-replay']
        }];
    }
    if (isCoboticsRuntimeApi(api)) {
        return [{
            replayId,
            snapshot: `${stage[0]}-collaborative-runtime-snapshot`,
            deterministic: true,
            runtime: 'collaborative-replay-runtime',
            captures: ['collaborative-replay', 'human-robot-decision-replay', 'governance-replay', 'synchronization-replay', 'explainability-replay']
        }];
    }
    if (!isRoboticsRuntimeApi(api)) {
        return [{ replayId, snapshot: `${stage[0]}-snapshot`, deterministic: true }];
    }
    return [{
        replayId,
        snapshot: `${stage[0]}-robotics-runtime-snapshot`,
        deterministic: true,
        runtime: 'robotics-replay-runtime',
        captures: ['orchestration-replay', 'governance-replay', 'execution-reconstruction', 'confidence-replay', 'synchronization-replay']
    }];
}

function confidenceDeltaForStage(stage, api) {
    if (!isRoboticsRuntimeApi(api)) return stage[2] === 'governance-check' ? -0.015 : 0.045;
    if (isHriRuntimeApi(api)) {
        if (stage[2] === 'ambiguity-resolution') return -0.032;
        if (stage[2] === 'override-governance' || stage[2] === 'safety-validation') return -0.034;
        if (stage[2] === 'trust-scoring') return 0.018;
        if (stage[2] === 'contextual-adaptation' || stage[2] === 'adaptive-collaboration') return 0.031;
        if (stage[2] === 'multimodal-capture' || stage[2] === 'interaction-interpretation') return 0.036;
        return 0.029;
    }
    if (isIndustrialRoboticsRuntimeApi(api)) {
        if (stage[2] === 'governance-validating') return -0.026;
        if (stage[2] === 'anomaly-detecting') return -0.04;
        if (stage[2] === 'synchronizing-factory') return 0.031;
        if (stage[2] === 'balancing-production') return 0.024;
        if (stage[2] === 'initializing-production') return 0.038;
        return 0.03;
    }
    if (isCoboticsRuntimeApi(api)) {
        if (stage[2] === 'governance-validation' || stage[2] === 'governance-check') return -0.028;
        if (stage[2] === 'synchronizing-intent') return 0.034;
        if (stage[2] === 'adaptive-balancing') return 0.022;
        if (stage[2] === 'safety-paused') return -0.05;
        if (stage[2] === 'collaborative-planning') return 0.04;
        return 0.032;
    }
    if (stage[2] === 'governance-check') return -0.022;
    if (stage[2] === 'synchronizing') return 0.026;
    if (stage[2] === 'replay-capturing') return 0.018;
    if (stage[2] === 'coordinating') return 0.041;
    return 0.035;
}

function buildRoboticsRuntimeTelemetry(planOrRuntime, source = 'execution') {
    const stages = planOrRuntime && planOrRuntime.stages ? planOrRuntime.stages : [];
    const confidence = planOrRuntime && planOrRuntime.confidenceTimeline ? planOrRuntime.confidenceTimeline : [];
    const sync = planOrRuntime && planOrRuntime.distributedSynchronization ? planOrRuntime.distributedSynchronization : [];
    const governance = planOrRuntime && planOrRuntime.governancePropagation ? planOrRuntime.governancePropagation : [];
    const replay = planOrRuntime && planOrRuntime.replayPropagation ? planOrRuntime.replayPropagation : [];
    const finalConfidence = confidence.length ? (confidence[confidence.length - 1].after || confidence[confidence.length - 1].score || 0) : 0;
    const firstConfidence = confidence.length ? (confidence[0].before || confidence[0].score || 0) : 0;
    return {
        source,
        runtime_services: ROBOTICS_RUNTIME_SERVICES.map(service => service.id),
        orchestration_latency_ms: stages.reduce((sum, stage) => sum + (stage.durationMs || 0), 0),
        synchronization_health: sync.some(event => event.status === 'degraded') ? 'degraded' : 'healthy',
        synchronization_events: sync.length,
        replay_events: replay.length,
        governance_interventions: governance.length,
        ecosystem_compatibility: planOrRuntime.ecosystemCompatibility ? planOrRuntime.ecosystemCompatibility.length : 0,
        execution_anomalies: stages.filter(stage => stage.liveState === 'degraded' || stage.state === 'degraded' || stage.anomaly).length,
        confidence_drift: Number((finalConfidence - firstConfidence).toFixed(3)),
        final_confidence: Number(finalConfidence.toFixed ? finalConfidence.toFixed(3) : finalConfidence),
        robotic_coordination_activity: stages.filter(stage => ['coordinating', 'synchronizing', 'governance-check', 'replay-capturing'].includes(stage.runtimeState || stage.state)).length
    };
}

function buildCoboticsRuntimeTelemetry(planOrRuntime, source = 'execution') {
    const stages = planOrRuntime && planOrRuntime.stages ? planOrRuntime.stages : [];
    const confidence = planOrRuntime && planOrRuntime.confidenceTimeline ? planOrRuntime.confidenceTimeline : [];
    const sync = planOrRuntime && planOrRuntime.distributedSynchronization ? planOrRuntime.distributedSynchronization : [];
    const governance = planOrRuntime && planOrRuntime.governancePropagation ? planOrRuntime.governancePropagation : [];
    const replay = planOrRuntime && planOrRuntime.replayPropagation ? planOrRuntime.replayPropagation : [];
    const finalConfidence = confidence.length ? (confidence[confidence.length - 1].after || confidence[confidence.length - 1].score || 0) : 0;
    const firstConfidence = confidence.length ? (confidence[0].before || confidence[0].score || 0) : 0;
    const stageText = stages.map(stage => `${stage.id || ''} ${stage.label || ''} ${stage.runtimeState || stage.state || ''}`).join(' ').toLowerCase();
    return {
        source,
        runtime_services: COBOTICS_RUNTIME_SERVICES.map(service => service.id),
        collaborative_latency_ms: stages.reduce((sum, stage) => sum + (stage.durationMs || 0), 0),
        human_interaction_events: (stageText.match(/human|operator|collaborative/g) || []).length,
        safety_interventions: governance.filter(event => JSON.stringify(event).toLowerCase().includes('safety') || JSON.stringify(event).toLowerCase().includes('override')).length,
        synchronization_events: sync.length,
        replay_events: replay.length,
        governance_events: governance.length,
        ecosystem_compatibility: planOrRuntime.ecosystemCompatibility ? planOrRuntime.ecosystemCompatibility.length : 0,
        anomaly_events: stages.filter(stage => stage.liveState === 'degraded' || stage.state === 'degraded' || stage.liveState === 'safety-paused' || stage.anomaly).length,
        collaborative_confidence_drift: Number((finalConfidence - firstConfidence).toFixed(3)),
        final_collaborative_confidence: Number(finalConfidence.toFixed ? finalConfidence.toFixed(3) : finalConfidence),
        adaptive_reassignment_events: stages.filter(stage => String(stage.id || '').includes('reassign') || String(stage.id || '').includes('adaptive') || String(stage.id || '').includes('balancing')).length
    };
}

function buildHriRuntimeTelemetry(planOrRuntime, source = 'execution') {
    const stages = planOrRuntime && planOrRuntime.stages ? planOrRuntime.stages : [];
    const confidence = planOrRuntime && planOrRuntime.confidenceTimeline ? planOrRuntime.confidenceTimeline : [];
    const sync = planOrRuntime && planOrRuntime.distributedSynchronization ? planOrRuntime.distributedSynchronization : [];
    const governance = planOrRuntime && planOrRuntime.governancePropagation ? planOrRuntime.governancePropagation : [];
    const replay = planOrRuntime && planOrRuntime.replayPropagation ? planOrRuntime.replayPropagation : [];
    const finalConfidence = confidence.length ? (confidence[confidence.length - 1].after || confidence[confidence.length - 1].score || 0) : 0;
    const firstConfidence = confidence.length ? (confidence[0].before || confidence[0].score || 0) : 0;
    const text = stages.map(stage => `${stage.id || ''} ${stage.label || ''} ${stage.runtimeState || stage.state || ''}`).join(' ').toLowerCase();
    return {
        source,
        runtime_services: HRI_RUNTIME_SERVICES.map(service => service.id),
        positioning: 'Human + Robot Cognitive Coordination Infrastructure',
        interaction_latency_ms: stages.reduce((sum, stage) => sum + (stage.durationMs || 0), 0),
        intent_events: (text.match(/intent|command|ambiguity|interpretation/g) || []).length,
        multimodal_events: (text.match(/multimodal|voice|speech|gesture|visual|multilingual|environmental/g) || []).length,
        contextual_adaptation_events: (text.match(/contextual|adaptation|behavioral|environmental/g) || []).length,
        override_events: (text.match(/override|emergency|escalation/g) || []).length,
        safety_events: (text.match(/safety|proximity|restricted|governance/g) || []).length,
        trust_confidence_events: (text.match(/trust|confidence|certainty/g) || []).length,
        behavioral_signal_events: (text.match(/behavioral|emotion|anomaly/g) || []).length,
        multilingual_alignment: text.includes('multilingual') || text.includes('shunya') || text.includes('speech'),
        edge_readiness_events: (text.match(/edge|offline|low-latency|synchronization/g) || []).length,
        replay_events: replay.length,
        governance_events: governance.length,
        synchronization_events: sync.length,
        hri_confidence_drift: Number((finalConfidence - firstConfidence).toFixed(3)),
        final_human_trust_confidence: Number(finalConfidence.toFixed ? finalConfidence.toFixed(3) : finalConfidence),
        no_chatbot_replacement: true,
        no_robotic_ui_scripting: true
    };
}

function buildIndustrialRuntimeTelemetry(planOrRuntime, source = 'execution') {
    const stages = planOrRuntime && planOrRuntime.stages ? planOrRuntime.stages : [];
    const confidence = planOrRuntime && planOrRuntime.confidenceTimeline ? planOrRuntime.confidenceTimeline : [];
    const sync = planOrRuntime && planOrRuntime.distributedSynchronization ? planOrRuntime.distributedSynchronization : [];
    const governance = planOrRuntime && planOrRuntime.governancePropagation ? planOrRuntime.governancePropagation : [];
    const replay = planOrRuntime && planOrRuntime.replayPropagation ? planOrRuntime.replayPropagation : [];
    const finalConfidence = confidence.length ? (confidence[confidence.length - 1].after || confidence[confidence.length - 1].score || 0) : 0;
    const firstConfidence = confidence.length ? (confidence[0].before || confidence[0].score || 0) : 0;
    const stageText = stages.map(stage => `${stage.id || ''} ${stage.label || ''} ${stage.runtimeState || stage.state || ''}`).join(' ').toLowerCase();
    return {
        source,
        runtime_services: INDUSTRIAL_ROBOTICS_RUNTIME_SERVICES.map(service => service.id),
        production_latency_ms: stages.reduce((sum, stage) => sum + (stage.durationMs || 0), 0),
        factory_synchronization_events: sync.length,
        governance_events: governance.length,
        replay_events: replay.length,
        ecosystem_compatibility: planOrRuntime.ecosystemCompatibility ? planOrRuntime.ecosystemCompatibility.length : 0,
        anomaly_events: (stageText.match(/anomaly|degraded|predictive|maintenance/g) || []).length,
        predictive_coordination_events: (stageText.match(/predictive|forecast|anticipation|optimization/g) || []).length,
        production_balancing_events: (stageText.match(/balancing|redistribution|load|multi-line/g) || []).length,
        industrial_confidence_drift: Number((finalConfidence - firstConfidence).toFixed(3)),
        final_production_confidence: Number(finalConfidence.toFixed ? finalConfidence.toFixed(3) : finalConfidence),
        digital_twin_ready: true
    };
}

function buildUavRuntimeTelemetry(planOrRuntime, source = 'execution') {
    const stages = planOrRuntime && planOrRuntime.stages ? planOrRuntime.stages : [];
    const confidence = planOrRuntime && planOrRuntime.confidenceTimeline ? planOrRuntime.confidenceTimeline : [];
    const governance = planOrRuntime && planOrRuntime.governancePropagation ? planOrRuntime.governancePropagation : [];
    const replay = planOrRuntime && planOrRuntime.replayPropagation ? planOrRuntime.replayPropagation : [];
    const sync = planOrRuntime && planOrRuntime.distributedSynchronization ? planOrRuntime.distributedSynchronization : [];
    const finalConfidence = confidence.length ? (confidence[confidence.length - 1].after || confidence[confidence.length - 1].score || 0) : 0;
    const firstConfidence = confidence.length ? (confidence[0].before || confidence[0].score || 0) : 0;
    const text = stages.map(stage => `${stage.id || ''} ${stage.label || ''} ${stage.runtimeState || stage.state || ''}`).join(' ').toLowerCase();
    return {
        source,
        positioning: 'Cognitive Infrastructure Layer for Autonomous Air Systems',
        standards_count: planOrRuntime.uavStandards ? planOrRuntime.uavStandards.length : 0,
        ecosystem_count: planOrRuntime.uavEcosystems ? planOrRuntime.uavEcosystems.length : 0,
        remote_id_events: (text.match(/remote-id|identity|uin|registration/g) || []).length,
        mavlink_events: (text.match(/mavlink|px4|ardupilot|dronekit|mavsdk/g) || []).length,
        utm_events: (text.match(/utm|airspace|traffic|conflict/g) || []).length,
        dgca_events: (text.match(/dgca|digitalsky|npnt|uin/g) || []).length,
        swarm_events: (text.match(/swarm|consensus|collective|fleet/g) || []).length,
        edge_events: (text.match(/edge|offline|low-latency|5g/g) || []).length,
        governance_events: governance.length,
        replay_events: replay.length,
        synchronization_events: sync.length,
        mission_confidence_drift: Number((finalConfidence - firstConfidence).toFixed(3)),
        final_mission_confidence: Number(finalConfidence.toFixed ? finalConfidence.toFixed(3) : finalConfidence),
        no_flight_controller_replacement: true
    };
}

function buildExecutionPlan(api, user, mode, input = {}, governanceContext = {}) {
    const domain = api.domain_key || domainKeyForApi(api);
    const tags = new Set([domain, ...(api.tags || []), ...(api.capabilities || [])].map(value => String(value).toLowerCase()));
    const tokenText = [domain, api.name, api.short_description, api.full_description, ...(api.tags || []), ...(api.capabilities || [])].join(' ').toLowerCase();
    const hasAny = terms => terms.some(term => tags.has(term) || tokenText.includes(term));
    const dependencies = api.dependencies || inferDependencies(api);
    const roboticsRuntime = isRoboticsRuntimeApi(api);
    const coboticsRuntime = isCoboticsRuntimeApi(api);
    const hriRuntime = isHriRuntimeApi(api);
    const industrialRuntime = isIndustrialRoboticsRuntimeApi(api);
    const ecosystemMatches = resolveRoboticsEcosystems(api, input, governanceContext);
    const uavRuntime = isUavRuntimeApi(api);
    const uavStandards = resolveUavStandards(api, input, governanceContext);
    const uavEcosystems = resolveUavEcosystems(api, input, governanceContext);
    const domainStages = [];
    if (tags.has('travel')) {
        domainStages.push(['mobility-orchestration', 'Mobility orchestration path resolved', 'orchestrating']);
        domainStages.push(['accessibility-propagation', 'Accessibility constraints propagated', 'orchestrating']);
        domainStages.push(['weather-coordination', 'Weather and disruption context coordinated', 'distributed-sync']);
    }
    if (tags.has('drone') || tags.has('fleet')) {
        domainStages.push(['mission-coordination', 'Mission orchestration graph planned', 'orchestrating']);
        domainStages.push(['edge-synchronization', 'Edge synchronization established', 'distributed-sync']);
        domainStages.push(['fleet-coordination', 'Distributed fleet coordination planned', 'distributed-sync']);
    }
    if (uavRuntime) {
        domainStages.push(['uav-remote-id-readiness', 'Remote ID, digital drone identity, operator identity, and replay identity mapping prepared', 'governance-check']);
        domainStages.push(['uav-airspace-governance', 'Airspace restrictions, geofence, no-fly, UTM conflict awareness, and mission authorization evaluated', 'governance-check']);
        domainStages.push(['uav-mavlink-telemetry', 'MAVLink telemetry, command propagation metadata, and mission explainability synchronized', 'distributed-sync']);
        domainStages.push(['uav-edge-coordination', 'Low-latency edge telemetry, offline recovery, and distributed aerial synchronization prepared', 'distributed-sync']);
        domainStages.push(['uav-swarm-consensus', 'Swarm coordination, collective execution, aerial consensus, and fleet balancing propagated', 'distributed-sync']);
    }
    uavStandards.forEach(standard => {
        domainStages.push([`${standard.id}-compliance-readiness`, `${standard.name} orchestration readiness mapped: ${standard.readiness.slice(0, 3).join(', ')}`, standard.airspace || standard.governance ? 'governance-check' : 'orchestrating']);
    });
    uavEcosystems.forEach(ecosystem => {
        domainStages.push([`${ecosystem.id}-orchestration-readiness`, `${ecosystem.name} orchestration readiness mapped: ${ecosystem.readiness.slice(0, 3).join(', ')}`, ecosystem.edge || ecosystem.swarm ? 'distributed-sync' : 'orchestrating']);
    });
    if (hasAny(['robotics', 'robotic', 'workflow orchestration', 'task orchestration', 'industrial robotics'])) {
        domainStages.push(['robotic-intent-graph', 'Robotic cognitive intent graph resolved', 'coordinating']);
        domainStages.push(['robotic-workflow-propagation', 'Robotic workflow and role assignment propagated', 'coordinating']);
    }
    if (industrialRuntime) {
        domainStages.push(['production-initialization', 'Production order, line context, and manufacturing execution intent initialized', 'initializing-production']);
        domainStages.push(['factory-synchronization', 'Factory line, station, and distributed production state synchronized', 'synchronizing-factory']);
        domainStages.push(['industrial-workflow-coordination', 'Industrial robotic workflow and assembly-line handoff coordinated', 'coordinating-workflow']);
        domainStages.push(['assembly-line-synchronization', 'Assembly-line cadence and robotic station synchronization propagated', 'synchronizing-factory']);
        domainStages.push(['predictive-coordination', 'Predictive workflow adaptation and optimization plan evaluated', 'balancing-production']);
        domainStages.push(['industrial-anomaly-detection', 'Anomaly anticipation and degradation propagation checked', 'anomaly-detecting']);
        domainStages.push(['production-redistribution', 'Distributed production balancing and workload redistribution prepared', 'balancing-production']);
        domainStages.push(['industrial-governance-validation', 'Industrial safety, restricted operation, compliance, and escalation governance validated', 'governance-validating']);
    }
    ecosystemMatches.forEach(ecosystem => {
        const label = ecosystem.name;
        if (ecosystem.id === 'ros2') {
            domainStages.push(['ros2-graph-compatibility', `${label} topics, services, actions, lifecycle nodes, DDS, and ROS graph compatibility mapped`, 'synchronizing']);
        } else if (ecosystem.id === 'gemini-robotics') {
            domainStages.push(['vla-orchestration', `${label} Vision-Language-Action cognition mapped into governed robotic intent`, 'coordinating']);
        } else if (ecosystem.id === 'nvidia-isaac') {
            domainStages.push(['isaac-simulation-bridge', `${label} simulation, perception, edge AI, and Isaac Sim readiness synchronized`, 'synchronizing']);
        } else if (['abb-rws', 'kuka', 'fairino'].includes(ecosystem.id)) {
            domainStages.push([`${ecosystem.id}-industrial-bridge`, `${label} industrial API orchestration contract prepared`, 'coordinating-workflow']);
        } else if (ecosystem.id === 'hebi') {
            domainStages.push(['hebi-telemetry-bridge', `${label} MATLAB, Python, C# telemetry and actuator metadata mapped`, 'synchronizing']);
        } else if (ecosystem.id === 'lynxmotion-lss') {
            domainStages.push(['lss-edge-servo-metadata', `${label} servo telemetry metadata and edge synchronization mapped`, 'synchronizing']);
        } else if (ecosystem.id === 'flask-iot') {
            domainStages.push(['flask-edge-gateway', `${label} REST gateway ingestion and local edge runtime bridge prepared`, 'synchronizing']);
        }
    });
    if (hasAny(['human-aware', 'human aware', 'proximity', 'shared workspace', 'collaboration', 'cobotics'])) {
        domainStages.push(['human-detection', 'Human presence and operator context detected', coboticsRuntime ? 'detecting-human' : 'governance-check']);
        domainStages.push(['human-proximity-cognition', 'Human proximity and shared workspace context evaluated', coboticsRuntime ? 'governance-validation' : 'governance-check']);
        domainStages.push(['collaborative-intent-sync', 'Collaborative human-machine intent synchronized', coboticsRuntime ? 'synchronizing-intent' : 'coordinating']);
    }
    if (hriRuntime) {
        domainStages.push(['hri-intent-recognition', 'Human command, workflow intention, and collaborative intent recognized', 'intent-recognition']);
        domainStages.push(['hri-contextual-interpretation', 'Contextual intention, ambiguity, and interaction confidence interpreted', 'contextual-interpretation']);
        domainStages.push(['hri-multimodal-capture', 'Voice, gesture, visual cue, multilingual, behavioral, and environmental signals normalized through CRL', 'multimodal-capture']);
        domainStages.push(['hri-interaction-interpretation', 'Multimodal interaction cognition and Shunya-AI aligned language context interpreted', 'interaction-interpretation']);
        domainStages.push(['hri-contextual-adaptation', 'Robot behavior and collaborative workflow adapted to human context', 'contextual-adaptation']);
        domainStages.push(['hri-trust-confidence', 'Human trust, collaboration certainty, behavioral confidence, and override frequency scored', 'trust-scoring']);
        domainStages.push(['hri-safety-validation', 'Proximity, restricted action, collaborative safety, and human-first governance validated', 'safety-validation']);
        domainStages.push(['hri-override-governance', 'Emergency interruption, human override, and escalation authority propagated', 'override-governance']);
        domainStages.push(['hri-presence-synchronization', 'Human presence, shared workspace, edge synchronization, and offline recovery context synchronized', 'presence-synchronization']);
        domainStages.push(['hri-explainability-reconstruction', 'Explainable interaction, adaptation, escalation, override, and confidence rationale reconstructed', 'explainability-reconstruction']);
    }
    if (coboticsRuntime) {
        domainStages.push(['shared-workspace-orchestration', 'Shared workspace orchestration and safe-zone coordination planned', 'collaborative-planning']);
        domainStages.push(['collaborative-task-assignment', 'Collaborative task assignment and workload negotiation propagated', 'collaborative-planning']);
        domainStages.push(['adaptive-coordination-balancing', 'Adaptive coordination balancing and task reassignment evaluated', 'adaptive-balancing']);
        domainStages.push(['operator-override-readiness', 'Operator override authority and emergency stop propagation prepared', 'governance-validation']);
    }
    if (hasAny(['fleet', 'multi-robot', 'traffic', 'resource balancing', 'warehouse'])) {
        domainStages.push(['fleet-synchronization', 'Multi-robot fleet synchronization planned', 'distributed-sync']);
        domainStages.push(['robotic-traffic-orchestration', 'Robotic traffic and resource coordination balanced', 'distributed-sync']);
    }
    if (hasAny(['edge', 'disconnected', 'regional', 'recovery'])) {
        domainStages.push(['edge-robotics-sync', 'Edge robotics state synchronized with regional recovery policy', 'distributed-sync']);
    }
    if (hasAny(['multimodal', 'sensor', 'vision', 'speech', 'telemetry', 'environmental'])) {
        domainStages.push(['robotic-multimodal-fusion', 'Robotic multimodal signals fused through CRL', 'coordinating']);
        domainStages.push(['environmental-context-sync', 'Environmental context synchronized into orchestration state', 'distributed-sync']);
    }
    if (hasAny(['safety', 'collision', 'restricted-zone', 'restricted zone', 'override', 'fail-safe', 'governance', 'compliance', 'emergency shutdown'])) {
        domainStages.push(['robotic-safety-governance', coboticsRuntime ? 'Collaborative safety, collision, and restricted-zone governance evaluated' : 'Robotic safety, restricted-zone, and override governance evaluated', coboticsRuntime ? 'governance-validation' : 'governance-check']);
        domainStages.push(['failsafe-propagation', coboticsRuntime ? 'Collaborative fail-safe and operator escalation boundary prepared' : 'Fail-safe propagation and escalation boundary prepared', coboticsRuntime ? 'governance-validation' : 'governance-check']);
    }
    if (hasAny(['replay', 'reconstruction'])) {
        domainStages.push(['robotic-replay-contract', 'Robotic replay reconstruction contract prepared', 'replay-capture']);
    }
    if (hasAny(['observability', 'metrics', 'anomaly'])) {
        domainStages.push(['robotic-observability-publish', 'Robotic telemetry, anomaly, and confidence metrics published', 'executing']);
    }
    if (hasAny(['digital twin', 'digital-twin', 'twin'])) {
        domainStages.push(['digital-twin-contract', 'Robotics digital twin interface contract synchronized', 'coordinating']);
    }
    if (tags.has('cobotics')) domainStages.push(['human-machine-context', 'Cobotics collaboration context aligned', 'coordinating']);
    if (tags.has('governance') || tags.has('policy') || api.governance_support) domainStages.push(['policy-enforcement', 'Governance enforcement path selected', 'governance-check']);
    if (tags.has('multilingual') || tags.has('speech')) {
        domainStages.push(['speech-cognition', 'Speech cognition signal normalized', 'orchestrating']);
        domainStages.push(['contextual-propagation', 'Contextual language state propagated', 'orchestrating']);
        domainStages.push(['translation-orchestration', 'Translation orchestration path resolved', 'orchestrating']);
    }
    if (!domainStages.length) domainStages.push(['cognitive-orchestration', `${api.name} orchestration path selected`, 'orchestrating']);

    const baseStages = [
        ['queued', 'Execution request queued', 'queued'],
        ['initializing', 'Tenant session and entitlement initialized', 'initializing'],
        ['metadata-contract', 'API metadata contract loaded', 'orchestrating'],
        ...domainStages,
        ['dependency-propagation', 'Dependency graph propagated', 'distributed-sync'],
        ['governance-propagation', api.governance_support ? 'Governance checkpoints applied' : 'Tenant safety boundary applied', 'governance-check'],
        ['replay-capture', 'Deterministic replay trace captured', 'replay-capture'],
        ['confidence-finalization', 'Confidence evolution finalized', 'executing'],
        ['completed', 'Execution response envelope completed', 'completed']
    ];

    const startedAt = Date.now();
    const stages = baseStages.map((stage, index) => {
        const confidenceBefore = Number((0.62 + Math.min(index, 6) * 0.035).toFixed(3));
        const confidenceAfter = Number(Math.min(0.97, confidenceBefore + confidenceDeltaForStage(stage, api)).toFixed(3));
        return {
            order: index + 1,
            id: stage[0],
            label: stage[1],
            state: index === 0 ? 'queued' : 'pending',
            runtimeState: stage[2],
            durationMs: 220 + index * 55,
            startedAtOffsetMs: index * 260,
            completedAtOffsetMs: index * 260 + 220 + index * 55,
            confidenceBefore,
            confidenceAfter,
            roboticsRuntime,
            hriRuntime,
            dependencies: stage[0] === 'dependency-propagation' ? dependencies : [],
            governanceEvents: ['governance-check', 'governance-validation', 'governance-validating', 'safety-validation', 'override-governance', 'safety-paused'].includes(stage[2]) ? roboticsGovernanceEvents(stage, api, governanceContext) : [],
            replayEvents: ['replay-capture', 'replay-capturing', 'explainability-reconstruction'].includes(stage[2]) ? roboticsReplayEvents(stage, api, startedAt) : [],
            distributedEvents: ['distributed-sync', 'synchronizing-intent', 'synchronizing-factory', 'presence-synchronization'].includes(stage[2]) ? dependencies.map((dependency, depIndex) => ({ dependency, vectorClock: depIndex + 1, status: 'synchronized', runtime: hriRuntime ? 'human-presence-synchronization-runtime' : industrialRuntime ? 'distributed-factory-coordination-runtime' : coboticsRuntime ? 'intent-synchronization-engine' : roboticsRuntime ? 'distributed-robot-coordination-runtime' : 'distributed-execution-engine' })) : []
        };
    });
    const plan = {
        executionId: `orch-${api.api_key}-${startedAt}`,
        apiKey: api.api_key,
        apiName: api.name,
        domain,
        mode,
        requestedAt: new Date(startedAt).toISOString(),
        estimatedDurationMs: stages.reduce((sum, stage) => sum + stage.durationMs, 0),
        stages,
        graph: {
            nodes: stages.map(stage => ({ id: stage.id, label: stage.label, state: stage.runtimeState })),
            edges: stages.slice(1).map((stage, index) => ({ from: stages[index].id, to: stage.id, label: 'execution-flow' }))
        },
        dependencyGraph: dependencies.map((dependency, index) => ({ from: api.api_key, to: dependency, status: 'propagated', weight: index + 1 })),
        confidenceTimeline: stages.map(stage => ({ stage: stage.id, before: stage.confidenceBefore, after: stage.confidenceAfter })),
        governancePropagation: stages.flatMap(stage => stage.governanceEvents.map(event => ({ stage: stage.id, ...event }))),
        replayPropagation: stages.flatMap(stage => stage.replayEvents.map(event => ({ stage: stage.id, ...event }))),
        distributedSynchronization: stages.flatMap(stage => stage.distributedEvents.map(event => ({ stage: stage.id, ...event }))),
        ecosystemCompatibility: ecosystemMatches.map(item => ({
            id: item.id,
            name: item.name,
            stackType: item.stackType,
            integrationReadiness: item.integrationReadiness,
            orchestrationRole: item.orchestrationRole,
            vla: item.vla,
            edge: item.edge,
            simulation: item.simulation,
            replay: item.replay,
            governance: item.governance,
            observability: item.observability,
            synchronization: item.synchronization
        })),
        uavStandards: uavStandards.map(item => ({ ...item })),
        uavEcosystems: uavEcosystems.map(item => ({ ...item })),
        simulationRealism: {
            mode,
            generatedFrom: roboticsRuntime ? ['metadata-registry', 'robotics-runtime-service', 'robotics-orchestration-engine', 'robotics-governance-runtime', 'robotics-replay-runtime', 'distributed-robot-coordination-runtime', 'robotics-ecosystem-compatibility-registry'] : ['metadata-registry', 'dependency-graph', 'governance-engine', 'replay-engine', 'distributed-execution-engine'],
            inputHash: crypto.createHash('sha256').update(JSON.stringify(input || {})).digest('hex').slice(0, 12)
        },
        roboticsRuntime: roboticsRuntime ? {
            enabled: true,
            services: ROBOTICS_RUNTIME_SERVICES.map(service => ({ id: service.id, apiKey: service.apiKey, responsibility: service.responsibility })),
            noHardwareControl: true
        } : null,
        coboticsRuntime: coboticsRuntime ? {
            enabled: true,
            services: COBOTICS_RUNTIME_SERVICES.map(service => ({ id: service.id, apiKey: service.apiKey, responsibility: service.responsibility })),
            noHardwareControl: true,
            humanFirst: true
        } : null,
        hriRuntime: hriRuntime ? {
            enabled: true,
            services: HRI_RUNTIME_SERVICES.map(service => ({ id: service.id, apiKey: service.apiKey, responsibility: service.responsibility })),
            noHardwareControl: true,
            noChatbotReplacement: true,
            shunyaAiAligned: true,
            edgeReady: true,
            humanFirst: true
        } : null,
        industrialRuntime: industrialRuntime ? {
            enabled: true,
            services: INDUSTRIAL_ROBOTICS_RUNTIME_SERVICES.map(service => ({ id: service.id, apiKey: service.apiKey, responsibility: service.responsibility })),
            noHardwareControl: true,
            noPlcScadaMesReplacement: true,
            digitalTwinReady: true
        } : null
    };
    if (roboticsRuntime) plan.roboticsTelemetry = buildRoboticsRuntimeTelemetry(plan, 'execution-plan');
    if (coboticsRuntime) plan.coboticsTelemetry = buildCoboticsRuntimeTelemetry(plan, 'execution-plan');
    if (hriRuntime) plan.hriTelemetry = buildHriRuntimeTelemetry(plan, 'execution-plan');
    if (industrialRuntime) plan.industrialTelemetry = buildIndustrialRuntimeTelemetry(plan, 'execution-plan');
    if (uavRuntime) plan.uavTelemetry = buildUavRuntimeTelemetry(plan, 'execution-plan');
    return plan;
}

function mapRuntimeStateToLiveState(runtimeState) {
    return {
        queued: 'pending',
        initializing: 'initializing',
        coordinating: 'coordinating',
        orchestrating: 'orchestrating',
        'governance-check': 'governance-check',
        'governance-validation': 'governance-validation',
        'governance-validating': 'governance-validating',
        'governance-validating': 'governance-validating',
        'replay-capture': 'replay-capturing',
        'replay-capturing': 'replay-capturing',
        'distributed-sync': 'synchronizing',
        synchronizing: 'synchronizing',
        'detecting-human': 'detecting-human',
        'synchronizing-intent': 'synchronizing-intent',
        'collaborative-planning': 'collaborative-planning',
        'adaptive-balancing': 'adaptive-balancing',
        'safety-paused': 'safety-paused',
        'intent-recognition': 'intent-recognition',
        'contextual-interpretation': 'contextual-interpretation',
        'ambiguity-resolution': 'ambiguity-resolution',
        'multimodal-capture': 'multimodal-capture',
        'interaction-interpretation': 'interaction-interpretation',
        'contextual-adaptation': 'contextual-adaptation',
        'adaptive-collaboration': 'adaptive-collaboration',
        'override-governance': 'override-governance',
        'safety-validation': 'safety-validation',
        'trust-scoring': 'trust-scoring',
        'confidence-propagation': 'confidence-propagation',
        'behavioral-signal-analysis': 'behavioral-signal-analysis',
        'presence-synchronization': 'presence-synchronization',
        'explainability-reconstruction': 'explainability-reconstruction',
        'escalation-propagation': 'escalation-propagation',
        'initializing-production': 'initializing-production',
        'synchronizing-factory': 'synchronizing-factory',
        'coordinating-workflow': 'coordinating-workflow',
        'balancing-production': 'balancing-production',
        'anomaly-detecting': 'anomaly-detecting',
        paused: 'paused',
        executing: 'executing',
        degraded: 'degraded',
        failed: 'failed',
        recovered: 'recovered',
        completed: 'completed'
    }[runtimeState] || runtimeState || 'pending';
}

function buildExecutionSession({ api, user, mode, input, governanceContext }) {
    const executionPlan = buildExecutionPlan(api, user, mode, input, governanceContext);
    const startedAt = Date.now();
    const totalDurationMs = executionPlan.stages.reduce((sum, stage) => sum + Math.min(stage.durationMs || 250, 700) + 100, 0);
    const replayId = executionPlan.replayPropagation[0] ? executionPlan.replayPropagation[0].replayId : `replay-${api.api_key}-${startedAt}`;
    const session = {
        id: executionPlan.executionId,
        tenant: user.tenant,
        userId: user.sub,
        api_key: api.api_key,
        api_name: api.name,
        mode,
        status: 'running',
        startedAt,
        totalDurationMs,
        executionPlan,
        input,
        governanceContext,
        replayPackage: {
            replayId,
            executionReplay: executionPlan.stages.map(stage => ({ stage: stage.id, label: stage.label, runtimeState: stage.runtimeState })),
            orchestrationReconstruction: executionPlan.graph,
            governanceReplay: executionPlan.governancePropagation,
            dependencyReplay: executionPlan.dependencyGraph,
            confidenceReplay: executionPlan.confidenceTimeline
        },
        telemetry: {
            source: 'orchestration-runtime-session',
            runtimeService: isRoboticsRuntimeApi(api) ? 'robotics-runtime-service' : 'cintent-core-runtime',
            roboticsRuntime: isRoboticsRuntimeApi(api),
            coboticsRuntime: isCoboticsRuntimeApi(api),
            hriRuntime: isHriRuntimeApi(api),
            industrialRuntime: isIndustrialRoboticsRuntimeApi(api),
            uavRuntime: isUavRuntimeApi(api),
            apiAware: true,
            replayEnabled: true,
            governanceEnabled: true,
            dependencyGraphEnabled: true,
            streaming: 'sse-with-polling-fallback'
        },
        persisted: false
    };
    executionSessions.set(session.id, session);
    return session;
}

function materializeExecutionSession(session) {
    const elapsed = Date.now() - session.startedAt;
    let cursor = 0;
    let completedCount = 0;
    let currentStage = null;
    const stages = session.executionPlan.stages.map(stage => {
        const duration = Math.min(stage.durationMs || 250, 700);
        const startsAt = cursor;
        const completesAt = cursor + duration;
        cursor = completesAt + 100;
        let liveState = 'pending';
        if (elapsed >= completesAt) {
            liveState = 'completed';
            completedCount += 1;
        } else if (elapsed >= startsAt) {
            liveState = mapRuntimeStateToLiveState(stage.runtimeState);
            currentStage = stage.id;
        }
        return {
            ...stage,
            liveState,
            started: elapsed >= startsAt,
            completed: elapsed >= completesAt,
            active: elapsed >= startsAt && elapsed < completesAt,
            elapsedMs: Math.max(0, Math.min(duration, elapsed - startsAt))
        };
    });
    const complete = completedCount === stages.length;
    const hasStarted = stages.some(stage => stage.started);
    const status = complete ? 'completed' : hasStarted ? 'running' : 'queued';
    session.status = status;
    const activeStages = stages.filter(stage => stage.started);
    const replayEvents = activeStages.flatMap(stage => stage.replayEvents || []);
    const governanceEvents = activeStages.flatMap(stage => stage.governanceEvents || []);
    const distributedEvents = activeStages.flatMap(stage => stage.distributedEvents || []);
    const confidenceTimeline = stages
        .filter(stage => stage.started)
        .map(stage => ({ stage: stage.id, before: stage.confidenceBefore, after: stage.confidenceAfter, liveState: stage.liveState }));
    const payload = {
        executionId: session.id,
        api: session.api_name,
        apiKey: session.api_key,
        mode: session.mode,
        status,
        currentStage,
        startedAt: new Date(session.startedAt).toISOString(),
        elapsedMs: elapsed,
        progress: stages.length ? Math.round((completedCount / stages.length) * 100) : 0,
        stages,
        graph: session.executionPlan.graph,
        dependencyGraph: session.executionPlan.dependencyGraph,
        ecosystemCompatibility: session.executionPlan.ecosystemCompatibility || [],
        uavStandards: session.executionPlan.uavStandards || [],
        uavEcosystems: session.executionPlan.uavEcosystems || [],
        governancePropagation: governanceEvents.map(event => ({ ...event, visible: true })),
        replayPropagation: replayEvents.map(event => ({ ...event, visible: true })),
        distributedSynchronization: distributedEvents.map(event => ({ ...event, visible: true })),
        confidenceTimeline,
        replayPackage: complete ? session.replayPackage : { replayId: session.replayPackage.replayId, status: 'capturing', capturedStages: replayEvents.length },
        telemetry: {
            ...session.telemetry,
            ecosystemCompatibility: session.executionPlan.ecosystemCompatibility || [],
            activeStage: currentStage,
            completedStages: completedCount,
            totalStages: stages.length,
            runtimeStatus: status
        },
        roboticsTelemetry: session.telemetry.roboticsRuntime ? buildRoboticsRuntimeTelemetry({
            stages,
            confidenceTimeline,
            governancePropagation: governanceEvents,
            replayPropagation: replayEvents,
            distributedSynchronization: distributedEvents
        }, 'live-execution') : null,
        coboticsTelemetry: session.telemetry.coboticsRuntime ? buildCoboticsRuntimeTelemetry({
            stages,
            confidenceTimeline,
            governancePropagation: governanceEvents,
            replayPropagation: replayEvents,
            distributedSynchronization: distributedEvents
        }, 'live-execution') : null,
        hriTelemetry: session.telemetry.hriRuntime ? buildHriRuntimeTelemetry({
            stages,
            confidenceTimeline,
            governancePropagation: governanceEvents,
            replayPropagation: replayEvents,
            distributedSynchronization: distributedEvents
        }, 'live-execution') : null,
        industrialTelemetry: session.telemetry.industrialRuntime ? buildIndustrialRuntimeTelemetry({
            stages,
            confidenceTimeline,
            governancePropagation: governanceEvents,
            replayPropagation: replayEvents,
            distributedSynchronization: distributedEvents
        }, 'live-execution') : null,
        uavTelemetry: session.telemetry.uavRuntime ? buildUavRuntimeTelemetry({
            stages,
            confidenceTimeline,
            governancePropagation: governanceEvents,
            replayPropagation: replayEvents,
            distributedSynchronization: distributedEvents,
            uavStandards: session.executionPlan.uavStandards || [],
            uavEcosystems: session.executionPlan.uavEcosystems || []
        }, 'live-execution') : null
    };
    if (complete && !session.persisted) {
        persistExecutionSession(session, payload);
    }
    return payload;
}

function persistExecutionSession(session, payload) {
    session.persisted = true;
    const output = {
        id: session.id,
        api_key: session.api_key,
        api_name: session.api_name,
        tenant: session.tenant,
        session_type: 'runtime',
        mode: session.mode,
        status: 'simulated-success',
        governance: { status: payload.governancePropagation.length ? 'passed' : 'tenant_boundary_applied', interventions: payload.governancePropagation },
        replay: payload.replayPackage,
        confidenceEvolution: payload.confidenceTimeline.map(item => ({ step: item.stage, score: item.after, before: item.before })),
        distributedSynchronization: payload.distributedSynchronization,
        orchestrationTrace: payload.stages.map(stage => ({ order: stage.order, step: stage.id, label: stage.label, state: stage.runtimeState, liveState: stage.liveState, source: 'backend-runtime-stream', status: stage.liveState, durationMs: stage.durationMs })),
        dependencyVisibility: payload.dependencyGraph.map(dep => ({ api: dep.to, relationship: 'metadata dependency', status: dep.status })),
        ecosystemCompatibility: payload.ecosystemCompatibility,
        uavStandards: payload.uavStandards,
        uavEcosystems: payload.uavEcosystems,
        visualization: payload.graph,
        executionPlan: { ...session.executionPlan, stages: payload.stages },
        roboticsRuntime: payload.roboticsTelemetry ? {
            services: ROBOTICS_RUNTIME_SERVICES.map(service => service.id),
            telemetry: payload.roboticsTelemetry,
            replayRuntime: payload.replayPackage,
            governanceRuntime: payload.governancePropagation,
            confidenceRuntime: payload.confidenceTimeline,
            synchronizationRuntime: payload.distributedSynchronization
        } : null,
        coboticsRuntime: payload.coboticsTelemetry ? {
            services: COBOTICS_RUNTIME_SERVICES.map(service => service.id),
            telemetry: payload.coboticsTelemetry,
            replayRuntime: payload.replayPackage,
            governanceRuntime: payload.governancePropagation,
            confidenceRuntime: payload.confidenceTimeline,
            synchronizationRuntime: payload.distributedSynchronization,
            explainabilityRuntime: payload.stages.filter(stage => stage.started).map(stage => ({ stage: stage.id, reason: stage.label, state: stage.liveState }))
        } : null,
        hriRuntime: payload.hriTelemetry ? {
            services: HRI_RUNTIME_SERVICES.map(service => service.id),
            telemetry: payload.hriTelemetry,
            replayRuntime: payload.replayPackage,
            governanceRuntime: payload.governancePropagation,
            humanTrustConfidenceRuntime: payload.confidenceTimeline,
            synchronizationRuntime: payload.distributedSynchronization,
            explainabilityRuntime: payload.stages.filter(stage => stage.started).map(stage => ({ stage: stage.id, reason: stage.label, state: stage.liveState, hri: true })),
            shunyaAiAligned: true,
            edgeReady: true
        } : null,
        industrialRuntime: payload.industrialTelemetry ? {
            services: INDUSTRIAL_ROBOTICS_RUNTIME_SERVICES.map(service => service.id),
            telemetry: payload.industrialTelemetry,
            replayRuntime: payload.replayPackage,
            governanceRuntime: payload.governancePropagation,
            productionConfidenceRuntime: payload.confidenceTimeline,
            synchronizationRuntime: payload.distributedSynchronization,
            digitalTwinReady: true,
            explainabilityRuntime: payload.stages.filter(stage => stage.started).map(stage => ({ stage: stage.id, reason: stage.label, state: stage.liveState }))
        } : null,
        uavRuntime: payload.uavTelemetry ? {
            standards: payload.uavStandards,
            ecosystems: payload.uavEcosystems,
            telemetry: payload.uavTelemetry,
            replayRuntime: payload.replayPackage,
            governanceRuntime: payload.governancePropagation,
            missionConfidenceRuntime: payload.confidenceTimeline,
            synchronizationRuntime: payload.distributedSynchronization
        } : null,
        timestamp: new Date().toISOString()
    };
    executionEvents.unshift(output);
    if (executionEvents.length > 250) executionEvents.pop();
}

function simulationAccess(template, user) {
    const domain = getDomainRoadmap().find(item => item.domain_key === template.domain) || { domain_key: template.domain, status: 'coming_soon' };
    const access = getDomainAccess(domain, user);
    if (access.executable) return { ...access, simulationEnabled: true };
    return { ...access, simulationEnabled: false };
}

function buildSimulationCatalog(user, catalog) {
    return SIMULATION_TEMPLATES.map(template => {
        const access = simulationAccess(template, user);
        const api = catalog.find(entry => entry.api_key === template.apiKey)
            || catalog.find(entry => (entry.domain_key || domainKeyForApi(entry)) === template.domain)
            || catalog[0];
        return {
            ...template,
            apiKey: api ? api.api_key : template.apiKey,
            apiName: api ? api.name : template.apiKey,
            access,
            visibleState: access.simulationEnabled ? 'enabled' : access.status || 'locked',
            launchable: access.simulationEnabled && api && canExecuteApi(api, user, 'sandbox')
        };
    });
}

function buildSimulationRuntime(template, api, user, mode, input = {}) {
    const executionPlan = buildExecutionPlan(api, user, mode, {
        simulationId: template.id,
        category: template.category,
        signals: template.signals,
        ...input
    }, {
        governanceLevel: template.governanceLevel,
        simulation: true
    });
    const stateMap = {
        queued: 'queued',
        initializing: 'initializing',
        orchestrating: 'orchestrating',
        'governance-check': 'governance-validating',
        'governance-validation': 'governance-validation',
        'replay-capture': 'replay-capturing',
        'replay-capturing': 'replay-capturing',
        'distributed-sync': 'synchronizing',
        'detecting-human': 'detecting-human',
        'synchronizing-intent': 'synchronizing-intent',
        'collaborative-planning': 'collaborative-planning',
        'adaptive-balancing': 'adaptive-balancing',
        'safety-paused': 'safety-paused',
        'initializing-production': 'initializing-production',
        'synchronizing-factory': 'synchronizing-factory',
        'coordinating-workflow': 'coordinating-workflow',
        'balancing-production': 'balancing-production',
        'anomaly-detecting': 'anomaly-detecting',
        paused: 'paused',
        coordinating: 'coordinating',
        executing: 'executing',
        completed: 'completed'
    };
    const nodes = executionPlan.stages.map((stage, index) => ({
        id: stage.id,
        label: stage.label,
        state: stateMap[stage.runtimeState] || stage.runtimeState,
        agent: template.agents[index % template.agents.length],
        signal: template.signals[index % template.signals.length],
        confidenceBefore: stage.confidenceBefore,
        confidenceAfter: stage.confidenceAfter,
        durationMs: stage.durationMs,
        anomaly: index === 4 && ['distributed-coordination', 'distributed-cognition', 'autonomous-mission', 'smart-infrastructure', 'robotic-fleet', 'edge-robotics'].includes(template.category)
            ? { type: 'latency-spike', severity: 'degraded', recovery: 'edge recovery propagation applied' }
            : null
    }));
    const replayPackage = {
        replayId: `sim-replay-${template.id}-${Date.now()}`,
        reconstruction: nodes.map(node => ({ node: node.id, state: node.state, confidence: node.confidenceAfter })),
        governanceReplay: executionPlan.governancePropagation,
        dependencyReplay: executionPlan.dependencyGraph,
        confidenceSnapshots: executionPlan.confidenceTimeline
    };
    return {
        simulationId: `sim-${template.id}-${Date.now()}`,
        templateId: template.id,
        title: template.title,
        domain: template.domain,
        category: template.category,
        mode,
        apiKey: api.api_key,
        apiName: api.name,
        lifecycle: 'running-to-complete',
        executionPlan,
        nodes,
        edges: executionPlan.graph.edges,
        agents: template.agents.map((agent, index) => ({
            id: agent.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: agent,
            role: index === 0 ? 'planner' : index === 1 ? 'coordination' : index === 2 ? 'governance/recovery' : 'replay/explainability',
            state: 'coordinating'
        })),
        telemetry: {
            metrics: ['orchestration propagation', 'governance validation', 'replay capture', 'confidence evolution', 'distributed synchronization'],
            anomalyDetected: nodes.some(node => node.anomaly),
            recoveryApplied: nodes.some(node => node.anomaly && node.anomaly.recovery),
            edgeCoordination: template.signals.some(signal => signal.includes('edge')) || template.category.includes('distributed') || template.category.includes('hri')
        },
        roboticsRuntime: ['robotics', 'cobotics'].includes(template.domain) ? {
            services: ROBOTICS_RUNTIME_SERVICES.map(service => service.id),
            telemetry: buildRoboticsRuntimeTelemetry(executionPlan, 'simulation-runtime'),
            ecosystemCompatibility: executionPlan.ecosystemCompatibility || [],
            noHardwareControl: true,
            runtimeContract: 'simulation-and-digital-twin-interface'
        } : null,
        uavRuntime: template.domain === 'drone' ? {
            standards: executionPlan.uavStandards || [],
            ecosystems: executionPlan.uavEcosystems || [],
            telemetry: buildUavRuntimeTelemetry(executionPlan, 'simulation-runtime'),
            noFlightControllerReplacement: true,
            runtimeContract: 'uav-standards-aware-simulation-runtime'
        } : null,
        coboticsRuntime: template.domain === 'cobotics' ? {
            services: COBOTICS_RUNTIME_SERVICES.map(service => service.id),
            telemetry: buildCoboticsRuntimeTelemetry(executionPlan, 'simulation-runtime'),
            humanFirst: true,
            runtimeContract: 'collaborative-simulation-runtime'
        } : null,
        hriRuntime: (template.domain === 'cobotics' && (template.category || '').includes('hri')) || isHriRuntimeApi(api) ? {
            services: HRI_RUNTIME_SERVICES.map(service => service.id),
            telemetry: buildHriRuntimeTelemetry(executionPlan, 'simulation-runtime'),
            humanFirst: true,
            shunyaAiAligned: true,
            edgeReady: true,
            runtimeContract: 'human-robot-interaction-cognitive-runtime'
        } : null,
        industrialRuntime: template.apiKey && template.apiKey.startsWith('irobot-') ? {
            services: INDUSTRIAL_ROBOTICS_RUNTIME_SERVICES.map(service => service.id),
            telemetry: buildIndustrialRuntimeTelemetry(executionPlan, 'simulation-runtime'),
            ecosystemCompatibility: executionPlan.ecosystemCompatibility || [],
            digitalTwinReady: true,
            runtimeContract: 'industrial-simulation-and-digital-twin-interface'
        } : null,
        replayPackage,
        explainability: [
            `${template.title} used ${api.name} because the tenant has ${template.domain} simulation visibility.`,
            `Governance level ${template.governanceLevel} shaped checkpoints and policy propagation.`,
            `Confidence evolved through ${executionPlan.confidenceTimeline.length} snapshots and finalized at ${Math.round(executionPlan.confidenceTimeline.at(-1).after * 100)}%.`,
            nodes.some(node => node.anomaly) ? 'A degraded synchronization event triggered recovery propagation.' : 'No failure recovery was required in this run.'
        ],
        createdAt: new Date().toISOString()
    };
}

function redirectToPlatformIfAuthenticated(req, res, next) {
    const token = getAuthToken(req);
    if (token) {
        try {
            jwt.verify(token, JWT_SECRET);
            return res.redirect('/platform');
        } catch (_) {
            return next();
        }
    }
    next();
}

function sendLoginPage(res) {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
}

app.use((req, res, next) => {
    const lockedStaticPages = new Set([
        '/CINTENT-PLATFORM-PROD.html',
        '/CINTENT-DEVELOPER-PLATFORM-V2.html',
        '/CINTENT-ADMIN-GOVERNANCE-CONSOLE.html'
    ]);
    if (!lockedStaticPages.has(req.path)) return next();
    const token = getAuthToken(req);
    if (!token) return res.redirect('/login');
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        if (req.path.includes('ADMIN') && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access requires an administrator session' });
        }
        if (req.path === '/CINTENT-PLATFORM-PROD.html' || req.path === '/CINTENT-DEVELOPER-PLATFORM-V2.html') {
            return sendProdPage(res);
        }
        return res.sendFile(path.join(__dirname, 'public', 'CINTENT-ADMIN-GOVERNANCE-CONSOLE.html'));
    } catch (error) {
        clearSessionCookie(res);
        return res.redirect('/login');
    }
});

app.use(express.static(path.join(__dirname, 'public')));


// Asset fallbacks for PROD page image references
app.get('/ui/assets/cintent_logo.png', (req, res) => {
    const image = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAoMBgX2j9cwAAAAASUVORK5CYII=',
        'base64'
    );
    res.type('png').send(image);
});

app.get('/downloads/cognivantalabs-site/assets/images/chaxu-logo.webp', (req, res) => {
    const image = Buffer.from(
        'UklGRiIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=',
        'base64'
    );
    res.type('image/webp').send(image);
});

app.get('/health', (req, res) => {
    res.redirect('/api/health');
});

// Routes - Frontend
app.get(['/login', '/signup', '/forgot-password', '/reset-password'], redirectToPlatformIfAuthenticated, (req, res) => sendLoginPage(res));
app.get('/', redirectToPlatformIfAuthenticated, (req, res) => sendLoginPage(res));
app.get('/platform', authMiddleware, (req, res) => sendProdPage(res));
app.get('/admin', authMiddleware, requireRoles('admin'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'CINTENT-ADMIN-GOVERNANCE-CONSOLE.html'));
});
app.get('/CINTENT-PLATFORM-PROD.html', authMiddleware, (req, res) => sendProdPage(res));

// Routes - API
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0',
        environment: NODE_ENV
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        platform: 'CINTENT Developer Platform v2',
        version: '2.0.0',
        status: 'operational',
        services: {
            authentication: 'ready',
            marketplace: 'ready',
            playground: 'ready',
            billing: 'ready'
        }
    });
});

app.post('/api/auth/signup', async (req, res) => {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (await getUserByEmailAsync(email)) {
        return res.status(409).json({ error: 'A user with that email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUserRecord({ email, passwordHash: hashedPassword, name });

    const verificationToken = crypto.randomBytes(24).toString('hex');
    emailVerificationTokens.set(verificationToken, user.id);

    res.json({
        message: 'Signup successful. Verify your email to unlock full platform access.',
        verificationToken,
        nextStep: `/api/auth/verify-email?token=${verificationToken}`
    });
});

app.get('/api/auth/verify-email', async (req, res) => {
    const token = req.query.token;
    if (!token || !emailVerificationTokens.has(token)) {
        return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }
    const userId = emailVerificationTokens.get(token);
    const user = await markUserVerified(userId);
    if (!user) {
        return res.status(400).json({ error: 'User not found for this verification token.' });
    }
    emailVerificationTokens.delete(token);
    res.json({ message: 'Email verified. You can now log in to the CINTENT platform.' });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await getUserByEmailAsync(email);
    if (!user) {
        return res.status(401).json({ error: 'Credentials are invalid.' });
    }
    if (!user.emailVerified) {
        return res.status(403).json({ error: 'Email verification is required before access is granted.' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        return res.status(401).json({ error: 'Credentials are invalid.' });
    }

    const token = buildToken({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: user.tenant,
        scopes: user.scopes,
        demo: false,
        emailVerified: true
    });
    sendSessionCookie(res, token);
    res.json({ message: 'Authenticated successfully.', user: { email: user.email, name: user.name, role: user.role, tenant: user.tenant } });
});

app.post('/api/auth/demo', (req, res) => {
    const id = `demo-${crypto.randomBytes(6).toString('hex')}`;
    const demoUser = {
        id,
        email: `demo-${id}@cintent.local`,
        name: 'Demo Guest',
        role: 'guest',
        demo: true,
        emailVerified: true,
        tenant: 'demo-tenant',
        scopes: ['read:api', 'search:api', 'execute:sandbox', 'ask:cognitive', 'read:replay'],
        createdAt: new Date().toISOString()
    };
    users.set(id, demoUser);
    const token = buildToken({
        sub: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        role: demoUser.role,
        tenant: demoUser.tenant,
        scopes: demoUser.scopes,
        demo: true,
        emailVerified: true
    }, DEMO_EXPIRES_IN);
    sendSessionCookie(res, token, DEMO_EXPIRES_IN);
    res.json({ message: 'Demo Mode enabled. Welcome to CINTENT Demo.', demo: true, user: { name: demoUser.name, role: demoUser.role, tenant: demoUser.tenant, demo: true } });
});

app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body || {};
    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }
    const user = await getUserByEmailAsync(email);
    if (!user) {
        return res.json({ message: 'If this email is registered, a password reset token has been generated.' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    passwordResetTokens.set(token, user.id);
    res.json({ message: 'Password reset token generated.', resetToken: token, nextStep: `/reset-password?token=${token}` });
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { token, password } = req.body || {};
    if (!token || !password) {
        return res.status(400).json({ error: 'Reset token and new password are required.' });
    }
    const userId = passwordResetTokens.get(token);
    if (!userId) {
        return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }
    const user = await getUserByIdAsync(userId);
    if (!user) {
        return res.status(400).json({ error: 'User not found for this token.' });
    }
    await updateUserPassword(user.id, await bcrypt.hash(password, 10));
    passwordResetTokens.delete(token);
    res.json({ message: 'Password has been updated. Please log in with your new credentials.' });
});

app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(res);
    res.json({ message: 'Logged out successfully.' });
});

app.get('/api/auth/session', authMiddleware, (req, res) => {
    const { sub, email, name, role, tenant, demo, scopes } = req.user;
    const entitlement = getSessionEntitlement(req.user);
    const keys = apiKeys.get(sub) || [];
    res.json({
        user: { id: sub, email, name, role, tenant, demo: !!demo, scopes: scopes || [], subscription: entitlement },
        session: {
            type: demo ? 'demo' : 'authenticated',
            rbac: role,
            tenant,
            entitlement,
            apiKeys: keys.map(key => ({ id: key.id, label: key.label, prefix: key.prefix, scopes: key.scopes, createdAt: key.createdAt, lastUsedAt: key.lastUsedAt || null })),
            future_ready: ['phone-verification', 'otp', 'payment-verification', 'enterprise-sso', 'mfa']
        }
    });
});

app.get('/api/billing/plans', authMiddleware, async (req, res) => {
    const catalog = await loadCatalogEntries();
    const tierCounts = catalog.reduce((counts, api) => {
        const tier = api.min_tier || 'developer';
        counts[tier] = (counts[tier] || 0) + 1;
        return counts;
    }, {});
    res.json({
        source: 'billing-infrastructure',
        current: getSessionEntitlement(req.user),
        payment_verification: process.env.STRIPE_SECRET_KEY ? 'stripe-ready' : 'sandbox-operational',
        phone_verification: 'future-ready',
        stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'sandbox-checkout',
        plans: PLAN_DEFINITIONS.map(plan => ({ ...plan, api_count: tierCounts[plan.id] || (plan.id === 'professional' ? tierCounts.startup || 0 : 0) }))
    });
});

app.post('/api/billing/invoice-preview', authMiddleware, async (req, res) => {
    const { plan, apiIds = [], quoteType = 'invoice-preview' } = req.body || {};
    const catalog = await loadCatalogEntries();
    const invoice = buildBillingInvoice({
        user: req.user,
        planId: plan,
        apiIds: Array.isArray(apiIds) ? apiIds : [],
        quoteType,
        catalog
    });
    recordAudit('billing.invoice.preview', req.user, {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        sample: invoice.sample,
        total: invoice.totals.total
    });
    res.json({
        source: 'billing-invoice-renderer',
        invoice,
        html: renderInvoiceHtml(invoice),
        actions: {
            preview: true,
            print: true,
            pdf: invoice.sample ? 'sample-print-only' : 'print-to-pdf-ready',
            email: true,
            payable: !invoice.sample
        }
    });
});

app.get('/api/billing/invoices/:invoiceId', authMiddleware, (req, res) => {
    const invoice = invoiceRecords.get(req.params.invoiceId);
    if (!invoice) return res.status(404).send('Invoice not found');
    if (invoice.authorization.tenant !== req.user.tenant && req.user.role !== 'admin') {
        return res.status(403).send('Invoice access denied');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.html"`);
    res.send(renderInvoiceHtml(invoice));
});

app.post('/api/billing/activate', authMiddleware, (req, res) => {
    const { plan = 'developer', provider = 'sandbox' } = req.body || {};
    const selected = PLAN_DEFINITIONS.find(item => item.id === normalizeTier(plan));
    if (!selected || selected.id === 'demo') {
        return res.status(400).json({ error: 'A valid paid or free plan is required.' });
    }
    if (req.user.demo) {
        return res.status(403).json({ error: 'Demo Mode cannot activate subscriptions. Create an account or log in.' });
    }
    const subscription = {
        tier: selected.id,
        status: 'active',
        active: true,
        quota: selected.quota,
        provider: process.env.STRIPE_SECRET_KEY && provider === 'stripe' ? 'stripe' : 'sandbox',
        activatedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        balance: 0,
        domains: TIER_DOMAINS[selected.id] || TIER_DOMAINS.free,
        locked: false
    };
    subscriptions.set(req.user.sub, subscription);
    recordAudit('billing.subscription.activate', req.user, { plan: selected.id, provider: subscription.provider });
    res.json({
        subscription,
        message: `${selected.name} subscription activated for this workspace.`,
        stripe: process.env.STRIPE_SECRET_KEY ? 'ready-for-checkout-session' : 'sandbox-activation-complete'
    });
});

app.get('/api/keys', authMiddleware, requireScopes('read:api'), (req, res) => {
    const keys = apiKeys.get(req.user.sub) || [];
    res.json({
        source: 'api-key-management',
        entitlement: getSessionEntitlement(req.user),
        keys: keys.map(key => ({ id: key.id, label: key.label, prefix: key.prefix, scopes: key.scopes, createdAt: key.createdAt, lastUsedAt: key.lastUsedAt || null }))
    });
});

app.post('/api/keys', authMiddleware, requireScopes('read:api'), (req, res) => {
    if (req.user.demo) {
        return res.status(403).json({ error: 'Demo Mode cannot create persistent API keys.' });
    }
    if (!hasTier(req.user, 'developer')) {
        return res.status(403).json({ error: 'Developer subscription or higher is required to generate API keys.', current: getSessionEntitlement(req.user) });
    }
    const { label = 'Default integration key', scopes = ['read:api', 'search:api', 'execute:sandbox', 'ask:cognitive', 'read:replay'] } = req.body || {};
    const secret = `cintent_${crypto.randomBytes(24).toString('hex')}`;
    const key = {
        id: `key-${crypto.randomBytes(6).toString('hex')}`,
        label,
        prefix: secret.slice(0, 16),
        hash: crypto.createHash('sha256').update(secret).digest('hex'),
        scopes,
        createdAt: new Date().toISOString()
    };
    const keys = apiKeys.get(req.user.sub) || [];
    keys.unshift(key);
    apiKeys.set(req.user.sub, keys);
    recordAudit('api-key.create', req.user, { keyId: key.id, label, scopes });
    res.json({
        key: { id: key.id, label: key.label, prefix: key.prefix, scopes: key.scopes, createdAt: key.createdAt },
        secret,
        warning: 'This secret is shown once. Store it in your deployment secret manager.'
    });
});

app.get('/api/domains', authMiddleware, requireScopes('read:api'), async (req, res) => {
    const catalog = await loadCatalogEntries();
    res.json({
        source: 'backend-domain-roadmap',
        domains: buildDomainPayload(catalog, req.user)
    });
});

app.get('/api/domains/:domainKey', authMiddleware, requireScopes('read:api'), async (req, res) => {
    const catalog = await loadCatalogEntries();
    const domain = buildDomainPayload(catalog, req.user).find(item => item.domain_key === req.params.domainKey);
    if (!domain) {
        return res.status(404).json({ error: 'Domain roadmap not found' });
    }
    const apis = catalog
        .filter(api => (api.domain_key || domainKeyForApi(api)) === domain.domain_key)
        .map(api => applySessionPolicy(api, req.user));
    res.json({
        source: 'backend-domain-roadmap',
        domain,
        apis,
        comingSoon: domain.status === 'coming_soon'
    });
});

app.get('/api/catalog', authMiddleware, requireScopes('read:api'), async (req, res) => {
    try {
        const catalog = await loadCatalogEntries();
        const apis = catalog.map(api => applySessionPolicy(api, req.user));
        res.json({
            apis,
            domains: buildDomainPayload(catalog, req.user),
            applications: APPLICATION_REGISTRY,
            runtime_components: {
                robotics: ROBOTICS_RUNTIME_SERVICES,
                cobotics: COBOTICS_RUNTIME_SERVICES,
                hri: HRI_RUNTIME_SERVICES,
                industrial_robotics: INDUSTRIAL_ROBOTICS_RUNTIME_SERVICES,
                ecosystem_compatibility: ROBOTICS_ECOSYSTEM_COMPATIBILITY,
                uav_standards: UAV_STANDARDS_COMPATIBILITY,
                uav_ecosystems: UAV_ECOSYSTEM_COMPATIBILITY,
                source: 'api-metadata-registry-runtime-components',
                dynamic: true
            },
            documentation: {
                source: 'api-metadata-registry',
                dynamic: true,
                includes: ['overview', 'endpoints', 'request schemas', 'response schemas', 'replay examples', 'orchestration examples', 'governance behavior', 'SDK examples', 'pricing', 'lifecycle states', 'dependencies', 'explainability', 'operational notes']
            }
        });
    } catch (error) {
        console.error('Catalog load failed:', error.message);
        res.status(500).json({ error: 'Failed to load metadata catalog' });
    }
});

app.get('/api/applications', authMiddleware, requireScopes('read:api'), (req, res) => {
    res.json({
        source: 'application-metadata-registry',
        applications: APPLICATION_REGISTRY,
        relationships: APPLICATION_REGISTRY.map(app => ({
            application: app.id,
            relatedApis: app.relatedApis,
            domains: app.domains,
            orchestrationExamples: app.orchestrationExamples,
            replayExamples: app.replayExamples,
            lifecycle: app.lifecycle
        }))
    });
});

app.get('/api/api/:id', authMiddleware, async (req, res) => {
    const id = req.params.id;
    try {
        const catalog = await loadCatalogEntries();
        const api = catalog.find(entry => entry.api_key === id || entry.id === id);
        if (!api) {
            return res.status(404).json({ error: 'API documentation not found.' });
        }
        res.json({ api: applySessionPolicy(api, req.user) });
    } catch (error) {
        console.error('API detail load failed:', error.message);
        res.status(500).json({ error: 'Failed to load API documentation' });
    }
});

app.get('/api/search', authMiddleware, requireScopes('search:api'), async (req, res) => {
    try {
        const filters = {
            q: req.query.q,
            domain: req.query.domain,
            stage: req.query.stage,
            governance: req.query.governance === 'true',
            replay: req.query.replay === 'true',
            sdk: req.query.sdk,
            lifecycle: req.query.lifecycle
        };
        const catalog = await loadCatalogEntries();
        const domains = buildDomainPayload(catalog, req.user);
        const apiResults = searchApiCatalog(catalog, filters).map(api => applySessionPolicy(api, req.user));
        const domainResults = searchDomains(domains, req.query.q);
        res.json({
            results: apiResults,
            domains: domainResults,
            total: apiResults.length + domainResults.length,
            semanticDiscovery: {
                enabled: true,
                strategy: dbEnabled ? 'pgvector semantic search ready' : 'metadata lexical fallback until pgvector is connected',
                supportedFilters: ['domain', 'business problem', 'orchestration type', 'replay support', 'governance support', 'capability', 'SDK support', 'operational category', 'lifecycle state']
            }
        });
    } catch (error) {
        console.error('Search failed:', error.message);
        res.status(500).json({ error: 'Search failed' });
    }
});

app.get('/api/marketplace/apis', authMiddleware, async (req, res) => {
    const catalog = (await loadCatalogEntries()).map(api => applySessionPolicy(api, req.user));
    res.json({ apis: catalog, total: catalog.length, message: 'Enterprise API marketplace' });
});

app.post('/api/playground/execute', authMiddleware, requireScopes('execute:sandbox'), async (req, res) => {
    const { api_key, mode = 'sandbox', input = {}, governanceContext = {} } = req.body || {};
    if (!api_key) {
        return res.status(400).json({ error: 'api_key is required for playground execution.' });
    }
    if (req.user.demo && mode !== 'sandbox') {
        return res.status(403).json({ error: 'Demo Mode only supports sandbox execution.' });
    }
    try {
        const catalog = await loadCatalogEntries();
        const api = catalog.find(entry => entry.api_key === api_key);
        if (!api) {
            return res.status(404).json({ error: 'API not found for sandbox execution.' });
        }
        if (!canExecuteApi(api, req.user, mode)) {
            return res.status(403).json({
                error: 'Current session is not entitled to execute this API in the requested mode.',
                requiredTier: apiRequiredTier(api),
                current: getSessionEntitlement(req.user),
                allowedModes: applySessionPolicy(api, req.user).access_policy.allowed_modes
            });
        }
        const session = buildExecutionSession({ api, user: req.user, mode, input, governanceContext });
        const snapshot = materializeExecutionSession(session);
        recordAudit('playground.execute.session.create', req.user, { api_key, mode, executionId: session.id, status: snapshot.status });
        res.json({
            api: api.name,
            mode,
            status: 'execution-session-created',
            orchestrationId: session.id,
            executionId: session.id,
            executionPlan: session.executionPlan,
            runtime: snapshot,
            stream: {
                sse: `/api/executions/${session.id}/events`,
                polling: `/api/executions/${session.id}/status`,
                intervalMs: 350
            },
            session: { type: req.user.demo ? 'demo' : 'authenticated', tenant: req.user.tenant, scopes: req.user.scopes },
            request: { tenantId: req.user.tenant, mode, input, governanceContext }
        });
    } catch (error) {
        console.error('Playground execution failed:', error.message);
        res.status(500).json({ error: 'Sandbox execution failed' });
    }
});

app.get('/api/executions/:executionId/status', authMiddleware, (req, res) => {
    const session = executionSessions.get(req.params.executionId);
    if (!session) return res.status(404).json({ error: 'Execution session not found' });
    if (session.tenant !== req.user.tenant && req.user.role !== 'admin') return res.status(403).json({ error: 'Execution session access denied' });
    res.json(materializeExecutionSession(session));
});

app.get('/api/executions/:executionId/events', authMiddleware, (req, res) => {
    const session = executionSessions.get(req.params.executionId);
    if (!session) {
        res.status(404).json({ error: 'Execution session not found' });
        return;
    }
    if (session.tenant !== req.user.tenant && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Execution session access denied' });
        return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();
    const send = () => {
        const snapshot = materializeExecutionSession(session);
        res.write(`event: execution-update\n`);
        res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
        if (snapshot.status === 'completed' || snapshot.status === 'failed') {
            clearInterval(timer);
            res.write(`event: execution-complete\n`);
            res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
            res.end();
        }
    };
    const timer = setInterval(send, 350);
    send();
    req.on('close', () => clearInterval(timer));
});

app.get('/api/simulations/catalog', authMiddleware, async (req, res) => {
    const catalog = await loadCatalogEntries();
    res.json({
        source: 'cognitive-simulation-registry',
        session_type: req.user.demo ? 'demo' : 'authenticated',
        entitlement: getSessionEntitlement(req.user),
        simulations: buildSimulationCatalog(req.user, catalog)
    });
});

app.post('/api/simulations/execute', authMiddleware, requireScopes('execute:sandbox'), async (req, res) => {
    const { simulationId, mode = 'sandbox', input = {} } = req.body || {};
    if (req.user.demo && mode !== 'sandbox') return res.status(403).json({ error: 'Demo Mode only supports sandbox simulations.' });
    const catalog = await loadCatalogEntries();
    const template = SIMULATION_TEMPLATES.find(item => item.id === simulationId);
    if (!template) return res.status(404).json({ error: 'Simulation template not found' });
    const access = simulationAccess(template, req.user);
    if (!access.simulationEnabled) return res.status(403).json({ error: 'Simulation is not enabled for this tenant or subscription.', access });
    const api = catalog.find(entry => entry.api_key === template.apiKey)
        || catalog.find(entry => (entry.domain_key || domainKeyForApi(entry)) === template.domain)
        || catalog[0];
    if (!api || !canExecuteApi(api, req.user, mode)) return res.status(403).json({ error: 'Selected simulation API is not executable for this session.', access });
    const runtime = buildSimulationRuntime(template, api, req.user, mode, input);
    simulationEvents.unshift({
        id: runtime.simulationId,
        tenant: req.user.tenant,
        templateId: template.id,
        domain: template.domain,
        api_name: api.name,
        status: 'completed',
        runtime,
        timestamp: runtime.createdAt
    });
    if (simulationEvents.length > 200) simulationEvents.pop();
    recordAudit('simulation.execute', req.user, {
        simulationId: runtime.simulationId,
        templateId: template.id,
        domain: template.domain,
        anomalyDetected: runtime.telemetry.anomalyDetected
    });
    res.json(runtime);
});

app.post('/api/ask', authMiddleware, requireScopes('ask:cognitive'), async (req, res) => {
    const { query } = req.body || {};
    if (!query) {
        return res.status(400).json({ error: 'Query is required for Ask COGNI.' });
    }
    try {
        const catalog = await loadCatalogEntries();
        const domainMatches = searchDomains(buildDomainPayload(catalog, req.user), query);
        const applicationMatches = searchApplications(query);
        const queryText = String(query).toLowerCase();
        const ranked = catalog
            .map(api => {
                const sources = [
                    api.name,
                    api.short_description,
                    api.full_description,
                    api.tags.join(' '),
                    api.capabilities.join(' '),
                    api.operational_notes,
                    api.rag_context,
                    JSON.stringify(api.replay_examples || []),
                    JSON.stringify(api.orchestration_examples || []),
                    JSON.stringify(api.explainability_examples || []),
                    JSON.stringify(api.sdk_examples || {}),
                    JSON.stringify(api.dependencies || []),
                    api.lifecycle_state
                ].join(' ').toLowerCase();
                const score = tokenizeQuery(queryText).reduce((sum, token) => sum + (sources.includes(token) ? 1 : 0), 0);
                return { api, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map(item => applySessionPolicy(item.api, req.user));
        const roboticsApis = catalog.filter(api => ['robotics', 'cobotics'].includes(api.domain_key || domainKeyForApi(api)));
        const coboticsApis = catalog.filter(isCoboticsRuntimeApi);
        const hriApis = catalog.filter(isHriRuntimeApi);
        const industrialApis = catalog.filter(isIndustrialRoboticsRuntimeApi);
        const latestRoboticsRuntime = executionEvents.find(event => ['robotics', 'cobotics'].includes((event.executionPlan && event.executionPlan.domain) || ''))
            || simulationEvents.find(event => ['robotics', 'cobotics'].includes(event.domain));
        const latestCoboticsRuntime = executionEvents.find(event => event.coboticsRuntime || (event.executionPlan && event.executionPlan.domain === 'cobotics'))
            || simulationEvents.find(event => event.runtime && event.runtime.coboticsRuntime);
        const latestHriRuntime = executionEvents.find(event => event.hriRuntime)
            || simulationEvents.find(event => event.runtime && event.runtime.hriRuntime);
        const latestIndustrialRuntime = executionEvents.find(event => event.industrialRuntime)
            || simulationEvents.find(event => event.runtime && event.runtime.industrialRuntime);

        const response = {
            query,
            architecture: {
                assistant: 'Ask COGNI Cognitive Platform Assistant',
                ragFlow: ['user query', dbEnabled ? 'pgvector semantic search' : 'metadata lexical fallback', 'retrieve API docs/examples/dependencies/lifecycle', 'LLM reasoning ready', 'structured platform response'],
                genericChatbot: false
            },
            results: ranked,
            answer: ranked.length
                ? `Found ${ranked.length} metadata-backed matches. Start with ${ranked.slice(0, 3).map(api => api.name).join(', ')}. Use sandbox execution, review governance behavior, inspect replay examples, and verify lifecycle state before production entitlement.`
                : 'No matching APIs were found. Try broader terms such as governance, replay, orchestration, distributed cognition, SDK, drone, robotics, or travel.',
            structuredResponse: ranked.map(api => ({
                api_key: api.api_key,
                name: api.name,
                lifecycle: api.lifecycle_state,
                domain: api.category_name,
                governance: api.governance_support,
                replay: api.replay_support,
                dependencies: api.dependencies,
                sdk: api.sdk_examples,
                demoRestricted: api.access_policy.demo_restricted
            })),
            domainResponse: domainMatches.slice(0, 6).map(domain => ({
                domain_key: domain.domain_key,
                title: domain.title,
                status: domain.status,
                api_count: domain.api_count,
                vision: domain.vision,
                planned_capabilities: domain.planned_capabilities,
                roadmap_visibility: domain.roadmap_visibility
            })),
            applicationResponse: applicationMatches.slice(0, 4).map(app => ({
                id: app.id,
                name: app.name,
                status: app.status,
                lifecycle: app.lifecycle,
                domains: app.domains,
                relatedApis: app.relatedApis,
                tags: app.tags,
                orchestrationExamples: app.orchestrationExamples,
                replayExamples: app.replayExamples
            })),
            roboticsContext: {
                phase: 'PHASE-6D-RC-CORE',
                positioning: 'Cognitive orchestration infrastructure for robotics ecosystems, not robotics firmware, ROS replacement, PLC logic, or actuator control.',
                apiCount: roboticsApis.length,
                runtimeServices: ROBOTICS_RUNTIME_SERVICES,
                ecosystemCompatibility: ROBOTICS_ECOSYSTEM_COMPATIBILITY,
                coreCapabilities: ['robotic orchestration', 'human-aware coordination', 'fleet coordination', 'safety governance', 'replay reconstruction', 'multimodal robotic cognition', 'edge robotics coordination', 'digital twin readiness'],
                APIs: roboticsApis.slice(0, 10).map(api => ({
                    api_key: api.api_key,
                    name: api.name,
                    lifecycle: api.lifecycle_state,
                    min_tier: api.min_tier,
                    dependencies: api.dependencies,
                    replay: api.replay_support,
                    governance: api.governance_support
                })),
                latestRuntime: latestRoboticsRuntime ? {
                    id: latestRoboticsRuntime.id,
                    domain: latestRoboticsRuntime.domain || (latestRoboticsRuntime.executionPlan && latestRoboticsRuntime.executionPlan.domain),
                    api: latestRoboticsRuntime.api_name,
                    status: latestRoboticsRuntime.status || (latestRoboticsRuntime.runtime && latestRoboticsRuntime.runtime.lifecycle) || 'captured',
                    replay: latestRoboticsRuntime.replay || (latestRoboticsRuntime.runtime && latestRoboticsRuntime.runtime.replayPackage) || null
                } : null
            },
            coboticsContext: {
                phase: 'PHASE-6D-RC-COBOT',
                positioning: 'Human-aware collaborative robotics cognitive infrastructure for shared workspace orchestration, not firmware, PLC, ROS, motion-control, or actuator programming.',
                apiCount: coboticsApis.length,
                runtimeServices: COBOTICS_RUNTIME_SERVICES,
                ecosystemCompatibility: ROBOTICS_ECOSYSTEM_COMPATIBILITY.filter(item => ['ros2', 'gemini-robotics', 'nvidia-isaac', 'fairino', 'flask-iot'].includes(item.id)),
                coreCapabilities: ['human-aware coordination', 'shared workspace orchestration', 'collaborative safety governance', 'intent synchronization', 'adaptive coordination', 'collaborative replay', 'human-robot observability', 'collaborative explainability'],
                APIs: coboticsApis.slice(0, 12).map(api => ({
                    api_key: api.api_key,
                    name: api.name,
                    lifecycle: api.lifecycle_state,
                    min_tier: api.min_tier,
                    dependencies: api.dependencies,
                    replay: api.replay_support,
                    governance: api.governance_support
                })),
                latestRuntime: latestCoboticsRuntime ? {
                    id: latestCoboticsRuntime.id,
                    domain: latestCoboticsRuntime.domain || (latestCoboticsRuntime.executionPlan && latestCoboticsRuntime.executionPlan.domain),
                    api: latestCoboticsRuntime.api_name,
                    status: latestCoboticsRuntime.status || (latestCoboticsRuntime.runtime && latestCoboticsRuntime.runtime.lifecycle) || 'captured',
                    replay: latestCoboticsRuntime.replay || (latestCoboticsRuntime.runtime && latestCoboticsRuntime.runtime.replayPackage) || null
                } : null
            },
            hriContext: {
                phase: 'PHASE-6D-RC-HRI',
                positioning: 'Human-Robot Interaction cognitive infrastructure for human intent, multimodal interaction, trust-aware collaboration, override governance, replay, explainability, and safe collaborative execution. Not chatbot robotics, voice assistant replacement, robotic UI scripting, or isolated cobot logic.',
                apiCount: hriApis.length,
                runtimeServices: HRI_RUNTIME_SERVICES,
                shunyaAiAlignment: 'Multimodal and multilingual interaction orchestration aligns with Shunya-AI language cognition infrastructure.',
                coreCapabilities: ['human intent cognition', 'multimodal interaction runtime', 'contextual adaptation', 'human override governance', 'human safety propagation', 'trust confidence scoring', 'interaction replay', 'human-aware explainability', 'behavioral signal awareness', 'edge HRI readiness'],
                APIs: hriApis.slice(0, 15).map(api => ({
                    api_key: api.api_key,
                    name: api.name,
                    lifecycle: api.lifecycle_state,
                    min_tier: api.min_tier,
                    dependencies: api.dependencies,
                    replay: api.replay_support,
                    governance: api.governance_support
                })),
                latestRuntime: latestHriRuntime ? {
                    id: latestHriRuntime.id,
                    domain: latestHriRuntime.domain || (latestHriRuntime.executionPlan && latestHriRuntime.executionPlan.domain),
                    api: latestHriRuntime.api_name,
                    status: latestHriRuntime.status || (latestHriRuntime.runtime && latestHriRuntime.runtime.lifecycle) || 'captured',
                    replay: latestHriRuntime.replay || (latestHriRuntime.runtime && latestHriRuntime.runtime.replayPackage) || null,
                    telemetry: latestHriRuntime.hriRuntime ? latestHriRuntime.hriRuntime.telemetry : (latestHriRuntime.runtime && latestHriRuntime.runtime.hriRuntime && latestHriRuntime.runtime.hriRuntime.telemetry)
                } : null
            },
            industrialRoboticsContext: {
                phase: 'PHASE-6D-RC-IROBOT',
                positioning: 'Industrial robotics cognitive orchestration infrastructure for manufacturing, factory coordination, predictive orchestration, replay, explainability, and governance. Not PLC firmware, SCADA, MES, motion controller, robotic controller firmware, or ROS industrial replacement.',
                apiCount: industrialApis.length,
                runtimeServices: INDUSTRIAL_ROBOTICS_RUNTIME_SERVICES,
                ecosystemCompatibility: ROBOTICS_ECOSYSTEM_COMPATIBILITY.filter(item => ['ros2', 'nvidia-isaac', 'abb-rws', 'kuka', 'fairino', 'hebi', 'flask-iot'].includes(item.id)),
                coreCapabilities: ['manufacturing orchestration', 'factory coordination', 'predictive execution', 'industrial governance', 'industrial replay', 'factory observability', 'digital twin readiness', 'anomaly coordination'],
                APIs: industrialApis.slice(0, 12).map(api => ({
                    api_key: api.api_key,
                    name: api.name,
                    lifecycle: api.lifecycle_state,
                    min_tier: api.min_tier,
                    dependencies: api.dependencies,
                    replay: api.replay_support,
                    governance: api.governance_support
                })),
                latestRuntime: latestIndustrialRuntime ? {
                    id: latestIndustrialRuntime.id,
                    domain: latestIndustrialRuntime.domain || (latestIndustrialRuntime.executionPlan && latestIndustrialRuntime.executionPlan.domain),
                    api: latestIndustrialRuntime.api_name,
                    status: latestIndustrialRuntime.status || (latestIndustrialRuntime.runtime && latestIndustrialRuntime.runtime.lifecycle) || 'captured',
                    replay: latestIndustrialRuntime.replay || (latestIndustrialRuntime.runtime && latestIndustrialRuntime.runtime.replayPackage) || null
                } : null
            },
            uavContext: {
                phase: 'UAV_STANDARDS_COMPLIANCE_READINESS',
                positioning: 'Cognitive Infrastructure Layer for Autonomous Air Systems, not a flight controller replacement.',
                standards: UAV_STANDARDS_COMPATIBILITY,
                ecosystems: UAV_ECOSYSTEM_COMPATIBILITY,
                APIs: catalog.filter(isUavRuntimeApi).slice(0, 12).map(api => ({
                    api_key: api.api_key,
                    name: api.name,
                    standards: (api.uav_compliance_contract && api.uav_compliance_contract.standards) || [],
                    ecosystems: (api.uav_compliance_contract && api.uav_compliance_contract.uav_ecosystems) || [],
                    replay: api.replay_support,
                    governance: api.governance_support
                })),
                coreCapabilities: ['Remote ID readiness', 'DGCA/DigitalSky readiness', 'UTM orchestration', 'MAVLink mission telemetry', 'PX4/ArduPilot/DroneKit/MAVSDK compatibility', 'aerial swarm coordination', 'edge UAV runtime readiness']
            },
            performanceContext: {
                api_usage: executionEvents.length,
                simulation_usage: simulationEvents.length,
                replay_activity: executionEvents.filter(event => event.replay && event.replay.replayId).length,
                governance_events: executionEvents.filter(event => event.governance && event.governance.status).length,
                audit_events: auditEvents.length,
                operational_health: 'healthy'
            },
            latestExecutionContext: Array.from(executionSessions.values()).find(session => session.tenant === req.user.tenant && session.status !== 'completed') ? (() => {
                const live = materializeExecutionSession(Array.from(executionSessions.values()).find(session => session.tenant === req.user.tenant && session.status !== 'completed'));
                return {
                    executionId: live.executionId,
                    api: live.api,
                    mode: live.mode,
                    stages: live.stages,
                    confidenceTimeline: live.confidenceTimeline,
                    governance: live.governancePropagation,
                    replay: live.replayPackage,
                    dependencies: live.dependencyGraph,
                    runtimeStatus: live.status
                };
            })() : executionEvents[0] ? {
                executionId: executionEvents[0].id,
                api: executionEvents[0].api_name,
                mode: executionEvents[0].mode,
                stages: executionEvents[0].executionPlan ? executionEvents[0].executionPlan.stages : [],
                confidenceTimeline: executionEvents[0].confidenceEvolution || [],
                governance: executionEvents[0].governance,
                replay: executionEvents[0].replay,
                dependencies: executionEvents[0].dependencyVisibility || [],
                runtimeStatus: executionEvents[0].status && executionEvents[0].status.includes('success') ? 'completed' : executionEvents[0].status
            } : null,
            latestSimulationContext: simulationEvents[0] ? {
                simulationId: simulationEvents[0].id,
                templateId: simulationEvents[0].templateId,
                domain: simulationEvents[0].domain,
                api: simulationEvents[0].api_name,
                nodes: simulationEvents[0].runtime.nodes,
                agents: simulationEvents[0].runtime.agents,
                replayPackage: simulationEvents[0].runtime.replayPackage,
                telemetry: simulationEvents[0].runtime.telemetry,
                explainability: simulationEvents[0].runtime.explainability
            } : null
        };
        recordAudit('ask-cogni.query', req.user, { query, matches: ranked.length });
        res.json(response);
    } catch (error) {
        console.error('Ask COGNI failed:', error.message);
        res.status(500).json({ error: 'Ask COGNI processing failed.' });
    }
});

app.get('/api/visualizer/data', authMiddleware, (req, res) => {
    const visibleEvents = executionEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const latest = visibleEvents[0] || null;
    const fallbackLineage = ['auth-gateway', 'metadata-registry', 'intent-normalization', 'orchestration-runtime', 'governance-propagation', 'replay-capture', 'response-envelope'];
    const latestTrace = latest && Array.isArray(latest.orchestrationTrace) && latest.orchestrationTrace.length
        ? latest.orchestrationTrace
        : fallbackLineage.map((step, index) => ({ order: index + 1, step, source: 'baseline-visualizer', status: 'ready' }));
    const nodes = latest && latest.visualization ? latest.visualization.nodes : latestTrace.map(item => ({ id: item.step, label: item.step, group: item.order < 3 ? 'input' : item.order > latestTrace.length - 2 ? 'output' : 'cognition' }));
    const edges = latest && latest.visualization ? latest.visualization.edges : nodes.slice(1).map((node, index) => ({ from: nodes[index].id, to: node.id, label: 'flow' }));
    res.json({
        source: 'replay-orchestration-runtime',
        mode: req.user.demo ? 'limited-demo' : 'tenant-operational',
        orchestration_graph: {
            id: latest ? latest.id : 'baseline-orchestration-preview',
            api: latest ? latest.api_name : 'No execution yet',
            mode: latest ? latest.mode : 'preview',
            status: latest ? latest.status : 'ready',
            nodes,
            edges
        },
        replay_timeline: visibleEvents.slice(0, 10).map(event => ({ execution: event.id, replay: event.replay, timestamp: event.timestamp })),
        governance_propagation: latest ? latest.governance : {},
        confidence_evolution: latest ? latest.confidenceEvolution : [],
        distributed_synchronization: latest ? latest.distributedSynchronization : [],
        dependency_relationships: latest ? latest.dependencyVisibility || [] : [],
        execution_lineage: latestTrace
    });
});

app.get('/api/robotics/runtime/services', authMiddleware, requireScopes('read:api'), async (req, res) => {
    const catalog = await loadCatalogEntries();
    const roboticsApis = catalog.filter(isRoboticsRuntimeApi).map(api => applySessionPolicy(api, req.user));
    res.json({
        source: 'robotics-runtime-service-registry',
        phase: 'PHASE-6D-RC-CORE-RUNTIME',
        positioning: 'Robotics cognitive runtime infrastructure. No firmware, motor control, PLC logic, ROS replacement, or actuator SDK duplication.',
        entitlement: getSessionEntitlement(req.user),
        runtime_services: ROBOTICS_RUNTIME_SERVICES,
        metadata_apis: roboticsApis,
        streaming: { primary: 'SSE', fallback: 'polling', endpointPattern: '/api/executions/:executionId/events' }
    });
});

app.get('/api/robotics/ecosystems', authMiddleware, requireScopes('read:api'), async (req, res) => {
    const catalog = await loadCatalogEntries();
    const roboticsApis = catalog.filter(api => isRoboticsRuntimeApi(api) || isIndustrialRoboticsRuntimeApi(api));
    const coverage = ROBOTICS_ECOSYSTEM_COMPATIBILITY.map(ecosystem => {
        const apiMatches = roboticsApis
            .filter(api => resolveRoboticsEcosystems(api).some(item => item.id === ecosystem.id))
            .map(api => api.api_key);
        return { ...ecosystem, apiMatches, apiCount: apiMatches.length };
    });
    res.json({
        source: 'robotics-ecosystem-compatibility-registry',
        positioning: 'Cognitive Orchestration Infrastructure for Robotics Ecosystems. CINTENT orchestrates cognition above heterogeneous robotics stacks and does not replace them.',
        ros2_baseline: { latestStable: 'Kilted Kaiju', latestLts: 'Jazzy Jalisco', verifiedFrom: 'https://docs.ros.org/' },
        compatibility: coverage,
        multi_stack_examples: [
            ['ros2', 'nvidia-isaac'],
            ['abb-rws', 'gemini-robotics'],
            ['kuka', 'hebi'],
            ['flask-iot', 'nvidia-isaac'],
            ['fairino', 'gemini-robotics'],
            ['ros2', 'flask-iot', 'nvidia-isaac']
        ]
    });
});

app.get('/api/uav/standards', authMiddleware, requireScopes('read:api'), async (req, res) => {
    const catalog = await loadCatalogEntries();
    const uavApis = catalog.filter(isUavRuntimeApi).map(api => applySessionPolicy(api, req.user));
    const standardCoverage = UAV_STANDARDS_COMPATIBILITY.map(standard => {
        const apiMatches = uavApis.filter(api => ((api.uav_compliance_contract && api.uav_compliance_contract.standards) || []).includes(standard.id)).map(api => api.api_key);
        return { ...standard, apiMatches, apiCount: apiMatches.length };
    });
    const ecosystemCoverage = UAV_ECOSYSTEM_COMPATIBILITY.map(ecosystem => {
        const apiMatches = uavApis.filter(api => ((api.uav_compliance_contract && api.uav_compliance_contract.uav_ecosystems) || []).includes(ecosystem.id)).map(api => api.api_key);
        return { ...ecosystem, apiMatches, apiCount: apiMatches.length };
    });
    res.json({
        source: 'uav-standards-compatibility-registry',
        positioning: 'Cognitive Infrastructure Layer for Autonomous Air Systems. CINTENT orchestrates cognition above UAV ecosystems and does not replace flight controllers.',
        certification_claim: false,
        standards: standardCoverage,
        ecosystems: ecosystemCoverage,
        dgca_categories: ['Nano', 'Micro', 'Small', 'Medium', 'Large UAVs'],
        multi_stack_examples: [
            ['px4', 'mavlink', 'ros2-uav'],
            ['dji-sdk', 'astm-f3411', 'icao-utm'],
            ['ardupilot', 'mavsdk', 'edge-uav-runtime'],
            ['dronekit', 'mavlink', 'dgca-india-2021'],
            ['ros2-uav', 'edge-uav-runtime', 'icao-utm']
        ]
    });
});

app.get('/api/uav/runtime/telemetry', authMiddleware, requireScopes('read:api'), async (req, res) => {
    const catalog = await loadCatalogEntries();
    const tenantEvents = executionEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const tenantSimulations = simulationEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const activeUavSessions = Array.from(executionSessions.values())
        .filter(session => session.tenant === req.user.tenant && session.telemetry.uavRuntime)
        .map(materializeExecutionSession);
    const completedUavExecutions = tenantEvents.filter(event => event.uavRuntime);
    const uavSimulations = tenantSimulations.filter(event => event.runtime && event.runtime.uavRuntime);
    const frames = [
        ...activeUavSessions.map(runtime => runtime.uavTelemetry).filter(Boolean),
        ...completedUavExecutions.map(event => event.uavRuntime && event.uavRuntime.telemetry).filter(Boolean),
        ...uavSimulations.map(event => event.runtime.uavRuntime && event.runtime.uavRuntime.telemetry).filter(Boolean)
    ];
    const aggregate = frames.reduce((acc, frame) => {
        acc.remote_id_events += frame.remote_id_events || 0;
        acc.mavlink_events += frame.mavlink_events || 0;
        acc.utm_events += frame.utm_events || 0;
        acc.dgca_events += frame.dgca_events || 0;
        acc.swarm_events += frame.swarm_events || 0;
        acc.edge_events += frame.edge_events || 0;
        acc.governance_events += frame.governance_events || 0;
        acc.replay_events += frame.replay_events || 0;
        acc.synchronization_events += frame.synchronization_events || 0;
        acc.confidence_samples.push(frame.final_mission_confidence || 0);
        return acc;
    }, { remote_id_events: 0, mavlink_events: 0, utm_events: 0, dgca_events: 0, swarm_events: 0, edge_events: 0, governance_events: 0, replay_events: 0, synchronization_events: 0, confidence_samples: [] });
    aggregate.average_mission_confidence = aggregate.confidence_samples.length
        ? Number((aggregate.confidence_samples.reduce((sum, value) => sum + value, 0) / aggregate.confidence_samples.length).toFixed(3))
        : 0;
    res.json({
        source: 'uav-observability-runtime',
        positioning: 'Cognitive Infrastructure Layer for Autonomous Air Systems',
        standards_count: UAV_STANDARDS_COMPATIBILITY.length,
        ecosystems_count: UAV_ECOSYSTEM_COMPATIBILITY.length,
        api_count: catalog.filter(isUavRuntimeApi).length,
        active_sessions: activeUavSessions,
        completed_executions: completedUavExecutions.slice(0, 10),
        simulations: uavSimulations.slice(0, 10),
        aggregate
    });
});

app.get('/api/robotics/runtime/telemetry', authMiddleware, requireScopes('read:api'), async (req, res) => {
    const catalog = await loadCatalogEntries();
    const tenantEvents = executionEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const tenantSimulations = simulationEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const activeRoboticsSessions = Array.from(executionSessions.values())
        .filter(session => session.tenant === req.user.tenant && isRoboticsRuntimeApi({ domain_key: session.executionPlan.domain, api_key: session.api_key, name: session.api_name, tags: ['robotics'] }))
        .map(materializeExecutionSession);
    const completedRoboticsExecutions = tenantEvents.filter(event => event.roboticsRuntime || ['robotics', 'cobotics'].includes((event.executionPlan && event.executionPlan.domain) || ''));
    const roboticsSimulations = tenantSimulations.filter(event => event.runtime && event.runtime.roboticsRuntime);
    const telemetryFrames = [
        ...activeRoboticsSessions.map(runtime => runtime.roboticsTelemetry).filter(Boolean),
        ...completedRoboticsExecutions.map(event => event.roboticsRuntime && event.roboticsRuntime.telemetry).filter(Boolean),
        ...roboticsSimulations.map(event => event.runtime.roboticsRuntime && event.runtime.roboticsRuntime.telemetry).filter(Boolean)
    ];
    const aggregate = telemetryFrames.reduce((acc, frame) => {
        acc.orchestration_latency_ms += frame.orchestration_latency_ms || 0;
        acc.synchronization_events += frame.synchronization_events || 0;
        acc.replay_events += frame.replay_events || 0;
        acc.governance_interventions += frame.governance_interventions || 0;
        acc.execution_anomalies += frame.execution_anomalies || 0;
        acc.robotic_coordination_activity += frame.robotic_coordination_activity || 0;
        acc.confidence_samples.push(frame.final_confidence || 0);
        if (frame.synchronization_health === 'degraded') acc.synchronization_health = 'degraded';
        return acc;
    }, {
        orchestration_latency_ms: 0,
        synchronization_health: 'healthy',
        synchronization_events: 0,
        replay_events: 0,
        governance_interventions: 0,
        execution_anomalies: 0,
        confidence_samples: [],
        robotic_coordination_activity: 0
    });
    aggregate.average_confidence = aggregate.confidence_samples.length
        ? Number((aggregate.confidence_samples.reduce((sum, value) => sum + value, 0) / aggregate.confidence_samples.length).toFixed(3))
        : 0;
    res.json({
        source: 'robotics-observability-runtime',
        phase: 'PHASE-6D-RC-CORE-RUNTIME',
        entitlement: getSessionEntitlement(req.user),
        api_count: catalog.filter(isRoboticsRuntimeApi).length,
        runtime_services: ROBOTICS_RUNTIME_SERVICES,
        active_sessions: activeRoboticsSessions,
        completed_executions: completedRoboticsExecutions.slice(0, 10),
        simulations: roboticsSimulations.slice(0, 10),
        aggregate
    });
});

app.get('/api/cobotics/runtime/services', authMiddleware, requireScopes('read:api'), async (req, res) => {
    const catalog = await loadCatalogEntries();
    const coboticsApis = catalog.filter(isCoboticsRuntimeApi).map(api => applySessionPolicy(api, req.user));
    res.json({
        source: 'cobotics-runtime-service-registry',
        phase: 'PHASE-6D-RC-COBOT',
        positioning: 'Human-aware collaborative robotics cognitive infrastructure. No firmware, PLC replacement, ROS hardware control, motion planning firmware, or actuator programming.',
        entitlement: getSessionEntitlement(req.user),
        runtime_services: COBOTICS_RUNTIME_SERVICES,
        metadata_apis: coboticsApis,
        streaming: { primary: 'SSE', fallback: 'polling', endpointPattern: '/api/executions/:executionId/events' }
    });
});

app.get('/api/cobotics/runtime/telemetry', authMiddleware, requireScopes('read:api'), async (req, res) => {
    const catalog = await loadCatalogEntries();
    const tenantEvents = executionEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const tenantSimulations = simulationEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const activeCoboticsSessions = Array.from(executionSessions.values())
        .filter(session => session.tenant === req.user.tenant && isCoboticsRuntimeApi({ domain_key: session.executionPlan.domain, api_key: session.api_key, name: session.api_name, tags: ['cobotics'] }))
        .map(materializeExecutionSession);
    const completedCoboticsExecutions = tenantEvents.filter(event => event.coboticsRuntime || (event.executionPlan && event.executionPlan.domain === 'cobotics'));
    const coboticsSimulations = tenantSimulations.filter(event => event.runtime && event.runtime.coboticsRuntime);
    const telemetryFrames = [
        ...activeCoboticsSessions.map(runtime => runtime.coboticsTelemetry).filter(Boolean),
        ...completedCoboticsExecutions.map(event => event.coboticsRuntime && event.coboticsRuntime.telemetry).filter(Boolean),
        ...coboticsSimulations.map(event => event.runtime.coboticsRuntime && event.runtime.coboticsRuntime.telemetry).filter(Boolean)
    ];
    const aggregate = telemetryFrames.reduce((acc, frame) => {
        acc.collaborative_latency_ms += frame.collaborative_latency_ms || 0;
        acc.human_interaction_events += frame.human_interaction_events || 0;
        acc.safety_interventions += frame.safety_interventions || 0;
        acc.synchronization_events += frame.synchronization_events || 0;
        acc.replay_events += frame.replay_events || 0;
        acc.governance_events += frame.governance_events || 0;
        acc.anomaly_events += frame.anomaly_events || 0;
        acc.adaptive_reassignment_events += frame.adaptive_reassignment_events || 0;
        acc.confidence_samples.push(frame.final_collaborative_confidence || 0);
        return acc;
    }, {
        collaborative_latency_ms: 0,
        human_interaction_events: 0,
        safety_interventions: 0,
        synchronization_events: 0,
        replay_events: 0,
        governance_events: 0,
        anomaly_events: 0,
        adaptive_reassignment_events: 0,
        confidence_samples: []
    });
    aggregate.average_collaborative_confidence = aggregate.confidence_samples.length
        ? Number((aggregate.confidence_samples.reduce((sum, value) => sum + value, 0) / aggregate.confidence_samples.length).toFixed(3))
        : 0;
    res.json({
        source: 'human-robot-observability-layer',
        phase: 'PHASE-6D-RC-COBOT',
        entitlement: getSessionEntitlement(req.user),
        api_count: catalog.filter(isCoboticsRuntimeApi).length,
        runtime_services: COBOTICS_RUNTIME_SERVICES,
        active_sessions: activeCoboticsSessions,
        completed_executions: completedCoboticsExecutions.slice(0, 10),
        simulations: coboticsSimulations.slice(0, 10),
        aggregate
    });
});

app.get('/api/hri/runtime/services', authMiddleware, requireScopes('read:api'), async (req, res) => {
    const catalog = await loadCatalogEntries();
    const hriApis = catalog.filter(isHriRuntimeApi).map(api => applySessionPolicy(api, req.user));
    res.json({
        source: 'hri-runtime-service-registry',
        phase: 'PHASE-6D-RC-HRI',
        positioning: 'Human-Robot Interaction cognitive infrastructure. Not chatbot robotics, voice assistant replacement, robotic UI scripting, speech recognition, or isolated cobot logic.',
        entitlement: getSessionEntitlement(req.user),
        runtime_services: HRI_RUNTIME_SERVICES,
        metadata_apis: hriApis,
        shunya_ai_alignment: 'Multimodal and multilingual interaction contracts align with Shunya-AI multilingual cognition infrastructure.',
        edge_readiness: ['local interaction orchestration', 'low-latency adaptation', 'offline synchronization recovery', 'edge confidence propagation', 'distributed collaborative cognition'],
        streaming: { primary: 'SSE', fallback: 'polling', endpointPattern: '/api/executions/:executionId/events' }
    });
});

app.get('/api/hri/runtime/telemetry', authMiddleware, requireScopes('read:api'), async (req, res) => {
    const catalog = await loadCatalogEntries();
    const tenantEvents = executionEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const tenantSimulations = simulationEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const activeHriSessions = Array.from(executionSessions.values())
        .filter(session => session.tenant === req.user.tenant && session.telemetry.hriRuntime)
        .map(materializeExecutionSession);
    const completedHriExecutions = tenantEvents.filter(event => event.hriRuntime);
    const hriSimulations = tenantSimulations.filter(event => event.runtime && event.runtime.hriRuntime);
    const telemetryFrames = [
        ...activeHriSessions.map(runtime => runtime.hriTelemetry).filter(Boolean),
        ...completedHriExecutions.map(event => event.hriRuntime && event.hriRuntime.telemetry).filter(Boolean),
        ...hriSimulations.map(event => event.runtime.hriRuntime && event.runtime.hriRuntime.telemetry).filter(Boolean)
    ];
    const aggregate = telemetryFrames.reduce((acc, frame) => {
        acc.interaction_latency_ms += frame.interaction_latency_ms || 0;
        acc.intent_events += frame.intent_events || 0;
        acc.multimodal_events += frame.multimodal_events || 0;
        acc.contextual_adaptation_events += frame.contextual_adaptation_events || 0;
        acc.override_events += frame.override_events || 0;
        acc.safety_events += frame.safety_events || 0;
        acc.trust_confidence_events += frame.trust_confidence_events || 0;
        acc.behavioral_signal_events += frame.behavioral_signal_events || 0;
        acc.edge_readiness_events += frame.edge_readiness_events || 0;
        acc.governance_events += frame.governance_events || 0;
        acc.replay_events += frame.replay_events || 0;
        acc.synchronization_events += frame.synchronization_events || 0;
        acc.multilingual_alignment = acc.multilingual_alignment || !!frame.multilingual_alignment;
        acc.confidence_samples.push(frame.final_human_trust_confidence || 0);
        return acc;
    }, {
        interaction_latency_ms: 0,
        intent_events: 0,
        multimodal_events: 0,
        contextual_adaptation_events: 0,
        override_events: 0,
        safety_events: 0,
        trust_confidence_events: 0,
        behavioral_signal_events: 0,
        edge_readiness_events: 0,
        governance_events: 0,
        replay_events: 0,
        synchronization_events: 0,
        multilingual_alignment: false,
        confidence_samples: []
    });
    aggregate.average_human_trust_confidence = aggregate.confidence_samples.length
        ? Number((aggregate.confidence_samples.reduce((sum, value) => sum + value, 0) / aggregate.confidence_samples.length).toFixed(3))
        : 0;
    res.json({
        source: 'hri-collaboration-telemetry-runtime',
        phase: 'PHASE-6D-RC-HRI',
        entitlement: getSessionEntitlement(req.user),
        api_count: catalog.filter(isHriRuntimeApi).length,
        runtime_services: HRI_RUNTIME_SERVICES,
        active_sessions: activeHriSessions,
        completed_executions: completedHriExecutions.slice(0, 10),
        simulations: hriSimulations.slice(0, 10),
        aggregate
    });
});

app.get('/api/industrial-robotics/runtime/services', authMiddleware, requireScopes('read:api'), async (req, res) => {
    const catalog = await loadCatalogEntries();
    const industrialApis = catalog.filter(isIndustrialRoboticsRuntimeApi).map(api => applySessionPolicy(api, req.user));
    res.json({
        source: 'industrial-robotics-runtime-service-registry',
        phase: 'PHASE-6D-RC-IROBOT',
        positioning: 'Industrial robotics cognitive orchestration infrastructure. No PLC firmware, robotic controller firmware, SCADA replacement, MES replacement, industrial motion controller stack, or ROS industrial replacement.',
        entitlement: getSessionEntitlement(req.user),
        runtime_services: INDUSTRIAL_ROBOTICS_RUNTIME_SERVICES,
        metadata_apis: industrialApis,
        streaming: { primary: 'SSE', fallback: 'polling', endpointPattern: '/api/executions/:executionId/events' },
        digital_twin_readiness: ['smart factory twins', 'orchestration twins', 'replay twins', 'predictive coordination twins']
    });
});

app.get('/api/industrial-robotics/runtime/telemetry', authMiddleware, requireScopes('read:api'), async (req, res) => {
    const catalog = await loadCatalogEntries();
    const tenantEvents = executionEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const tenantSimulations = simulationEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const activeIndustrialSessions = Array.from(executionSessions.values())
        .filter(session => session.tenant === req.user.tenant && isIndustrialRoboticsRuntimeApi({ domain_key: session.executionPlan.domain, api_key: session.api_key, name: session.api_name, tags: ['industrial robotics'] }))
        .map(materializeExecutionSession);
    const completedIndustrialExecutions = tenantEvents.filter(event => event.industrialRuntime);
    const industrialSimulations = tenantSimulations.filter(event => event.runtime && event.runtime.industrialRuntime);
    const telemetryFrames = [
        ...activeIndustrialSessions.map(runtime => runtime.industrialTelemetry).filter(Boolean),
        ...completedIndustrialExecutions.map(event => event.industrialRuntime && event.industrialRuntime.telemetry).filter(Boolean),
        ...industrialSimulations.map(event => event.runtime.industrialRuntime && event.runtime.industrialRuntime.telemetry).filter(Boolean)
    ];
    const aggregate = telemetryFrames.reduce((acc, frame) => {
        acc.production_latency_ms += frame.production_latency_ms || 0;
        acc.factory_synchronization_events += frame.factory_synchronization_events || 0;
        acc.governance_events += frame.governance_events || 0;
        acc.replay_events += frame.replay_events || 0;
        acc.anomaly_events += frame.anomaly_events || 0;
        acc.predictive_coordination_events += frame.predictive_coordination_events || 0;
        acc.production_balancing_events += frame.production_balancing_events || 0;
        acc.confidence_samples.push(frame.final_production_confidence || 0);
        acc.digital_twin_ready = acc.digital_twin_ready || !!frame.digital_twin_ready;
        return acc;
    }, {
        production_latency_ms: 0,
        factory_synchronization_events: 0,
        governance_events: 0,
        replay_events: 0,
        anomaly_events: 0,
        predictive_coordination_events: 0,
        production_balancing_events: 0,
        confidence_samples: [],
        digital_twin_ready: false
    });
    aggregate.average_production_confidence = aggregate.confidence_samples.length
        ? Number((aggregate.confidence_samples.reduce((sum, value) => sum + value, 0) / aggregate.confidence_samples.length).toFixed(3))
        : 0;
    res.json({
        source: 'industrial-observability-runtime',
        phase: 'PHASE-6D-RC-IROBOT',
        entitlement: getSessionEntitlement(req.user),
        api_count: catalog.filter(isIndustrialRoboticsRuntimeApi).length,
        runtime_services: INDUSTRIAL_ROBOTICS_RUNTIME_SERVICES,
        active_sessions: activeIndustrialSessions,
        completed_executions: completedIndustrialExecutions.slice(0, 10),
        simulations: industrialSimulations.slice(0, 10),
        aggregate
    });
});

app.get('/api/dashboard/metrics', authMiddleware, async (req, res) => {
    const catalog = await loadCatalogEntries();
    const tenantEvents = executionEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const tenantSimulations = simulationEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const governanceEvents = tenantEvents.filter(event => event.governance && event.governance.status);
    const replayEvents = tenantEvents.filter(event => event.replay && event.replay.replayId);
    const lifecycle = catalog.reduce((counts, api) => {
        const state = api.lifecycle_state || api.status_name || 'simulated';
        counts[state] = (counts[state] || 0) + 1;
        return counts;
    }, {});
    const roboticsCatalog = catalog.filter(api => ['robotics', 'cobotics'].includes(api.domain_key || domainKeyForApi(api)));
    const roboticsEvents = tenantEvents.filter(event => ['robotics', 'cobotics'].includes((event.executionPlan && event.executionPlan.domain) || ''));
    const roboticsSimulations = tenantSimulations.filter(event => ['robotics', 'cobotics'].includes(event.domain));
    const roboticsSignals = [...roboticsEvents, ...roboticsSimulations];
    const coboticsCatalog = catalog.filter(isCoboticsRuntimeApi);
    const coboticsEvents = tenantEvents.filter(event => event.coboticsRuntime || (event.executionPlan && event.executionPlan.domain === 'cobotics'));
    const coboticsSimulations = tenantSimulations.filter(event => event.runtime && event.runtime.coboticsRuntime);
    const coboticsSignals = [...coboticsEvents, ...coboticsSimulations];
    const hriCatalog = catalog.filter(isHriRuntimeApi);
    const hriEvents = tenantEvents.filter(event => event.hriRuntime);
    const hriSimulations = tenantSimulations.filter(event => event.runtime && event.runtime.hriRuntime);
    const hriSignals = [...hriEvents, ...hriSimulations];
    const industrialCatalog = catalog.filter(isIndustrialRoboticsRuntimeApi);
    const industrialEvents = tenantEvents.filter(event => event.industrialRuntime);
    const industrialSimulations = tenantSimulations.filter(event => event.runtime && event.runtime.industrialRuntime);
    const industrialSignals = [...industrialEvents, ...industrialSimulations];
    const ecosystemEvents = [...roboticsSignals, ...coboticsSignals, ...industrialSignals].filter(event => event.ecosystemCompatibility || (event.runtime && event.runtime.executionPlan && event.runtime.executionPlan.ecosystemCompatibility && event.runtime.executionPlan.ecosystemCompatibility.length));
    const uavEvents = tenantEvents.filter(event => event.uavRuntime);
    const uavSimulations = tenantSimulations.filter(event => event.runtime && event.runtime.uavRuntime);
    const uavSignals = [...uavEvents, ...uavSimulations];
    const roboticsMetrics = {
        api_count: roboticsCatalog.length,
        orchestration_events: roboticsEvents.length,
        simulation_events: roboticsSimulations.length,
        replay_activity: roboticsSignals.filter(event => event.replay || (event.runtime && event.runtime.replayPackage)).length,
        governance_events: roboticsSignals.filter(event => event.governance || (event.runtime && event.runtime.executionPlan && event.runtime.executionPlan.governancePropagation.length)).length,
        synchronization_events: roboticsSignals.reduce((sum, event) => {
            const runtimeSync = event.runtime && event.runtime.executionPlan ? event.runtime.executionPlan.distributedSynchronization.length : 0;
            const executionSync = event.distributedSynchronization ? event.distributedSynchronization.length : 0;
            return sum + runtimeSync + executionSync;
        }, 0),
        anomaly_events: roboticsSimulations.filter(event => event.runtime && event.runtime.telemetry && event.runtime.telemetry.anomalyDetected).length,
        orchestration_latency_ms: roboticsSignals.reduce((sum, event) => {
            const runtimeTelemetry = event.roboticsRuntime && event.roboticsRuntime.telemetry ? event.roboticsRuntime.telemetry : (event.runtime && event.runtime.roboticsRuntime && event.runtime.roboticsRuntime.telemetry);
            return sum + (runtimeTelemetry ? runtimeTelemetry.orchestration_latency_ms || 0 : 0);
        }, 0),
        confidence_drift: Number((roboticsSignals.reduce((sum, event) => {
            const runtimeTelemetry = event.roboticsRuntime && event.roboticsRuntime.telemetry ? event.roboticsRuntime.telemetry : (event.runtime && event.runtime.roboticsRuntime && event.runtime.roboticsRuntime.telemetry);
            return sum + (runtimeTelemetry ? runtimeTelemetry.confidence_drift || 0 : 0);
        }, 0)).toFixed(3)),
        coordination_activity: roboticsSignals.reduce((sum, event) => {
            const runtimeTelemetry = event.roboticsRuntime && event.roboticsRuntime.telemetry ? event.roboticsRuntime.telemetry : (event.runtime && event.runtime.roboticsRuntime && event.runtime.roboticsRuntime.telemetry);
            return sum + (runtimeTelemetry ? runtimeTelemetry.robotic_coordination_activity || 0 : 0);
        }, 0),
        safety_governance_ready: roboticsCatalog.some(api => api.api_key === 'rbt-safety-governance'),
        fleet_coordination_ready: roboticsCatalog.some(api => api.api_key === 'rbt-fleet-coordinate'),
        human_aware_ready: roboticsCatalog.some(api => api.api_key === 'rbt-human-aware-coordinate')
    };
    const coboticsMetrics = {
        api_count: coboticsCatalog.length,
        collaboration_events: coboticsEvents.length,
        simulation_events: coboticsSimulations.length,
        replay_activity: coboticsSignals.filter(event => event.coboticsRuntime || (event.runtime && event.runtime.coboticsRuntime)).length,
        governance_events: coboticsSignals.filter(event => event.coboticsRuntime || (event.runtime && event.runtime.coboticsRuntime)).length,
        human_interaction_events: coboticsSignals.reduce((sum, event) => {
            const telemetry = event.coboticsRuntime && event.coboticsRuntime.telemetry ? event.coboticsRuntime.telemetry : (event.runtime && event.runtime.coboticsRuntime && event.runtime.coboticsRuntime.telemetry);
            return sum + (telemetry ? telemetry.human_interaction_events || 0 : 0);
        }, 0),
        safety_interventions: coboticsSignals.reduce((sum, event) => {
            const telemetry = event.coboticsRuntime && event.coboticsRuntime.telemetry ? event.coboticsRuntime.telemetry : (event.runtime && event.runtime.coboticsRuntime && event.runtime.coboticsRuntime.telemetry);
            return sum + (telemetry ? telemetry.safety_interventions || 0 : 0);
        }, 0),
        adaptive_reassignments: coboticsSignals.reduce((sum, event) => {
            const telemetry = event.coboticsRuntime && event.coboticsRuntime.telemetry ? event.coboticsRuntime.telemetry : (event.runtime && event.runtime.coboticsRuntime && event.runtime.coboticsRuntime.telemetry);
            return sum + (telemetry ? telemetry.adaptive_reassignment_events || 0 : 0);
        }, 0),
        collaborative_latency_ms: coboticsSignals.reduce((sum, event) => {
            const telemetry = event.coboticsRuntime && event.coboticsRuntime.telemetry ? event.coboticsRuntime.telemetry : (event.runtime && event.runtime.coboticsRuntime && event.runtime.coboticsRuntime.telemetry);
            return sum + (telemetry ? telemetry.collaborative_latency_ms || 0 : 0);
        }, 0),
        confidence_drift: Number((coboticsSignals.reduce((sum, event) => {
            const telemetry = event.coboticsRuntime && event.coboticsRuntime.telemetry ? event.coboticsRuntime.telemetry : (event.runtime && event.runtime.coboticsRuntime && event.runtime.coboticsRuntime.telemetry);
            return sum + (telemetry ? telemetry.collaborative_confidence_drift || 0 : 0);
        }, 0)).toFixed(3)),
        shared_workspace_ready: coboticsCatalog.some(api => api.api_key === 'cbt-shared-workspace'),
        intent_sync_ready: coboticsCatalog.some(api => api.api_key === 'cbt-intent-sync'),
        human_first_governance_ready: coboticsCatalog.some(api => api.api_key === 'cbt-safety-governance')
    };
    const hriMetrics = {
        api_count: hriCatalog.length,
        interaction_executions: hriEvents.length,
        simulation_events: hriSimulations.length,
        replay_activity: hriSignals.filter(event => event.hriRuntime || (event.runtime && event.runtime.hriRuntime)).length,
        governance_events: hriSignals.reduce((sum, event) => {
            const telemetry = event.hriRuntime && event.hriRuntime.telemetry ? event.hriRuntime.telemetry : (event.runtime && event.runtime.hriRuntime && event.runtime.hriRuntime.telemetry);
            return sum + (telemetry ? telemetry.governance_events || 0 : 0);
        }, 0),
        intent_events: hriSignals.reduce((sum, event) => {
            const telemetry = event.hriRuntime && event.hriRuntime.telemetry ? event.hriRuntime.telemetry : (event.runtime && event.runtime.hriRuntime && event.runtime.hriRuntime.telemetry);
            return sum + (telemetry ? telemetry.intent_events || 0 : 0);
        }, 0),
        multimodal_events: hriSignals.reduce((sum, event) => {
            const telemetry = event.hriRuntime && event.hriRuntime.telemetry ? event.hriRuntime.telemetry : (event.runtime && event.runtime.hriRuntime && event.runtime.hriRuntime.telemetry);
            return sum + (telemetry ? telemetry.multimodal_events || 0 : 0);
        }, 0),
        override_events: hriSignals.reduce((sum, event) => {
            const telemetry = event.hriRuntime && event.hriRuntime.telemetry ? event.hriRuntime.telemetry : (event.runtime && event.runtime.hriRuntime && event.runtime.hriRuntime.telemetry);
            return sum + (telemetry ? telemetry.override_events || 0 : 0);
        }, 0),
        safety_events: hriSignals.reduce((sum, event) => {
            const telemetry = event.hriRuntime && event.hriRuntime.telemetry ? event.hriRuntime.telemetry : (event.runtime && event.runtime.hriRuntime && event.runtime.hriRuntime.telemetry);
            return sum + (telemetry ? telemetry.safety_events || 0 : 0);
        }, 0),
        behavioral_signal_events: hriSignals.reduce((sum, event) => {
            const telemetry = event.hriRuntime && event.hriRuntime.telemetry ? event.hriRuntime.telemetry : (event.runtime && event.runtime.hriRuntime && event.runtime.hriRuntime.telemetry);
            return sum + (telemetry ? telemetry.behavioral_signal_events || 0 : 0);
        }, 0),
        interaction_latency_ms: hriSignals.reduce((sum, event) => {
            const telemetry = event.hriRuntime && event.hriRuntime.telemetry ? event.hriRuntime.telemetry : (event.runtime && event.runtime.hriRuntime && event.runtime.hriRuntime.telemetry);
            return sum + (telemetry ? telemetry.interaction_latency_ms || 0 : 0);
        }, 0),
        confidence_drift: Number((hriSignals.reduce((sum, event) => {
            const telemetry = event.hriRuntime && event.hriRuntime.telemetry ? event.hriRuntime.telemetry : (event.runtime && event.runtime.hriRuntime && event.runtime.hriRuntime.telemetry);
            return sum + (telemetry ? telemetry.hri_confidence_drift || 0 : 0);
        }, 0)).toFixed(3)),
        shunya_ai_aligned: hriCatalog.some(api => JSON.stringify(api).toLowerCase().includes('shunya')),
        edge_hri_ready: hriCatalog.some(api => api.api_key === 'hri-presence-sync' || api.api_key === 'hri-adaptive-interaction'),
        override_governance_ready: hriCatalog.some(api => api.api_key === 'hri-override-governance')
    };
    const industrialMetrics = {
        api_count: industrialCatalog.length,
        production_executions: industrialEvents.length,
        simulation_events: industrialSimulations.length,
        replay_activity: industrialSignals.filter(event => event.industrialRuntime || (event.runtime && event.runtime.industrialRuntime)).length,
        governance_events: industrialSignals.reduce((sum, event) => {
            const telemetry = event.industrialRuntime && event.industrialRuntime.telemetry ? event.industrialRuntime.telemetry : (event.runtime && event.runtime.industrialRuntime && event.runtime.industrialRuntime.telemetry);
            return sum + (telemetry ? telemetry.governance_events || 0 : 0);
        }, 0),
        factory_synchronization_events: industrialSignals.reduce((sum, event) => {
            const telemetry = event.industrialRuntime && event.industrialRuntime.telemetry ? event.industrialRuntime.telemetry : (event.runtime && event.runtime.industrialRuntime && event.runtime.industrialRuntime.telemetry);
            return sum + (telemetry ? telemetry.factory_synchronization_events || 0 : 0);
        }, 0),
        anomaly_events: industrialSignals.reduce((sum, event) => {
            const telemetry = event.industrialRuntime && event.industrialRuntime.telemetry ? event.industrialRuntime.telemetry : (event.runtime && event.runtime.industrialRuntime && event.runtime.industrialRuntime.telemetry);
            return sum + (telemetry ? telemetry.anomaly_events || 0 : 0);
        }, 0),
        predictive_coordination_events: industrialSignals.reduce((sum, event) => {
            const telemetry = event.industrialRuntime && event.industrialRuntime.telemetry ? event.industrialRuntime.telemetry : (event.runtime && event.runtime.industrialRuntime && event.runtime.industrialRuntime.telemetry);
            return sum + (telemetry ? telemetry.predictive_coordination_events || 0 : 0);
        }, 0),
        production_balancing_events: industrialSignals.reduce((sum, event) => {
            const telemetry = event.industrialRuntime && event.industrialRuntime.telemetry ? event.industrialRuntime.telemetry : (event.runtime && event.runtime.industrialRuntime && event.runtime.industrialRuntime.telemetry);
            return sum + (telemetry ? telemetry.production_balancing_events || 0 : 0);
        }, 0),
        production_latency_ms: industrialSignals.reduce((sum, event) => {
            const telemetry = event.industrialRuntime && event.industrialRuntime.telemetry ? event.industrialRuntime.telemetry : (event.runtime && event.runtime.industrialRuntime && event.runtime.industrialRuntime.telemetry);
            return sum + (telemetry ? telemetry.production_latency_ms || 0 : 0);
        }, 0),
        confidence_drift: Number((industrialSignals.reduce((sum, event) => {
            const telemetry = event.industrialRuntime && event.industrialRuntime.telemetry ? event.industrialRuntime.telemetry : (event.runtime && event.runtime.industrialRuntime && event.runtime.industrialRuntime.telemetry);
            return sum + (telemetry ? telemetry.industrial_confidence_drift || 0 : 0);
        }, 0)).toFixed(3)),
        digital_twin_ready: industrialCatalog.some(api => api.api_key === 'irobot-digital-twin-interface'),
        smart_factory_ready: industrialCatalog.some(api => api.api_key === 'irobot-smart-factory-coordinate'),
        predictive_ready: industrialCatalog.some(api => api.api_key === 'irobot-predictive-coordinate')
    };
    const ecosystemMetrics = {
        ecosystem_count: ROBOTICS_ECOSYSTEM_COMPATIBILITY.length,
        ros2_ready: true,
        vla_ready: ROBOTICS_ECOSYSTEM_COMPATIBILITY.some(item => item.vla),
        edge_ready: ROBOTICS_ECOSYSTEM_COMPATIBILITY.every(item => item.edge || item.id === 'abb-rws'),
        simulation_ready: ROBOTICS_ECOSYSTEM_COMPATIBILITY.filter(item => item.simulation).length,
        replay_ready: ROBOTICS_ECOSYSTEM_COMPATIBILITY.filter(item => item.replay).length,
        governance_ready: ROBOTICS_ECOSYSTEM_COMPATIBILITY.filter(item => item.governance).length,
        observability_ready: ROBOTICS_ECOSYSTEM_COMPATIBILITY.filter(item => item.observability).length,
        ecosystem_runtime_events: ecosystemEvents.length
    };
    const uavMetrics = {
        standards_count: UAV_STANDARDS_COMPATIBILITY.length,
        ecosystems_count: UAV_ECOSYSTEM_COMPATIBILITY.length,
        uav_api_count: catalog.filter(isUavRuntimeApi).length,
        mission_executions: uavEvents.length,
        simulation_events: uavSimulations.length,
        remote_id_events: uavSignals.reduce((sum, event) => {
            const telemetry = event.uavRuntime && event.uavRuntime.telemetry ? event.uavRuntime.telemetry : (event.runtime && event.runtime.uavRuntime && event.runtime.uavRuntime.telemetry);
            return sum + (telemetry ? telemetry.remote_id_events || 0 : 0);
        }, 0),
        mavlink_events: uavSignals.reduce((sum, event) => {
            const telemetry = event.uavRuntime && event.uavRuntime.telemetry ? event.uavRuntime.telemetry : (event.runtime && event.runtime.uavRuntime && event.runtime.uavRuntime.telemetry);
            return sum + (telemetry ? telemetry.mavlink_events || 0 : 0);
        }, 0),
        utm_events: uavSignals.reduce((sum, event) => {
            const telemetry = event.uavRuntime && event.uavRuntime.telemetry ? event.uavRuntime.telemetry : (event.runtime && event.runtime.uavRuntime && event.runtime.uavRuntime.telemetry);
            return sum + (telemetry ? telemetry.utm_events || 0 : 0);
        }, 0),
        dgca_events: uavSignals.reduce((sum, event) => {
            const telemetry = event.uavRuntime && event.uavRuntime.telemetry ? event.uavRuntime.telemetry : (event.runtime && event.runtime.uavRuntime && event.runtime.uavRuntime.telemetry);
            return sum + (telemetry ? telemetry.dgca_events || 0 : 0);
        }, 0),
        swarm_events: uavSignals.reduce((sum, event) => {
            const telemetry = event.uavRuntime && event.uavRuntime.telemetry ? event.uavRuntime.telemetry : (event.runtime && event.runtime.uavRuntime && event.runtime.uavRuntime.telemetry);
            return sum + (telemetry ? telemetry.swarm_events || 0 : 0);
        }, 0),
        edge_events: uavSignals.reduce((sum, event) => {
            const telemetry = event.uavRuntime && event.uavRuntime.telemetry ? event.uavRuntime.telemetry : (event.runtime && event.runtime.uavRuntime && event.runtime.uavRuntime.telemetry);
            return sum + (telemetry ? telemetry.edge_events || 0 : 0);
        }, 0),
        replay_activity: uavSignals.filter(event => event.uavRuntime || (event.runtime && event.runtime.uavRuntime)).length,
        governance_events: uavSignals.reduce((sum, event) => {
            const telemetry = event.uavRuntime && event.uavRuntime.telemetry ? event.uavRuntime.telemetry : (event.runtime && event.runtime.uavRuntime && event.runtime.uavRuntime.telemetry);
            return sum + (telemetry ? telemetry.governance_events || 0 : 0);
        }, 0)
    };
    res.json({
        source: 'dashboard-metrics-infrastructure',
        entitlement: getSessionEntitlement(req.user),
        api_usage: tenantEvents.length,
        orchestration_traces: tenantEvents.length,
        replay_activity: replayEvents.length,
        governance_events: governanceEvents.length,
        synchronization_activity: tenantEvents.reduce((sum, event) => sum + ((event.distributedSynchronization || []).length), 0),
        simulation_activity: tenantSimulations.length,
        simulation_anomalies: tenantSimulations.filter(event => event.runtime.telemetry.anomalyDetected).length,
        execution_health: tenantEvents.some(event => event.status && event.status.includes('error')) ? 'degraded' : 'healthy',
        operational_anomalies: tenantEvents.filter(event => event.status && event.status.includes('error')).length,
        billing_usage: {
            plan: getSessionEntitlement(req.user).tier,
            quota: getSessionEntitlement(req.user).quota,
            used: tenantEvents.length,
            remainingPolicy: req.user.demo ? 'sandbox only' : 'tracked by subscription tier'
        },
        tenant_activity: { tenant: req.user.tenant, session_type: req.user.demo ? 'demo' : 'authenticated' },
        operational_health: { status: 'healthy', catalog_count: catalog.length, uptime: process.uptime() },
        robotics_metrics: roboticsMetrics,
        cobotics_metrics: coboticsMetrics,
        hri_metrics: hriMetrics,
        industrial_robotics_metrics: industrialMetrics,
        robotics_ecosystem_metrics: ecosystemMetrics,
        uav_standards_metrics: uavMetrics,
        lifecycle,
        recent_executions: tenantEvents.slice(0, 8),
        recent_simulations: tenantSimulations.slice(0, 8),
        latest_simulation_runtime: tenantSimulations[0] ? tenantSimulations[0].runtime || null : null,
        latest_execution_plan: tenantEvents[0] ? tenantEvents[0].executionPlan || null : null,
        audit_events: auditEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo).slice(0, 8)
    });
});

app.get('/api/replay/traces', authMiddleware, requireScopes('read:replay'), (req, res) => {
    const activeRuntimeTraces = Array.from(executionSessions.values())
        .filter(session => session.tenant === req.user.tenant || !req.user.demo)
        .map(materializeExecutionSession)
        .map(runtime => ({
            executionId: runtime.executionId,
            api: runtime.api,
            replay: runtime.replayPackage,
            lineage: runtime.stages,
            confidenceEvolution: runtime.confidenceTimeline,
            synchronizationReplay: runtime.distributedSynchronization,
            governanceReplay: runtime.governancePropagation,
            roboticsRuntime: runtime.roboticsTelemetry,
            coboticsRuntime: runtime.coboticsTelemetry,
            hriRuntime: runtime.hriTelemetry,
            industrialRuntime: runtime.industrialTelemetry,
            ecosystemCompatibility: runtime.ecosystemCompatibility,
            uavStandards: runtime.uavStandards,
            uavEcosystems: runtime.uavEcosystems,
            uavRuntime: runtime.uavTelemetry,
            timestamp: runtime.startedAt,
            live: runtime.status !== 'completed'
        }));
    const completedRuntimeTraces = executionEvents
        .filter(event => event.tenant === req.user.tenant || !req.user.demo)
        .map(event => ({
            executionId: event.id,
            api: event.api_name,
            replay: event.replay,
            lineage: event.orchestrationTrace,
            confidenceEvolution: event.confidenceEvolution,
            synchronizationReplay: event.distributedSynchronization,
            governanceReplay: event.governance,
            roboticsRuntime: event.roboticsRuntime,
            coboticsRuntime: event.coboticsRuntime,
            hriRuntime: event.hriRuntime,
            industrialRuntime: event.industrialRuntime,
            ecosystemCompatibility: event.ecosystemCompatibility,
            uavStandards: event.uavStandards,
            uavEcosystems: event.uavEcosystems,
            uavRuntime: event.uavRuntime,
            timestamp: event.timestamp,
            live: false
        }));
    const simulationRuntimeTraces = simulationEvents
        .filter(event => event.tenant === req.user.tenant || !req.user.demo)
        .map(event => ({
            executionId: event.id,
            api: event.api_name,
            replay: event.runtime.replayPackage,
            lineage: event.runtime.nodes,
            confidenceEvolution: event.runtime.replayPackage.confidenceSnapshots,
            synchronizationReplay: event.runtime.executionPlan.distributedSynchronization,
            governanceReplay: event.runtime.executionPlan.governancePropagation,
            roboticsRuntime: event.runtime.roboticsRuntime,
            coboticsRuntime: event.runtime.coboticsRuntime,
            hriRuntime: event.runtime.hriRuntime,
            industrialRuntime: event.runtime.industrialRuntime,
            ecosystemCompatibility: event.runtime.executionPlan.ecosystemCompatibility,
            uavStandards: event.runtime.executionPlan.uavStandards,
            uavEcosystems: event.runtime.executionPlan.uavEcosystems,
            uavRuntime: event.runtime.uavRuntime,
            timestamp: event.timestamp,
            live: false,
            simulation: true
        }));
    res.json({
        source: 'replay-infrastructure',
        traces: [...activeRuntimeTraces, ...completedRuntimeTraces, ...simulationRuntimeTraces]
    });
});

app.get('/api/lifecycle/states', authMiddleware, async (req, res) => {
    const catalog = await loadCatalogEntries();
    const states = catalog.reduce((counts, api) => {
        const state = api.lifecycle_state || api.status_name || 'simulated';
        counts[state] = (counts[state] || 0) + 1;
        return counts;
    }, {});
    res.json({ source: 'api-lifecycle-infrastructure', states });
});

app.get('/api/dependencies', authMiddleware, requireScopes('read:api'), async (req, res) => {
    try {
        const catalog = await loadCatalogEntries();
        const dependencies = catalog.map(api => ({
            api: api.api_key,
            name: api.name,
            depends_on: api.dependencies || inferDependencies(api),
            lifecycle: api.lifecycle_state,
            demoRestricted: req.user.demo && String(api.min_tier || '').toLowerCase() === 'enterprise'
        }));
        res.json({ dependencies, source: 'api-metadata-registry' });
    } catch (error) {
        console.error('Error fetching dependencies:', error);
        res.json({ dependencies: getFallbackDependencies(), warning: 'Using fallback dependency graph due to database error.' });
    }
});

app.get('/api/metadata/validation', authMiddleware, requireScopes('read:api'), async (req, res) => {
    const catalog = await loadCatalogEntries();
    const domains = buildDomainPayload(catalog, req.user);
    const sample = catalog[0] ? applySessionPolicy(catalog[0], req.user) : null;
    res.json({
        status: 'validated',
        source_of_truth: 'api-metadata-registry',
        dynamic_rendering: true,
        api_count: catalog.length,
        domain_count: domains.length,
        roadmap_domains: domains.map(domain => ({ domain_key: domain.domain_key, title: domain.title, status: domain.status, api_count: domain.api_count })),
        propagation_targets: [
            'API catalog',
            'documentation',
            'SDK examples',
            'playground forms',
            'pricing visibility',
            'lifecycle states',
            'Ask COGNI context',
            'search results',
            'dashboards',
            'dependency visibility'
        ],
        sample_contract: sample ? {
            api_key: sample.api_key,
            endpoint: sample.endpoints && sample.endpoints[0],
            sdk_examples: sample.sdk_examples,
            pricing_visibility: sample.pricing_visibility,
            access_policy: sample.access_policy
        } : null
    });
});

app.post('/api/sdk/generate', authMiddleware, requireScopes('read:api'), (req, res) => {
    const { api_key, language = 'ts' } = req.body || {};
    res.json({
        api_key,
        language,
        sdk_url: `https://api-cintent.cognivantalabs.com/sdk/${api_key}/${language}`,
        generated_at: new Date().toISOString(),
        session_type: req.user.demo ? 'demo' : 'authenticated',
        note: req.user.demo ? 'Demo Mode SDK output is sample-only.' : 'Production SDK activation awaits entitlement and payment verification.'
    });
});

app.post('/api/issues/report', authMiddleware, (req, res) => {
    const { severity = 'P3 integration support', executionId, summary } = req.body || {};
    const event = recordAudit('issue.report', req.user, { severity, executionId, summary });
    res.json({
        issueId: `issue-${event.id}`,
        status: 'captured',
        severity,
        executionId,
        summary,
        auditEvent: event.id,
        supportRoute: 'enterprise-support@cognivantalabs.example'
    });
});

app.get('/api/billing/subscription', authMiddleware, (req, res) => {
    const tenantEvents = executionEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const entitlement = getSessionEntitlement(req.user);
    const plan = getPlanDefinition(entitlement.tier);
    const tenantInvoices = Array.from(invoiceRecords.values())
        .filter(invoice => invoice.authorization.tenant === req.user.tenant)
        .slice(-8)
        .reverse()
        .map(invoice => ({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            issueDate: invoice.issueDate,
            selectedPlan: invoice.subscription.selectedPlan,
            total: invoice.totals.total,
            paymentStatus: invoice.paymentStatus,
            sample: invoice.sample
        }));
    res.json({
        session_type: req.user.demo ? 'demo' : 'authenticated',
        subscription: entitlement,
        active_plan: entitlement.tier,
        plan_metadata: plan,
        quota_usage: {
            quota: entitlement.quota,
            api_calls: tenantEvents.length,
            orchestration_usage: tenantEvents.length,
            replay_usage: tenantEvents.filter(event => event.replay && event.replay.replayId).length
        },
        balance: entitlement.balance || 0,
        validity_period: entitlement.validUntil ? { valid_until: entitlement.validUntil, renewal_date: entitlement.renewalDate } : null,
        billing_history: tenantInvoices,
        invoice_authorization: {
            tenant: req.user.tenant,
            demo_safe: !!req.user.demo,
            commercial_invoice_enabled: !req.user.demo,
            sample_invoice_enabled: !!req.user.demo
        },
        payment_verification: 'future-ready',
        phone_verification: 'future-ready',
        stripe: 'prepared',
        demo_bypass_enabled: true,
        quota_activation: req.user.demo ? 'sandbox-only' : 'ready-for-payment-verification'
    });
});

app.post('/api/billing/enterprise-inquiry', authMiddleware, (req, res) => {
    const { requestType = 'enterprise-onboarding', companyName, contactPerson, email, phone, domains = [], requirements = '', sla = '', compliance = '', budgetRange = '', timeline = '' } = req.body || {};
    const ticket = {
        id: `enterprise-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        tenant: req.user.tenant,
        requester: req.user.email,
        requestType,
        companyName: companyName || req.user.tenant,
        contactPerson: contactPerson || req.user.name || req.user.email,
        email: email || req.user.email,
        phone: phone || '',
        domains: Array.isArray(domains) ? domains : String(domains || '').split(',').map(item => item.trim()).filter(Boolean),
        requirements,
        sla,
        compliance,
        budgetRange,
        timeline,
        status: 'enterprise-review-queued',
        reviewQueue: ['custom pricing', 'API customization', 'multi-domain subscription', 'governance/compliance', 'SLA review'],
        createdAt: new Date().toISOString()
    };
    enterpriseInquiries.unshift(ticket);
    if (enterpriseInquiries.length > 100) enterpriseInquiries.pop();
    recordAudit('billing.enterprise.inquiry', req.user, { ticketId: ticket.id, requestType: ticket.requestType, domains: ticket.domains });
    res.json({
        ticket,
        message: 'Enterprise inquiry captured for Cognivanta Labs commercial review.',
        supportRoute: 'enterprise@cognivantalabs.com'
    });
});

app.post('/api/use-cases', authMiddleware, (req, res) => {
    const required = ['companyName', 'contactPerson', 'email', 'industry', 'domain', 'problemStatement'];
    const missing = required.filter(field => !req.body || !req.body[field]);
    if (missing.length) {
        return res.status(400).json({ error: 'Missing required use-case fields', missing });
    }
    const ticket = {
        id: `usecase-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        tenant: req.user.tenant,
        requester: req.user.email,
        companyName: req.body.companyName,
        contactPerson: req.body.contactPerson,
        email: req.body.email,
        phone: req.body.phone || '',
        industry: req.body.industry,
        domain: req.body.domain,
        problemStatement: req.body.problemStatement,
        expectedApis: req.body.expectedApis || '',
        expectedIntegration: req.body.expectedIntegration || '',
        timelineExpectation: req.body.timelineExpectation || '',
        budgetRange: req.body.budgetRange || '',
        status: 'internal-review-queue',
        nextSteps: ['API feasibility assessment', 'orchestration guidance review', 'custom solution proposal', 'enterprise follow-up'],
        estimatedResponseWindow: '2 business days',
        createdAt: new Date().toISOString()
    };
    useCaseRequests.unshift(ticket);
    if (useCaseRequests.length > 100) useCaseRequests.pop();
    const auditEvent = recordAudit('use-case.submit', req.user, { ticketId: ticket.id, domain: ticket.domain, industry: ticket.industry });
    res.json({
        ticket,
        auditEvent: auditEvent.id,
        message: 'Use case package captured for enterprise solution review.'
    });
});

app.get('/api/audit/export', authMiddleware, requireNonDemo, (req, res) => {
    if (!hasTier(req.user, 'professional')) {
        return res.status(403).json({ error: 'Professional subscription or higher is required for audit exports.', current: getSessionEntitlement(req.user) });
    }
    const { type = 'governance', format = 'json' } = req.query;
    const tenantEvents = executionEvents.filter(event => event.tenant === req.user.tenant);
    const packagePayload = {
        type,
        format,
        export_url: `https://api-cintent.cognivantalabs.com/exports/${type}.${format}`,
        generated_at: new Date().toISOString(),
        tenant: req.user.tenant,
        bundle: {
            replay_traces: tenantEvents.map(event => event.replay),
            orchestration_lineage: tenantEvents.map(event => ({ execution: event.id, lineage: event.orchestrationTrace })),
            governance_logs: tenantEvents.map(event => ({ execution: event.id, governance: event.governance })),
            audit_logs: auditEvents.filter(event => event.tenant === req.user.tenant).slice(0, 50),
            diagnostic_manifest: { generatedBy: 'api-cintent-audit-export', deterministic: true, formats: ['json', 'pdf', 'bundle'] }
        }
    };
    if (format === 'json') {
        res.setHeader('Content-Disposition', `attachment; filename="cintent-${type}-audit.json"`);
    }
    res.json(packagePayload);
});

app.get('/api/audit/logs', authMiddleware, (req, res) => {
    res.json({
        source: 'audit-logging-infrastructure',
        events: auditEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo).slice(0, 50)
    });
});

// Error handling
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        message: `Endpoint ${req.path} does not exist`
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: NODE_ENV === 'production' ? 'An error occurred' : err.message
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═════════════════════════════════════════════════════════╗
║  CINTENT Developer Platform v2                         ║
║  Server running on port ${PORT}                        ║
║  Environment: ${NODE_ENV.toUpperCase()}${' '.repeat(32 - NODE_ENV.length)}║
╚═════════════════════════════════════════════════════════╝

✅ Frontend:
   • Platform: http://localhost:${PORT}/
   • Admin: http://localhost:${PORT}/admin

✅ API:
   • Health: http://localhost:${PORT}/api/health
   • Status: http://localhost:${PORT}/api/status
   • Docs: http://localhost:${PORT}/docs

📍 Hostinger Subdomain:
   • https://api-cintent.cognivantalabs.com

🚀 Ready for connections...
    `);
});

process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    server.close(() => process.exit(0));
});

module.exports = app;
