import React, { useEffect, useState } from 'react';

type TraceEvent = {
  id: string;
  type: string;
  timestamp: string;
  payload: unknown;
  decision: unknown;
};

export function ExecutionTraceSidebar() {
  const [open, setOpen] = useState(true);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [selected, setSelected] = useState<TraceEvent | null>(null);

  useEffect(() => {
    const stream = new EventSource('/api/traces/stream', { withCredentials: true });
    stream.addEventListener('hello', event => {
      const payload = JSON.parse((event as MessageEvent).data);
      setEvents(payload.recent || []);
    });
    stream.addEventListener('trace', event => {
      const trace = JSON.parse((event as MessageEvent).data);
      setEvents(current => [trace, ...current].slice(0, 100));
    });
    return () => stream.close();
  }, []);

  return (
    <aside className={`execution-trace ${open ? 'open' : 'collapsed'}`} aria-label="Execution Trace">
      <button type="button" onClick={() => setOpen(value => !value)}>
        {open ? 'Hide' : 'Show'} Execution Trace
      </button>
      {open && (
        <div className="trace-body">
          {events.map(event => (
            <button key={event.id} type="button" className="trace-row" onClick={() => setSelected(event)}>
              <strong>{event.type}</strong>
              <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
            </button>
          ))}
          {selected && (
            <section className="trace-detail">
              <h3>{selected.type}</h3>
              <pre>{JSON.stringify({ payload: selected.payload, decision: selected.decision }, null, 2)}</pre>
            </section>
          )}
        </div>
      )}
    </aside>
  );
}
