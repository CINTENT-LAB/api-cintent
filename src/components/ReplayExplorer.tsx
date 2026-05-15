import React, { useState } from 'react';

export function ReplayExplorer() {
  const [replayId, setReplayId] = useState('');
  const [replay, setReplay] = useState<any>(null);

  async function reconstruct() {
    const response = await fetch(`/api/replay/reconstruct/${encodeURIComponent(replayId)}`, { credentials: 'include' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Replay reconstruction failed');
    setReplay(payload.replay);
  }

  return (
    <section className="replay-explorer">
      <h2>Enterprise Replay Explorer</h2>
      <input value={replayId} onChange={event => setReplayId(event.target.value)} placeholder="Replay or orchestration id" />
      <button type="button" onClick={reconstruct}>Reconstruct Replay</button>
      {replay && (
        <div className="replay-grid">
          <article><h3>Timeline</h3><pre>{JSON.stringify(replay.timeline, null, 2)}</pre></article>
          <article><h3>Diff</h3><pre>{JSON.stringify(replay.diff, null, 2)}</pre></article>
        </div>
      )}
    </section>
  );
}
