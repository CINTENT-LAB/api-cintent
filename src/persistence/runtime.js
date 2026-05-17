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
  const DB_FAILURE_COOLDOWN_MS = 30000;
  const dbState = {
    unavailableUntil: 0
  };
  const localLedgerCache = {
    loaded: false,
    events: [],
    mtimeMs: 0
  };

  async function dbQuery(sql, params) {
    if (!enabled || !pool) return null;
    if (dbState.unavailableUntil > Date.now()) return null;
    try {
      return await pool.query(sql, params);
    } catch (error) {
      dbState.unavailableUntil = Date.now() + DB_FAILURE_COOLDOWN_MS;
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
    localLedgerCache.events.push(event);
    localLedgerCache.loaded = true;
    try {
      localLedgerCache.mtimeMs = fs.statSync(ledgerPath).mtimeMs;
    } catch (_) {
      localLedgerCache.mtimeMs = Date.now();
    }
    return event;
  }

  function readLocalLedger() {
    if (!fs.existsSync(ledgerPath)) {
      localLedgerCache.loaded = true;
      localLedgerCache.events = [];
      localLedgerCache.mtimeMs = 0;
      return localLedgerCache.events;
    }
    const mtimeMs = fs.statSync(ledgerPath).mtimeMs;
    if (localLedgerCache.loaded && localLedgerCache.mtimeMs === mtimeMs) {
      return localLedgerCache.events;
    }
    localLedgerCache.events = fs.readFileSync(ledgerPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); } catch (_) { return null; }
      })
      .filter(Boolean);
    localLedgerCache.loaded = true;
    localLedgerCache.mtimeMs = mtimeMs;
    return localLedgerCache.events;
  }

  async function queryRows(sql, params = []) {
    const result = await dbQuery(sql, params);
    return result && Array.isArray(result.rows) ? result.rows : null;
  }

  function unwrapLocalPayload(event) {
    return event && event.payload && event.payload.payload ? event.payload.payload : event && event.payload;
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

  async function listWorkspaceStates(tenantId = 'anonymous') {
    const rows = await queryRows(
      `select workspace_id, tenant_id, session_id, domain, application_id, selected_apis,
              selected_workflow, selected_simulation, state, expires_at, updated_at
         from workspaces
        where tenant_id = $1
        order by updated_at desc
        limit 50`,
      [tenantId]
    );
    if (rows) return rows;
    const seen = new Set();
    return readLocalLedger()
      .filter(event => event.type === 'workspace_state.upsert')
      .map(event => event.payload)
      .filter(payload => payload && payload.tenant_id === tenantId)
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
      .filter(payload => {
        if (seen.has(payload.workspace_id)) return false;
        seen.add(payload.workspace_id);
        return true;
      })
      .slice(0, 50);
  }

  async function getWorkspaceState({ tenantId = 'anonymous', workspaceId = null, sessionId = null } = {}) {
    const states = await listWorkspaceStates(tenantId);
    return states.find(state => workspaceId && state.workspace_id === workspaceId)
      || states.find(state => sessionId && state.session_id === sessionId)
      || states[0]
      || null;
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

  async function queryAskMemory({ tenantId = 'anonymous', workspaceId = null, sessionId = null, query = '', limit = 8 } = {}) {
    const like = `%${String(query || '').slice(0, 120)}%`;
    const rows = await queryRows(
      `select memory_id, tenant_id, workspace_id, session_id, context_id, domain, query,
              response_summary, embedding_text, metadata, created_at
         from ask_cogni_sessions
        where tenant_id = $1
          and ($2::text is null or workspace_id = $2)
          and ($3::text is null or session_id = $3)
          and ($4::text = '%%' or query ilike $4 or response_summary ilike $4 or embedding_text ilike $4)
        order by created_at desc
        limit $5`,
      [tenantId, workspaceId, sessionId, like, limit]
    );
    if (rows) return rows;
    return readLocalLedger()
      .filter(event => event.type === 'ask_memory.persist')
      .map(event => event.payload)
      .filter(memory => memory && (memory.tenant_id || memory.tenantId) === tenantId)
      .filter(memory => !workspaceId || (memory.workspace_id || memory.workspaceId) === workspaceId)
      .filter(memory => !sessionId || (memory.session_id || memory.sessionId) === sessionId)
      .map(memory => ({
        ...memory,
        semanticScore: tokenScore(`${memory.query || ''} ${memory.response_summary || ''} ${JSON.stringify(memory.metadata || {})}`, query)
      }))
      .sort((a, b) => (b.semanticScore || 0) - (a.semanticScore || 0))
      .slice(0, limit);
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

  async function listReplayEvents({ tenantId = 'anonymous', replayId = null, limit = 100 } = {}) {
    const rows = await queryRows(
      `select replay_event_id, tenant_id, workspace_id, session_id, replay_id, event_type,
              sequence_no, payload, payload_hash, created_at
         from replay_events
        where tenant_id = $1
          and ($2::text is null or replay_id = $2)
        order by created_at asc, sequence_no asc
        limit $3`,
      [tenantId, replayId, limit]
    );
    if (rows) return rows;
    return readLocalLedger()
      .filter(event => event.type === 'replay_event.persist')
      .map(event => event.payload)
      .filter(event => event && (event.tenant_id || event.tenantId) === tenantId)
      .filter(event => !replayId || (event.replay_id || event.replayId) === replayId || JSON.stringify(event).includes(replayId))
      .slice(-limit);
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

  async function listTelemetry({ tenantId = 'anonymous', streamType = null, limit = 100 } = {}) {
    const rows = await queryRows(
      `select telemetry_id, tenant_id, workspace_id, stream_type, source, sample, anomaly, created_at
         from telemetry_streams
        where tenant_id = $1
          and ($2::text is null or stream_type = $2)
        order by created_at desc
        limit $3`,
      [tenantId, streamType, limit]
    );
    if (rows) return rows;
    return readLocalLedger()
      .filter(event => event.type === 'telemetry.persist')
      .map(event => event.payload)
      .filter(event => event && (event.tenant || event.tenant_id || event.tenantId) === tenantId)
      .filter(event => !streamType || (event.domain || event.stream_type || event.streamType) === streamType)
      .slice(-limit)
      .reverse();
  }

  async function persistOrchestrationRun(run) {
    appendLocal('orchestration_run.persist', run);
    await dbQuery(
      `insert into orchestration_runs (orchestration_id, tenant_id, workspace_id, session_id, workflow_id,
              status, current_stage, confidence, input, state, retry_count, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13)
       on conflict (orchestration_id) do update set
         status=excluded.status,
         current_stage=excluded.current_stage,
         confidence=excluded.confidence,
         state=excluded.state,
         retry_count=excluded.retry_count,
         updated_at=excluded.updated_at`,
      [
        run.orchestrationId || run.orchestration_id,
        run.tenant || run.tenant_id || 'anonymous',
        run.workspaceId || run.workspace_id || null,
        run.sessionId || run.session_id || null,
        run.workflowId || run.workflow_id || null,
        run.status || 'running',
        run.currentStage || run.current_stage || (run.stages && run.stages[0] && (run.stages[0].id || run.stages[0].step)) || null,
        Number(run.confidence || run.confidenceScore || 0.9),
        safeJson(run.input || {}),
        safeJson(run),
        Number(run.recovery && run.recovery.retryCount || 0),
        run.createdAt || now(),
        run.updatedAt || now()
      ]
    );
  }

  async function getOrchestrationRun({ tenantId = 'anonymous', orchestrationId } = {}) {
    const rows = await queryRows(
      `select orchestration_id, tenant_id, workspace_id, session_id, workflow_id, status,
              current_stage, confidence, input, state, retry_count, created_at, updated_at
         from orchestration_runs
        where tenant_id = $1 and orchestration_id = $2
        limit 1`,
      [tenantId, orchestrationId]
    );
    if (rows && rows[0]) return rows[0].state || rows[0];
    const local = readLocalLedger()
      .filter(event => event.type === 'orchestration_run.persist')
      .map(event => event.payload)
      .reverse()
      .find(run => (run.tenant || run.tenant_id) === tenantId && (run.orchestrationId || run.orchestration_id) === orchestrationId);
    return local || null;
  }

  async function listRuntimeEvents({ tenantId = 'anonymous', typePrefix = '', limit = 100 } = {}) {
    const rows = await queryRows(
      `select event_id, tenant_id, workspace_id, session_id, event_type, entity_id, payload, metadata, created_at
         from runtime_events
        where tenant_id = $1
          and ($2::text = '' or event_type like $2)
        order by created_at desc
        limit $3`,
      [tenantId, `${typePrefix}%`, limit]
    );
    if (rows) return rows;
    return readLocalLedger()
      .filter(local => !typePrefix || String(local.type || local.payload?.type || '').startsWith(typePrefix))
      .map(local => local.payload)
      .filter(event => event && (event.tenantId || event.tenant_id || event.tenant) === tenantId)
      .slice(-limit)
      .reverse();
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

  function tokenScore(text = '', query = '') {
    const terms = String(query || '').toLowerCase().split(/\W+/).filter(token => token.length > 2);
    const haystack = String(text || '').toLowerCase();
    return terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
  }

  return {
    persistRuntimeEvent,
    upsertWorkspaceState,
    listWorkspaceStates,
    getWorkspaceState,
    persistAskMemory,
    queryAskMemory,
    persistReplayEvent,
    listReplayEvents,
    persistTelemetry,
    listTelemetry,
    persistOrchestrationRun,
    getOrchestrationRun,
    listRuntimeEvents,
    persistObject,
    status
  };
}

module.exports = { createPersistenceRuntime };
