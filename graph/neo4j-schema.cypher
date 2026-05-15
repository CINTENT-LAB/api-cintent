create constraint tenant_id_unique if not exists for (t:Tenant) require t.tenant_id is unique;
create constraint workspace_id_unique if not exists for (w:Workspace) require w.workspace_id is unique;
create constraint orchestration_id_unique if not exists for (o:OrchestrationRun) require o.orchestration_id is unique;
create constraint replay_id_unique if not exists for (r:Replay) require r.replay_id is unique;
create constraint api_key_unique if not exists for (a:Api) require a.api_key is unique;

create index domain_key_index if not exists for (d:Domain) on (d.domain_key);
create index event_type_index if not exists for (e:RuntimeEvent) on (e.event_type);

// Relationship model:
// (:Tenant)-[:OWNS]->(:Workspace)
// (:Workspace)-[:SELECTS_DOMAIN]->(:Domain)
// (:Workspace)-[:USES_API]->(:Api)
// (:Workspace)-[:RUNS]->(:OrchestrationRun)
// (:OrchestrationRun)-[:GENERATES]->(:Replay)
// (:Replay)-[:CONTAINS]->(:RuntimeEvent)
// (:RuntimeEvent)-[:CHECKED_BY]->(:GovernancePolicy)
