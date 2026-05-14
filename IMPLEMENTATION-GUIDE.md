# CINTENT Platform v2 - Implementation Guide
## Metadata-Driven Cognitive Infrastructure Platform

**Status:** Architecture Ready | Implementation Phase 1

---

## 🏗️ ARCHITECTURE OVERVIEW

### Core Principles

1. **Metadata-Driven**: Single source of truth for all API capabilities
2. **Simulated Execution**: Strategic visualization layer (not temporary mock)
3. **Cognitive Metrics**: Dashboards show orchestration complexity, replay usage, governance activity
4. **RAG-Based Ask COGNI**: Vector search + LLM for intelligent assistance
5. **Security-First**: Tenant isolation, RBAC, audit trails from day one

### Data Flow

```
API Metadata Registry (PostgreSQL)
    ↓
Dynamic Documentation Generation
Dynamic Playground Generation
Dynamic SDK Generation
Dynamic Billing Mapping
Dynamic Access Control
Dynamic Search Indexing
RAG Knowledge Base (pgvector)
    ↓
Ask COGNI (Claude/OpenAI + RAG)
    ↓
User Platform Experience
```

---

## 🗄️ DATABASE SETUP

### Prerequisites

- PostgreSQL 14+ with pgvector extension
- pgvector for vector embeddings (RAG)

### Installation Steps

#### 1. Install PostgreSQL

**On Linux (Ubuntu):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib pgvector
```

**On macOS:**
```bash
brew install postgresql
```

**On Windows:**
Download from https://www.postgresql.org/download/windows/

#### 2. Install pgvector Extension

```bash
sudo apt-get install postgresql-pgvector
```

Or via SQL:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 3. Create Database and User

```bash
sudo -u postgres psql

# In psql:
CREATE USER cintent_user WITH PASSWORD 'your-secure-password';
CREATE DATABASE cintent_platform OWNER cintent_user;

# Enable pgvector
\c cintent_platform
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 4. Load Schema

```bash
psql -U cintent_user -d cintent_platform -f api-metadata-registry.sql
```

---

## 🚀 BACKEND SETUP

### 1. Install Dependencies

```bash
cd C:\Users\rpm_T\RAJA_REP\api-cintent
npm install
```

This installs:
- `express` - Web framework
- `pg` - PostgreSQL driver
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `stripe` - Payment processing
- `openai` - Ask COGNI integration

### 2. Configure Environment Variables

```bash
# Copy template
cp .env.example .env

# Edit .env with your values
nano .env
```

**Required:**
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` (change this!)
- `STRIPE_SECRET_KEY` (get from Stripe dashboard)
- `OPENAI_API_KEY` or `CLAUDE_API_KEY`

### 3. Switch to Metadata-Driven Server

Change in `public/CINTENT-DEVELOPER-PLATFORM-V2.html`:

```javascript
// Old:
const API_BASE = 'http://localhost:3000';

