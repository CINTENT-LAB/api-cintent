# CANONICAL API METADATA STANDARD v1.0
## The Operating System of CINTENT Platform v2

**Status:** FROZEN | **Version:** 1.0.0 | **Effective Date:** May 13, 2026

---

## 🏛️ ARCHITECTURAL PRINCIPLE

> **Everything the platform does is derived from metadata.**
>
> No hardcoding. No feature-specific logic.
>
> Metadata drives: documentation, playgrounds, SDKs, billing, access control, Ask COGNI, observability, search, governance.

---

## 📋 CANONICAL METADATA STRUCTURE

Every API in CINTENT is defined by this schema. This is immutable until v2.

```yaml
api:
  # IDENTITY
  api_key: "travel_orchestration_v2"           # Unique identifier (immutable)
  name: "Travel Orchestration Engine"          # Display name
  version: "2.1.0"                             # Semantic version
  
  # CATEGORIZATION
  category: "Travel"                           # Travel | Drone | Robotics | Cobotics | Governance | Replay | Observability
  domains:
    - name: "travel"
    - business_problem: "booking_optimization"
    - workflow: "multi_step_orchestration"
    - orchestration_type: "sequential"         # sequential | parallel | conditional | hybrid
    - industry_capability: "e-commerce"
    - replay_explainability: true
  
  # DESCRIPTIONS
  short_description: "Orchestrate complex travel bookings across multiple providers"
  full_description: "..."
  use_cases:
    - "flight_booking"
    - "hotel_coordination"
    - "itinerary_planning"
  
  # CAPABILITIES (what this API does)
  capabilities:
    orchestration: true         # Can orchestrate other APIs
    replay: true               # Supports replay/time-travel
    governance: true           # Governance policy enforced
    distributed: true          # Distributed coordination
    multimodal: false          # Multimodal execution
    explainability: true       # Provides explainability
  
  # LIFECYCLE & VERSIONING
  lifecycle_state: "production"               # planned | beta | stable | production | deprecated | archived
  released_at: "2026-01-15T00:00:00Z"
  
  backward_compatible_to: "2.0.0"
  breaking_changes: []
  migration_guide: null
  
  deprecated_at: null
  sunset_date: null
  
  # API SPECIFICATION
  endpoints:
    - method: "POST"
      path: "/orchestrate"
      description: "Execute orchestrated travel booking"
      request_schema:
        type: "object"
        properties:
          trip_type: { type: "string", enum: ["round_trip", "one_way"] }
          origin: { type: "string" }
          destination: { type: "string" }
          dates: { type: "object" }
        required: ["trip_type", "origin", "destination", "dates"]
      response_schema:
        type: "object"
        properties:
          orchestration_id: { type: "string" }
          status: { type: "string" }
          flights: { type: "array" }
          hotels: { type: "array" }
          confidence_score: { type: "number" }
    
    - method: "GET"
      path: "/status/:orchestration_id"
      description: "Get orchestration status and results"
      response_schema: { ... }
  
  # DOCUMENTATION
  documentation_url: "/docs/travel-orchestration"
  documentation_markdown: "..."
  
  # CODE EXAMPLES (for SDKs)
  code_examples:
    typescript: |
      const result = await cintent.apis.travel.orchestrate({
        trip_type: 'round_trip',
        origin: 'SFO',
        destination: 'NYC'
      });
    
    python: |
      result = cintent.apis.travel.orchestrate(
        trip_type='round_trip',
        origin='SFO',
        destination='NYC'
      )
    
    rest: |
      POST /api/travel_orchestration_v2/orchestrate
      Content-Type: application/json
      
      {
        "trip_type": "round_trip",
        "origin": "SFO",
        "destination": "NYC"
      }
  
  # SDK GENERATION
  sdk_generation:
    auto_generate: true
    languages: ["typescript", "python", "rest"]
    npm_package: "@cintent/travel-orchestration-sdk"
    pypi_package: "cintent-travel-orchestration"
  
  # EXECUTION MODES
  execution_modes:
    - mode: "simulated"
      default: true
      description: "Generate simulated orchestration traces"
      generates:
        - orchestration_trace: true
        - replay_trace: true
        - governance_events: true
        - confidence_evolution: true
    
    - mode: "production"
      available_tier: "professional"
      description: "Execute real backend calls"
  
  # BILLING & ACCESS
  billing:
    tier_access: "developer"                  # free | developer | professional | enterprise
    quota_limit: 10000                       # API calls per month (in tier)
    rate_limit: 100                          # Calls per second
    pricing:
      free: { quota: 100, price: 0 }
      developer: { quota: 10000, price: 29 }
      professional: { quota: 100000, price: 99 }
      enterprise: { quota: "unlimited", price: "custom" }
  
  # ACCESS POLICIES
  access_policies:
    - type: "tier_based"
      allowed_tiers: ["developer", "professional", "enterprise"]
      denied_tiers: ["free"]
    
    - type: "feature_restricted"
      simulation_only: false
      enterprise_only: false
      governance_restricted: false
    
    - type: "runtime"
      max_concurrent: 5
      max_calls_per_minute: 100
  
  # DEPENDENCIES
  dependencies:
    - api_key: "replay_service_v1"
      type: "replay"
      criticality: "critical"
      required: true
    
    - api_key: "governance_enforcement_v1"
      type: "governance"
      criticality: "important"
      required: true
  
  # OBSERVABILITY & METRICS
  metrics:
    track_execution_time: true
    track_confidence_evolution: true
    track_governance_events: true
    track_distributed_hops: true
    track_replay_divergences: true
  
  # COGNITIVE FEATURES
  cognitive:
    generates_orchestration_traces: true
    generates_replay_traces: true
    generates_explainability_outputs: true
    provides_confidence_evolution: true
    supports_divergence_analysis: true
  
  # ASK COGNI INTEGRATION
  ask_cogni:
    documentation_indexed: true
    examples_indexed: true
    orchestration_patterns_indexed: true
    troubleshooting_indexed: true
  
  # INTERNAL METADATA
  tags: ["travel", "orchestration", "booking"]
  keywords: ["flight", "hotel", "itinerary", "booking", "orchestration"]
  internal_notes: "..."
  
  # SYSTEM FIELDS
  created_at: "2026-01-15T00:00:00Z"
  updated_at: "2026-05-13T00:00:00Z"
  simulated: false
```

