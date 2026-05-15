import React, { useMemo, useState } from 'react';
import { executeReplay, ReplayRecorder } from '../lib/replayRecorder';

export function ReplayControls() {
  const recorder = useMemo(() => new ReplayRecorder(), []);
  const [recording, setRecording] = useState(false);
  const [replay, setReplay] = useState<unknown>(null);
  const [lastRecording, setLastRecording] = useState<{ steps: any[] } | null>(null);

  return (
    <div className="replay-controls">
      <button type="button" onClick={() => { recorder.start(); setRecording(true); }}>Record</button>
      <button type="button" disabled={!recording} onClick={() => { setLastRecording(recorder.stop()); setRecording(false); }}>Stop</button>
      <button type="button" disabled={!lastRecording} onClick={async () => setReplay(await executeReplay(lastRecording!))}>Replay</button>
      {replay ? <pre>{JSON.stringify(replay, null, 2)}</pre> : null}
    </div>
  );
}
