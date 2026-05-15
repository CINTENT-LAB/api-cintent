import React, { useState } from 'react';
import { useManufacturingTelemetry } from '../hooks/useManufacturingTelemetry';

export function TelemetryDashboard() {
  const { latest, status, maintenanceRecommended } = useManufacturingTelemetry(true);
  const [triggerResult, setTriggerResult] = useState<any>(null);

  async function trigger() {
    const response = await fetch('/api/telemetry/ingest', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'manufacturing', source: 'manual-threshold-test', temperature: 93, vibration: 6.2, anomaly: true })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Telemetry ingestion failed');
    setTriggerResult(payload);
  }

  return (
    <section className="telemetry-dashboard">
      <h2>Telemetry Synchronization</h2>
      <p>Status: {status}</p>
      {latest && <pre>{JSON.stringify(latest, null, 2)}</pre>}
      {maintenanceRecommended && <strong>Maintenance workflow recommended</strong>}
      <button type="button" onClick={trigger}>Trigger Anomaly Orchestration</button>
      {triggerResult && <pre>{JSON.stringify(triggerResult, null, 2)}</pre>}
    </section>
  );
}