---

## ✅ VALIDATION CHECKLIST

For every API, verify:

- [ ] `api_key` - unique, immutable, lowercase_underscore_separated_vN
- [ ] `name` - clear, descriptive
- [ ] `version` - semantic versioning (major.minor.patch)
- [ ] `category` - one of: Travel, Drone, Robotics, Cobotics, Governance, Replay, Observability
- [ ] `lifecycle_state` - accurately reflects current state
- [ ] `endpoints` - at least 1, with complete schemas
- [ ] `code_examples` - TypeScript, Python, REST
- [ ] `capabilities` - accurately reflect what API can do
- [ ] `tier_access` - billing tier requirement
- [ ] `dependencies` - all required APIs listed
- [ ] `cognitive` - accurately reflect cognitive features

---

## 🚫 WHAT THIS SCHEMA EXCLUDES

**Intentionally NOT in metadata:**
- ❌ Frontend-specific UI hints (use generic rendering)
- ❌ Implementation details (use schemas)
- ❌ Performance optimizations (handle separately)
- ❌ Caching strategies (handle separately)
- ❌ Monitoring configurations (handle separately)

**Why?** Metadata must be **pure specification**, not implementation.

---

## 📊 METADATA-DRIVEN PLATFORM FLOW

```
1. API Metadata (canonical schema above)
   ↓
2. Documentation (auto-generated from metadata.documentation_markdown)
   ↓
3. Playground (auto-generated from metadata.endpoints)
   ↓
4. SDK (auto-generated from metadata.code_examples)
   ↓
5. Billing (enforced from metadata.billing.tier_access)
   ↓
6. Access Control (enforced from metadata.access_policies)
   ↓
7. Ask COGNI (indexed from metadata + code_examples)
   ↓
8. Observability (metrics defined in metadata.metrics)
   ↓
9. Search (keywords in metadata.keywords)
   ↓
10. Governance (enforced from metadata.dependencies)
```

---

## 🔄 SCHEMA EVOLUTION

**v1.0** (FROZEN - Current)
- Baseline metadata specification
- Drives all platform features
- No breaking changes without major version bump

**v1.x** (Backward compatible additions)
- New optional fields
- New capability flags
- Enhanced metrics

**v2.0** (Future - Breaking changes)
- Only after stabilization phase complete
- Requires migration plan for existing APIs

---

## 📝 EXAMPLE: Complete API Metadata (Travel Orchestration)

```json
{
  "api_key": "travel_orchestration_v2",
  "name": "Travel Orchestration Engine",
  "version": "2.1.0",
  "category": "Travel",
  "lifecycle_state": "production",
  "short_description": "Orchestrate complex travel bookings across multiple providers",
  "tier_access": "developer",
  "quota_limit": 10000,
  "endpoints": [
    {
      "method": "POST",
      "path": "/orchestrate",
      "description": "Execute orchestrated travel booking"
    }
  ],
  "capabilities": {
    "orchestration": true,
    "replay": true,
    "governance": true,
    "distributed": true
  },
  "code_examples": {
    "typescript": "const result = await cintent.apis.travel.orchestrate({...});",
    "python": "result = cintent.apis.travel.orchestrate(...)",
    "rest": "POST /api/travel_orchestration_v2/orchestrate"
  },
  "dependencies": [
    {
      "api_key": "replay_service_v1",
      "type": "replay",
      "criticality": "critical"
    }
  ]
}
```

---

## 🎯 IMMUTABLE RULES

These principles are non-negotiable:

1. **Every feature derives from metadata**
2. **Metadata is the source of truth**
3. **No hardcoding API-specific logic**
4. **Schemas are auto-generated**
5. **SDKs are auto-generated**
6. **Documentation is auto-generated**
7. **Billing is metadata-driven**
8. **Access control is metadata-driven**
9. **Governance is metadata-driven**
10. **Observability is metadata-driven**

---

## ✅ NEXT PHASE

With this schema frozen, we can now:
1. ✅ Populate 50-100 APIs
2. ✅ Validate metadata-driven generation
3. ✅ Build cognitive visualizer
4. ✅ Test end-to-end workflow

**This schema does not change until v2.0.**