// New - Add to connect to metadata-driven backend:
const API_BASE = 'http://localhost:3000';
const USE_METADATA_API = true;
```

### 4. Start Server

**Development:**
```bash
npm run start:metadata
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:3000`

---

## 📊 API CATALOG MANAGEMENT

### Adding New APIs

All APIs are defined in the `api_metadata` table. No hardcoding anywhere.

#### Example: Add Travel Orchestration API

```sql
INSERT INTO api_metadata (
  api_key,
  name,
  version,
  category_id,
  status_id,
  short_description,
  full_description,
  use_cases,
  capabilities,
  cognitive_dimensions,
  endpoints,
  documentation_url,
  simulated,
  min_tier,
  quota_limit,
  code_examples
) VALUES (
  'travel_orchestration_v2',
  'Travel Orchestration Engine',
  '2.1.0',
  (SELECT id FROM api_categories WHERE name = 'Travel'),
  (SELECT id FROM api_statuses WHERE name = 'production'),
  'Orchestrate complex travel bookings across multiple providers',
  'Full documentation...',
  ARRAY['flight_booking', 'hotel_coordination', 'itinerary_planning'],
  '{"orchestration": true, "replay": true, "governance": true, "distributed": true}'::jsonb,
  '{"domain": "travel", "business_problem": "booking_optimization", "workflow": "multi_step_orchestration", "orchestration_type": "sequential", "industry_capability": "e-commerce", "replay_explainability": true}'::jsonb,
  '[{"method": "POST", "path": "/orchestrate", "description": "Execute orchestrated booking", "request_schema": {...}, "response_schema": {...}}]'::jsonb,
  '/docs/travel-orchestration',
  false,  -- not simulated (production)
  'developer',
  10000,
  '{"typescript": "const result = await cintent.apis.travel.orchestrate(...)", "python": "result = cintent.apis.travel.orchestrate(...)"}'::jsonb
);
```

### Updating API Metadata

```sql
UPDATE api_metadata
SET capabilities = '{"orchestration": true, "replay": true, "governance": true, "distributed": true}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE api_key = 'travel_orchestration_v2';
```

### All APIs Inherit Automatically:
- ✅ Documentation pages (generated from metadata)
- ✅ Playground (generated from endpoints schema)
- ✅ Billing tier access (from min_tier field)
- ✅ API search indexing
- ✅ SDK generation (from code_examples)
- ✅ Ask COGNI knowledge base

---

## 🧠 ASK COGNI SETUP

### Architecture

```
User Question
    ↓
pgvector Similarity Search (embeddings)
    ↓
Retrieve relevant documentation/examples
    ↓
Send to Claude/OpenAI with context
    ↓
Structured Response (answer + related APIs + code examples)
```

### Implementation Steps

#### 1. Generate Embeddings

For each piece of documentation, generate vector embeddings:

```javascript
// Example with OpenAI API
const { Configuration, OpenAIApi } = require('openai');

