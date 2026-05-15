create extension if not exists timescaledb;

select create_hypertable('telemetry_streams', 'created_at', if_not_exists => true);
select create_hypertable('runtime_metrics', 'created_at', if_not_exists => true);

alter table telemetry_streams set (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id,stream_type'
);

select add_retention_policy('telemetry_streams', interval '30 days', if_not_exists => true);
select add_retention_policy('runtime_metrics', interval '90 days', if_not_exists => true);
