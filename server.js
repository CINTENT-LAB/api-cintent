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
const auditEvents = [];

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
    const minTier = String(api.min_tier || '').toLowerCase();
    const demoRestricted = Boolean(user && user.demo && minTier === 'enterprise');
    return {
        ...api,
        domain_key: api.domain_key || domainKeyForApi(api),
        domain_status: api.domain_status || (getDomainRoadmap().find(domain => domain.domain_key === (api.domain_key || domainKeyForApi(api))) || {}).status || 'operational',
        access_policy: {
            session_type: user && user.demo ? 'demo' : 'authenticated',
            tenant: user && user.tenant ? user.tenant : 'unknown',
            scopes: user && Array.isArray(user.scopes) ? user.scopes : [],
            demo_restricted: demoRestricted,
            allowed_modes: user && user.demo ? ['sandbox'] : ['sandbox', 'simulated', 'production-preview'],
            note: demoRestricted ? 'Demo Mode can view documentation but cannot execute enterprise/private APIs.' : 'Session can use sandbox documentation and simulated execution paths.'
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
    return getDomainRoadmap().map(domain => ({
        ...domain,
        api_count: counts[domain.domain_key] || 0,
        executable: domain.status !== 'coming_soon',
        session_type: user && user.demo ? 'demo' : 'authenticated'
    }));
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
    emailVerificationTokens.set(verificationToken, id);

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
    res.json({
        user: { id: sub, email, name, role, tenant, demo: !!demo, scopes: scopes || [] },
        session: {
            type: demo ? 'demo' : 'authenticated',
            rbac: role,
            tenant,
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
        payment_verification: 'future-ready',
        phone_verification: 'future-ready',
        stripe: 'prepared',
        plans: [
            { id: 'free', name: 'Free', price: 0, quota: '5k calls/month', fit: 'Evaluation and docs exploration', api_count: tierCounts.free || 0 },
            { id: 'developer', name: 'Developer', price: 149, quota: '100k calls/month', fit: 'SDK onboarding and early integration', api_count: tierCounts.developer || 0 },
            { id: 'startup', name: 'Startup', price: 799, quota: '1M calls/month', fit: 'Production pilots and orchestration usage', api_count: tierCounts.startup || 0 },
            { id: 'enterprise', name: 'Enterprise', price: 4200, quota: 'Custom quota', fit: 'SLA, SSO, invoicing, governance, support', api_count: tierCounts.enterprise || 0 }
        ]
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
        if (req.user.demo && String(api.min_tier || '').toLowerCase() === 'enterprise') {
            return res.status(403).json({ error: 'Demo Mode can inspect enterprise API documentation but cannot execute enterprise/private APIs.' });
        }
        const output = {
            api: api.name,
            mode,
            status: 'simulated-success',
            orchestrationId: `orch-${api_key}-${Date.now()}`,
            session: { type: req.user.demo ? 'demo' : 'authenticated', tenant: req.user.tenant, scopes: req.user.scopes },
            governance: { status: api.governance_support ? 'passed' : 'not_applicable', interventions: api.governance_support ? ['policy-check', 'tenant-isolation'] : ['tenant-isolation'] },
            replay: { replayId: `replay-${api_key}-${Date.now()}`, deterministic: true, traceNodes: api.lineage ? api.lineage.length : 4, examples: api.replay_examples || [] },
            confidenceEvolution: api.confidence ? api.confidence.map((score, index) => ({ step: api.lineage ? api.lineage[index] || `step-${index + 1}` : `step-${index + 1}`, score })) : [{ step: 'intent', score: 0.72 }, { step: 'governance', score: 0.84 }, { step: 'replay', score: 0.91 }],
            distributedSynchronization: api.distributed ? api.distributed.map((item, index) => ({ node: item, vectorClock: index + 1, status: 'synchronized' })) : [],
            orchestrationTrace: api.orchestration_examples || [],
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

app.post('/api/ask', authMiddleware, requireScopes('ask:cognitive'), async (req, res) => {
    const { query } = req.body || {};
    if (!query) {
        return res.status(400).json({ error: 'Query is required for Ask COGNI.' });
    }
    try {
        const catalog = await loadCatalogEntries();
        const domainMatches = searchDomains(buildDomainPayload(catalog, req.user), query);
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
            performanceContext: {
                api_usage: executionEvents.length,
                replay_activity: executionEvents.filter(event => event.replay && event.replay.replayId).length,
                governance_events: executionEvents.filter(event => event.governance && event.governance.status).length,
                audit_events: auditEvents.length,
                operational_health: 'healthy'
            }
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
    res.json({
        source: 'replay-orchestration-runtime',
        orchestration_graph: latest ? { id: latest.id, api: latest.api_name, mode: latest.mode, status: latest.status } : {},
        replay_timeline: visibleEvents.slice(0, 10).map(event => ({ execution: event.id, replay: event.replay, timestamp: event.timestamp })),
        governance_propagation: latest ? latest.governance : {},
        confidence_evolution: latest ? latest.confidenceEvolution : [],
        distributed_synchronization: latest ? latest.distributedSynchronization : [],
        execution_lineage: latest ? latest.orchestrationTrace : []
    });
});

app.get('/api/dashboard/metrics', authMiddleware, async (req, res) => {
    const catalog = await loadCatalogEntries();
    const tenantEvents = executionEvents.filter(event => event.tenant === req.user.tenant || !req.user.demo);
    const governanceEvents = tenantEvents.filter(event => event.governance && event.governance.status);
    const replayEvents = tenantEvents.filter(event => event.replay && event.replay.replayId);
    const lifecycle = catalog.reduce((counts, api) => {
        const state = api.lifecycle_state || api.status_name || 'simulated';
        counts[state] = (counts[state] || 0) + 1;
        return counts;
    }, {});
    res.json({
        source: 'dashboard-metrics-infrastructure',
        api_usage: tenantEvents.length,
        orchestration_traces: tenantEvents.length,
        replay_activity: replayEvents.length,
        governance_events: governanceEvents.length,
        tenant_activity: { tenant: req.user.tenant, session_type: req.user.demo ? 'demo' : 'authenticated' },
        operational_health: { status: 'healthy', catalog_count: catalog.length, uptime: process.uptime() },
        lifecycle,
        recent_executions: tenantEvents.slice(0, 8),
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
    res.json({
        session_type: req.user.demo ? 'demo' : 'authenticated',
        payment_verification: 'future-ready',
        phone_verification: 'future-ready',
        stripe: 'prepared',
        demo_bypass_enabled: true,
        quota_activation: req.user.demo ? 'sandbox-only' : 'ready-for-payment-verification'
    });
});

app.get('/api/audit/export', authMiddleware, requireNonDemo, (req, res) => {
    const { type = 'governance', format = 'json' } = req.query;
    res.json({
        type,
        format,
        export_url: `https://api-cintent.cognivantalabs.com/exports/${type}.${format}`,
        generated_at: new Date().toISOString(),
        tenant: req.user.tenant
    });
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
