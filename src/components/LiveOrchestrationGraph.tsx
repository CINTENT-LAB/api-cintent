import React, { useEffect, useState } from 'react';

type RuntimeEvent = {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
};

export function LiveOrchestrationGraph({ orchestrationId }: { orchestrationId?: string }) {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [run, setRun] = useState<any>(null);

  useEffect(() => {
    const stream = new EventSource('/api/event-bus/stream', { withCredentials: true });
    stream.addEventListener('hello', event => {
      const payload = JSON.parse((event as MessageEvent).data);
      setEvents(payload.recent || []);
    });
    stream.addEventListener('runtime-event', event => {
      const item = JSON.parse((event as MessageEvent).data);
      setEvents(current => [item, ...current].slice(0, 100));
    });
    return () => stream.close();
  }, []);

  useEffect(() => {
    if (!orchestrationId) return;
    fetch(`/api/orchestration/fabric/${orchestrationId}`, { credentials: 'include' })
      .then(response => response.json())
      .then(payload => setRun(payload.run))
      .catch(console.error);
  }, [orchestrationId]);

  const nodes = run?.graph?.nodes || events
    .filter(event => event.type === 'orchestration.stage.completed')
    .map(event => event.payload.stage);

  return (
    <section className="live-orchestration-graph">
      <header>
        <h2>Live Orchestration Graph</h2>
        <span>{nodes.length} runtime nodes</span>
      </header>
      <div className="graph-grid">
        {nodes.map((node: any, index: number) => (
          <article key={`${node.id || node.step}-${index}`}>
            <strong>{node.label || node.id || node.step}</strong>
            <span>{node.runtimeState || node.state || node.liveState || 'runtime'}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
