const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function safeJson(value) {
  return JSON.stringify(value || {});
}

function now() {
  return new Date().toISOString();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stableId(prefix, seed = '') {
  return `${prefix}-${crypto.createHash('sha256').update(`${seed}:${Date.now()}:${crypto.randomBytes(6).toString('hex')}`).digest('hex').slice(0, 16)}`;
}

function createPersistenceRuntime({ pool = null, rootDir = process.cwd(), enabled = true } = {}) {
  const artifactDir = path.join(rootDir, '.cintent-runtime');
  ensureDir(artifactDir);
  const ledgerPath = path.join(artifactDir, 'runtime-ledger.jsonl');
  const objectDir = path.join(artifactDir, 'objects');
  ensureDir(objectDir);

  async function dbQuery(sql, params) {
    if (!enabled || !pool) return null;
    try {
      return await pool.query(sql, params);
    } catch (error) {
      appendLocal('persistence.db_error', { sql: sql.slice(0, 120), error: error.message });
      return null;
    }
  }

  function appendLocal(type, payload) {
    const event = {
      id: stableId('persist', type),
      type,
      payload,
      timestamp: now()
    };
    fs.appendFileSync(ledgerPath, `${safeJson(event)}\n`);
    return event;
  }

  async function persistRuntimeEvent({ type, tenantId = 'anonymous', workspaceId = null, sessionId = null, entityId = null, payload = {}, metadata = {} }) {
    const event = {
      id: stableId('event', `${tenantId}:${type}:${entityId || ''}`),
      type,
      tenantId,
      workspaceId,
      sessionId,
      entityId,
      payload,
      metadata,
      timestamp: now()
    };
    appendLocal(type, event);
    await dbQuery(
      `insert into runtime_events (event_id, tenant_id, workspace_id, session_id, event_type, entity_id, payload, metadata, created_at)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9)
       on conflict (event_id) do nothing`,
      [event.id, tenantId, workspaceId, sessionId, type, entityId, safeJson(payload), safeJson(metadata), event.timestamp]
    );
    return event;
  }

  async function upsertWorkspaceState(state) {
    const workspaceId = state.workspace_id || state.workspaceId || stableId('workspace', state.tenant_id || state.tenantId || 'anonymous');
    const tenantId = state.tenant_id || state.tenantId || 'anonymous';
    const payload = { ...state, workspace_id: workspaceId, tenant_id: tenantId, updated_at: now() };
    appendLocal('workspace_state.upsert', payload);
    await dbQuery(
      `insert into workspaces (workspace_id, tenant_id, session_id, domain, application_id, selected_apis, selected_workflow, selected_simulation, state, expires_at, updated_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9::jsonb,$10,$11)
       on conflict (workspace_id) do update set
         session_id=excluded.session_id,
         domain=excluded.domain,
         application_id=excluded.application_id,
         selected_apis=excluded.selected_apis,
         selected_workflow=excluded.selected_workflow,
         selected_simulation=excluded.selected_simulation,
         state=excluded.state,
         expires_at=excluded.expires_at,
         updated_at=excluded.updated_at`,
      [
        workspaceId,
        tenantId,
        payload.session_id || payload.sessionId || null,
        payload.domain || 'platform',
        payload.application_id || payload.applicationId || null,
        safeJson(payload.selected_apis || payload.selectedApis || []),
        payload.selected_workflow || payload.selectedWorkflow || null,
        payload.selected_simulation || payload.selectedSimulation || null,
        safeJson(payload),
        payload.expires_at || payload.expiresAt || null,
        payload.updated_at
      ]
    );
    return payload;
  }

  async function persistAskMemory(memory) {
    appendLocal('ask_memory.persist', memory);
    await dbQuery(
      `insert into ask_cogni_sessions (memory_id, tenant_id, workspace_id, session_id, context_id, domain, query, response_summary, embedding_text, metadata, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)`,
      [
        memory.memory_id || stableId('memory', memory.query),
        memory.tenant_id || memory.tenantId || 'anonymous',
        memory.workspace_id || memory.workspaceId || null,
        memory.session_id || memory.sessionId || null,
        memory.context_id || memory.contextId || null,
        memory.domain || 'platform',
        memory.query || '',
        memory.response_summary || memory.responseSummary || '',
        memory.embedding_text || `${memory.query || ''} ${memory.response_summary || ''}`,
        safeJson(memory.metadata || memory),
        now()
      ]
    );
  }

  async function persistReplayEvent(event) {
    appendLocal('replay_event.persist', event);
    await dbQuery(
      `insert into replay_events (replay_event_id, tenant_id, workspace_id, session_id, replay_id, event_type, sequence_no, payload, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
      [
        event.replay_event_id || stableId('replay-event', event.replay_id || event.replayId || event.type),
        event.tenant_id || event.tenantId || 'anonymous',
        event.workspace_id || event.workspaceId || null,
        event.session_id || event.sessionId || null,
        event.replay_id || event.replayId || null,
        event.event_type || event.type || 'runtime.event',
        Number(event.sequence_no || event.sequenceNo || 0),
        safeJson(event.payload || event),
        event.created_at || event.timestamp || now()
      ]
    );
  }

  async function persistTelemetry(event) {
    appendLocal('telemetry.persist', event);
    await dbQuery(
      `insert into telemetry_streams (telemetry_id, tenant_id, workspace_id, stream_type, source, sample, anomaly, created_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`,
      [
        event.telemetry_id || event.id || stableId('telemetry', event.source || event.domain),
        event.tenant_id || event.tenantId || event.tenant || 'anonymous',
        event.workspace_id || event.workspaceId || null,
        event.stream_type || event.streamType || event.domain || 'runtime',
        event.source || event.line || 'cintent-runtime',
        safeJson(event.sample || event),
        Boolean(event.anomaly),
        event.created_at || event.timestamp || now()
      ]
    );
  }

  async function persistObject(key, payload) {
    const normalizedKey = key.replace(/[^a-zA-Z0-9._/-]/g, '_');
    const filePath = path.join(objectDir, normalizedKey);
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, safeJson({ payload, writtenAt: now() }));
    await persistRuntimeEvent({ type: 'object_storage.write', entityId: key, payload: { key, localPath: filePath } });
    return { key, localPath: filePath };
  }

  async function status() {
    const localEvents = fs.existsSync(ledgerPath) ? fs.readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean).length : 0;
    let postgres = 'not-configured';
    if (pool) {
      const result = await dbQuery('select 1 as ok', []);
      postgres = result ? 'connected' : 'configured-unavailable';
    }
    return {
      status: 'operational',
      postgres,
      vectorMemory: pool ? 'pgvector-schema-ready' : 'local-semantic-ledger',
      graphRuntime: process.env.NEO4J_URI ? 'neo4j-configured' : 'neo4j-docker-ready',
      telemetryDatabase: process.env.TIMESCALE_URL || process.env.CLICKHOUSE_URL ? 'configured' : 'timescale-docker-ready',
      redis: process.env.REDIS_URL ? 'configured' : 'redis-docker-ready',
      objectStorage: process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT ? 'configured' : 'local-object-ledger',
      localEvents,
      artifactDir
    };
  }

  return {
    persistRuntimeEvent,
    upsertWorkspaceState,
    persistAskMemory,
    persistReplayEvent,
    persistTelemetry,
    persistObject,
    status
  };
}

module.exports = { createPersistenceRuntime };
