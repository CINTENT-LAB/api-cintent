export type ReplayStep = {
  action: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

export class ReplayRecorder {
  private steps: ReplayStep[] = [];
  private active = false;

  start() {
    this.steps = [];
    this.active = true;
  }

  stop() {
    this.active = false;
    return this.export();
  }

  record(action: string, payload: Record<string, unknown>) {
    if (!this.active) return;
    this.steps.push({ action, payload, timestamp: new Date().toISOString() });
  }

  export() {
    return { version: '1.0', generatedAt: new Date().toISOString(), steps: this.steps };
  }
}

export async function executeReplay(recording: { steps: ReplayStep[] }) {
  const response = await fetch('/api/replay/execute', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recording)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
