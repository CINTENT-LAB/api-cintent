import { useEffect, useState } from 'react';

export type ManufacturingTelemetry = {
  id: string;
  domain: 'manufacturing';
  line: string;
  temperature: number;
  vibration: number;
  throughput: number;
  anomaly: boolean;
  recommendation: string;
  timestamp: string;
};

export function useManufacturingTelemetry(enabled = true) {
  const [latest, setLatest] = useState<ManufacturingTelemetry | null>(null);
  const [status, setStatus] = useState<'idle' | 'streaming' | 'closed' | 'error'>('idle');

  useEffect(() => {
    if (!enabled) return;
    setStatus('streaming');
    const stream = new EventSource('/api/telemetry/manufacturing/stream', { withCredentials: true });
    stream.addEventListener('telemetry', event => setLatest(JSON.parse((event as MessageEvent).data)));
    stream.onerror = () => setStatus('error');
    return () => {
      stream.close();
      setStatus('closed');
    };
  }, [enabled]);

  return { latest, status, maintenanceRecommended: Boolean(latest?.anomaly) };
}
