# Travel Domain Database Naming Rules

Allowed domain-generic table names:

- `travel_itineraries`
- `travel_events`
- `travel_replay`
- `travel_telemetry`
- `travel_continuity`
- `travel_traveler_state`
- `travel_governance_events`

Forbidden application-specific table naming patterns:

- product-prefixed session tables
- product-prefixed runtime tables
- application-prefixed telemetry tables
- application-prefixed replay tables

This phase does not create tables. These names define future persistence boundaries only.
