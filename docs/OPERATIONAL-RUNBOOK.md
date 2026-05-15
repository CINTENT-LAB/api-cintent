# CINTENT Operational Runbook

## Runtime Health

1. Check `/api/health`.
2. Check `/api/ready`.
3. Check Prometheus metric `cintent_http_p95_latency_ms`.
4. Check `cintent_errors_total` and `cintent_rate_limited_total`.

## Replay Integrity Incident

1. Reconstruct replay with `/api/replay/reconstruct/:replayId`.
2. Verify `replay.integrity.digest` exists.
3. Compare `replay.consistency.timelineEvents` against expected checkpoints.
4. Export replay with `/api/replay/export/:replayId`.

## Orchestration Recovery

1. Read orchestration with `/api/orchestration/fabric/:orchestrationId`.
2. Review checkpoints and `run.integrity`.
3. Recover with `/api/orchestration/fabric/:orchestrationId/recover`.
4. Confirm `orchestration.recovered` event on `/api/event-bus/stream`.

## Telemetry Backpressure

1. Watch `cintent_telemetry_ingestions_total`.
2. Watch `cintent_rate_limited_total`.
3. If p95 latency exceeds 1000ms, reduce sandbox quota or scale API replicas.
4. Confirm anomalous telemetry still triggers replayable orchestration.

## Security Event

1. Inspect `cintent_security_denials` via `/api/metrics` JSON.
2. Review `/api/audit/logs`.
3. Rotate `JWT_SECRET` and invalidate sessions when token exposure is suspected.
4. Disable public sandbox with `/api/settings/platform` if abuse is observed.