const openai = new OpenAIApi(
  new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

async function generateEmbedding(text) {
  const response = await openai.createEmbedding({
    model: 'text-embedding-3-small',
    input: text
  });
  return response.data.data[0].embedding;
}

// Store in cogni_knowledge_base table
const embedding = await generateEmbedding(apiDocumentation);
await pool.query(
  'INSERT INTO cogni_knowledge_base (source_type, content, embedding) VALUES ($1, $2, $3)',
  ['api_documentation', apiDocumentation, embedding]
);
```

#### 2. Implement RAG Search

```javascript
// In /api/cogni/ask endpoint
async function askCogni(userQuestion) {
  // Generate question embedding
  const questionEmbedding = await generateEmbedding(userQuestion);

  // Search knowledge base for similar content
  const relevantDocs = await pool.query(
    `SELECT content, source_type, metadata
     FROM cogni_knowledge_base
     ORDER BY embedding <-> $1::vector
     LIMIT 5`,
    [JSON.stringify(questionEmbedding)]
  );

  // Send to Claude/OpenAI with context
  const context = relevantDocs.rows.map(r => r.content).join('\n\n');

  const response = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a Cognitive Platform Assistant for CINTENT. 
                 Help developers with API usage, orchestration patterns, and debugging.
                 Base your answers on the provided documentation.`
      },
      {
        role: 'user',
        content: `Documentation:\n${context}\n\nQuestion: ${userQuestion}`
      }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });

  return response.data.choices[0].message.content;
}
```

---

## 💳 STRIPE BILLING SETUP

### 1. Create Stripe Account

- Go to https://stripe.com
- Create account
- Get API keys from Dashboard

### 2. Define Subscription Products

In Stripe Dashboard, create products:

```
Product: CINTENT Free
  ├─ Price: $0/month
  └─ Metadata: { "apiQuota": 100, "tier": "free" }

Product: CINTENT Developer
  ├─ Price: $29/month
  └─ Metadata: { "apiQuota": 10000, "tier": "developer" }

Product: CINTENT Professional
  ├─ Price: $99/month
  └─ Metadata: { "apiQuota": 100000, "tier": "professional" }

Product: CINTENT Enterprise
  ├─ Price: Custom (contact sales)
  └─ Metadata: { "apiQuota": unlimited, "tier": "enterprise" }
```

### 3. Implement Checkout

```javascript
app.post('/api/billing/checkout', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;

    const session = await stripe.checkout.sessions.create({
      customer_email: req.user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env[`STRIPE_PRICE_${planId.toUpperCase()}`],
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: 'https://api-cintent.cognivantalabs.com/billing/success',
      cancel_url: 'https://api-cintent.cognivantalabs.com/billing/cancel',
      metadata: { userId: req.user.userId, plan: planId }
    });

    res.json({ sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: 'Checkout failed' });
  }
});
```

---

## 🔐 SECURITY IMPLEMENTATION

### 1. Tenant Isolation

Every query includes user_id filter:

```javascript
// Users can only see their own data
const result = await pool.query(
  'SELECT * FROM api_executions WHERE user_id = $1',
  [req.user.userId]
);
```

### 2. RBAC (Role-Based Access Control)

```sql
-- Check if user can access API based on subscription tier
SELECT EXISTS (
  SELECT 1 FROM user_subscriptions us
  JOIN api_metadata am ON true
  WHERE us.user_id = $1
  AND am.api_key = $2
  AND (
    CASE 
      WHEN am.min_tier = 'free' THEN true
      WHEN am.min_tier = 'developer' AND us.plan IN ('developer', 'professional', 'enterprise') THEN true
      WHEN am.min_tier = 'professional' AND us.plan IN ('professional', 'enterprise') THEN true
      WHEN am.min_tier = 'enterprise' AND us.plan = 'enterprise' THEN true
      ELSE false
    END
  )
);
```

### 3. Audit Trails

```javascript
// Log every action
await pool.query(
  'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
  [userId, 'api_executed', 'api', apiId, req.ip, req.get('user-agent')]
);
```

---

## 📈 PHASE PROGRESSION

### Phase 1: Platform Stabilization (CURRENT)
- ✅ Metadata registry
- ✅ User authentication
- ✅ API catalog (metadata-driven)
- ✅ Simulated execution
- ✅ Ask COGNI (RAG setup)
- ✅ Stripe billing
- ✅ Security framework

### Phase 2: Simulated Orchestration Runtime
- Real orchestration trace generation
- Real replay trace generation
- Real governance event generation
- Advanced explainability outputs

### Phase 3: Progressive Real API Activation
1. Travel APIs → Real backend
2. Drone APIs → Real backend
3. Replay APIs → Real backend
4. Governance APIs → Real backend
5. Robotics APIs → Real backend
6. Cobotics APIs → Real backend

### Phase 4: Enterprise Features
- Custom governance policies
- Advanced analytics
- SDKs for all languages
- On-premise deployment options

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] PostgreSQL with pgvector installed
- [ ] Database created and populated
- [ ] Environment variables configured
- [ ] npm dependencies installed
- [ ] Server running locally (test with `npm run start:metadata`)
- [ ] Authentication working (test signup/login)
- [ ] API catalog loading
- [ ] Simulated execution working
- [ ] Ask COGNI responding
- [ ] Stripe keys configured
- [ ] Frontend connected to new backend
- [ ] Push to GitHub
- [ ] Redeploy on Hostinger

---

## 🔗 NEXT STEPS

1. **Get Stripe API Keys**
   - Create account at https://stripe.com
   - Copy Secret Key to .env

2. **Set up PostgreSQL**
   - Follow database setup steps above
   - Load schema

3. **Configure API Keys**
   - OpenAI or Claude API key
   - Add to .env

4. **Test Locally**
   ```bash
   npm run start:metadata
   # Test: curl http://localhost:3000/api/health
   ```

5. **Deploy to Hostinger**
   - Push code to GitHub
   - Redeploy via Hostinger Git Sync
   - Set environment variables in Hostinger panel

---

## 📞 SUPPORT

All features are **metadata-driven**. To add new functionality:
1. Add to `api_metadata` table
2. Platform auto-generates everything else

Questions? Check the `api_metadata` table structure - it's the single source of truth.
