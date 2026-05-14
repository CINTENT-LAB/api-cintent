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
    { id: 'robotics-orchestration', title: 'Robotics orchestration', domain: 'robotics', apiKey: 'rbt-workflow', category: 'robotics', governanceLevel: 'high', agents: ['workflow agent', 'robotics coordinator', 'safety agent', 'replay agent'], signals: ['workflow', 'sensor state', 'safety zone', 'task route'] },
    { id: 'cobotics-coordination', title: 'Cobotics coordination', domain: 'cobotics', apiKey: 'cbt-collaboration', category: 'cobotics', governanceLevel: 'high', agents: ['human-machine context agent', 'safety agent', 'collaboration agent', 'explainability agent'], signals: ['human intent', 'machine state', 'safety', 'handoff'] },
    { id: 'smart-infrastructure', title: 'Smart infrastructure coordination', domain: 'iot-smart-infra', apiKey: 'phase-domain', category: 'smart-infrastructure', governanceLevel: 'enterprise', agents: ['infrastructure agent', 'iot signal agent', 'edge agent', 'anomaly agent'], signals: ['iot stream', 'edge state', 'facility health', 'anomaly'] }
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
    return result.rows.map(normalizeApiRow).map(enrichMetadata);
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

function buildExecutionPlan(api, user, mode, input = {}, governanceContext = {}) {
    const domain = api.domain_key || domainKeyForApi(api);
    const tags = new Set([domain, ...(api.tags || []), ...(api.capabilities || [])].map(value => String(value).toLowerCase()));
    const dependencies = api.dependencies || inferDependencies(api);
    const domainStages = [];
    if (tags.has('travel')) domainStages.push(['travel-intent-graph', 'Travel intent graph resolved', 'orchestrating']);
    if (tags.has('drone') || tags.has('fleet')) domainStages.push(['fleet-coordination', 'Distributed fleet coordination planned', 'distributed-sync']);
    if (tags.has('robotics')) domainStages.push(['workflow-routing', 'Robotics workflow route adapted', 'orchestrating']);
    if (tags.has('cobotics')) domainStages.push(['human-machine-context', 'Cobotics collaboration context aligned', 'orchestrating']);
    if (tags.has('governance') || tags.has('policy') || api.governance_support) domainStages.push(['policy-enforcement', 'Governance enforcement path selected', 'governance-check']);
    if (tags.has('multilingual') || tags.has('speech')) domainStages.push(['multimodal-normalization', 'Multimodal signal normalized', 'orchestrating']);
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
        const confidenceAfter = Number(Math.min(0.97, confidenceBefore + (stage[2] === 'governance-check' ? -0.015 : 0.045)).toFixed(3));
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
            dependencies: stage[0] === 'dependency-propagation' ? dependencies : [],
            governanceEvents: stage[2] === 'governance-check' ? [
                { policy: governanceContext.policy || 'enterprise-default', status: 'passed', intervention: api.governance_support ? 'policy-check' : 'tenant-isolation' }
            ] : [],
            replayEvents: stage[2] === 'replay-capture' ? [
                { replayId: `replay-${api.api_key}-${startedAt}`, snapshot: `${stage[0]}-snapshot`, deterministic: true }
            ] : [],
            distributedEvents: stage[2] === 'distributed-sync' ? dependencies.map((dependency, depIndex) => ({ dependency, vectorClock: depIndex + 1, status: 'synchronized' })) : []
        };
    });
    return {
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
        simulationRealism: {
            mode,
            generatedFrom: ['metadata-registry', 'dependency-graph', 'governance-engine', 'replay-engine', 'distributed-execution-engine'],
            inputHash: crypto.createHash('sha256').update(JSON.stringify(input || {})).digest('hex').slice(0, 12)
        }
    };
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
        'replay-capture': 'replay-capturing',
        'distributed-sync': 'synchronizing',
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
        anomaly: index === 4 && ['distributed-coordination', 'distributed-cognition', 'autonomous-mission', 'smart-infrastructure'].includes(template.category)
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
            edgeCoordination: template.signals.some(signal => signal.includes('edge')) || template.category.includes('distributed')
        },
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
        const dependencies = api.dependencies || inferDependencies(api);
        const executionPlan = buildExecutionPlan(api, req.user, mode, input, governanceContext);
        const lineage = executionPlan.stages.map(stage => stage.id);
        const output = {
            api: api.name,
            mode,
            status: 'simulated-success',
            orchestrationId: executionPlan.executionId,
            executionPlan,
            session: { type: req.user.demo ? 'demo' : 'authenticated', tenant: req.user.tenant, scopes: req.user.scopes },
            governance: { status: api.governance_support ? 'passed' : 'tenant_boundary_applied', interventions: executionPlan.governancePropagation },
            replay: { replayId: executionPlan.replayPropagation[0] ? executionPlan.replayPropagation[0].replayId : `replay-${api_key}-${Date.now()}`, deterministic: true, traceNodes: executionPlan.stages.length, examples: api.replay_examples || [], propagation: executionPlan.replayPropagation },
            confidenceEvolution: executionPlan.confidenceTimeline.map(item => ({ step: item.stage, score: item.after, before: item.before })),
            distributedSynchronization: executionPlan.distributedSynchronization,
            dependencyVisibility: dependencies.map(dep => ({ api: dep, relationship: 'metadata dependency', status: 'resolved' })),
            orchestrationTrace: executionPlan.stages.map(stage => ({ order: stage.order, step: stage.id, label: stage.label, state: stage.runtimeState, source: 'backend-orchestration-infrastructure', status: 'completed', durationMs: stage.durationMs })),
            visualization: {
                nodes: executionPlan.graph.nodes,
                edges: executionPlan.graph.edges
            },
            request: { tenantId: req.user.tenant, mode, input, governanceContext }
        };
        executionEvents.unshift({
            id: output.orchestrationId,
            api_key,
            api_name: api.name,
            tenant: req.user.tenant,
            session_type: req.user.demo ? 'demo' : 'authenticated',
            mode,
            status: output.status,
            governance: output.governance,
            replay: output.replay,
            confidenceEvolution: output.confidenceEvolution,
            distributedSynchronization: output.distributedSynchronization,
            orchestrationTrace: output.orchestrationTrace,
            dependencyVisibility: output.dependencyVisibility,
            visualization: output.visualization,
            executionPlan,
            timestamp: new Date().toISOString()
        });
        if (executionEvents.length > 250) executionEvents.pop();
        recordAudit('playground.execute', req.user, { api_key, mode, status: output.status });
        res.json(output);
    } catch (error) {
        console.error('Playground execution failed:', error.message);
        res.status(500).json({ error: 'Sandbox execution failed' });
    }
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
            performanceContext: {
                api_usage: executionEvents.length,
                simulation_usage: simulationEvents.length,
                replay_activity: executionEvents.filter(event => event.replay && event.replay.replayId).length,
                governance_events: executionEvents.filter(event => event.governance && event.governance.status).length,
                audit_events: auditEvents.length,
                operational_health: 'healthy'
            },
            latestExecutionContext: executionEvents[0] ? {
                executionId: executionEvents[0].id,
                api: executionEvents[0].api_name,
                mode: executionEvents[0].mode,
                stages: executionEvents[0].executionPlan ? executionEvents[0].executionPlan.stages : [],
                confidenceTimeline: executionEvents[0].confidenceEvolution || [],
                governance: executionEvents[0].governance,
                replay: executionEvents[0].replay,
                dependencies: executionEvents[0].dependencyVisibility || []
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
        lifecycle,
        recent_executions: tenantEvents.slice(0, 8),
        recent_simulations: tenantSimulations.slice(0, 8),
        latest_simulation_runtime: tenantSimulations[0] ? tenantSimulations[0].runtime || null : null,
        latest_execution_plan: tenantEvents[0] ? tenantEvents[0].executionPlan || null : null,
        audit_events: auditEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo).slice(0, 8)
    });
});

app.get('/api/replay/traces', authMiddleware, requireScopes('read:replay'), (req, res) => {
    res.json({
        source: 'replay-infrastructure',
        traces: executionEvents
            .filter(event => event.tenant === req.user.tenant || !req.user.demo)
            .map(event => ({ executionId: event.id, api: event.api_name, replay: event.replay, lineage: event.orchestrationTrace, confidenceEvolution: event.confidenceEvolution, timestamp: event.timestamp }))
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
