import React, { useEffect, useMemo, useState } from 'react';

type WorkspaceContext = {
  domain: string;
  applicationId?: string;
  selectedApis?: string[];
  selectedWorkflow?: string;
  selectedSimulation?: string;
  mode?: 'beginner' | 'business' | 'technical' | 'engineering' | 'diagnostic';
  environment?: string;
};

type AskResponse = {
  directAnswer: string;
  uxLayers?: {
    simpleSummary: string;
    recommendedActions?: Array<{ id: string; label: string }>;
    contextCards?: Array<{ title: string; body: string; action: string }>;
    optionalDetails?: unknown;
    advancedDiagnostics?: unknown;
  };
  workflowStateMachine?: unknown;
  contextValidation?: { valid: boolean; mismatches: Array<{ message: string }> };
};

async function jsonFetch(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `Request failed: ${path}`);
  return payload;
}

export function AskCogniWorkspace() {
  const [context, setContext] = useState<WorkspaceContext>({ domain: 'drone', applicationId: 'chaxu', mode: 'technical', environment: 'sandbox' });
  const [question, setQuestion] = useState('Generate a drone swarm architecture with mission replay.');
  const [guidance, setGuidance] = useState<any>(null);
  const [answer, setAnswer] = useState<AskResponse | null>(null);

  const contextPayload = useMemo(() => ({ context, eventType: 'ui.context.changed', query: question }), [context, question]);

  useEffect(() => {
    const timer = setTimeout(() => {
      jsonFetch('/api/ask/context/sync', contextPayload).then(setGuidance).catch(console.error);
    }, 200);
    return () => clearTimeout(timer);
  }, [contextPayload]);

  async function ask() {
    const payload = await jsonFetch('/api/ask', { query: question, context });
    setAnswer(payload.adaptiveResponse || payload);
  }

  async function quickAction(action: string) {
    const payload = await jsonFetch('/api/ask/quick-action', { action, context });
    setGuidance((current: any) => ({ ...current, lastAction: payload }));
  }

  return (
    <div className="ask-cogni-workspace">
      <aside>
        <h2>Workspace Context</h2>
        <select value={context.domain} onChange={event => setContext({ ...context, domain: event.target.value })}>
          {['healthcare', 'drone', 'legal', 'travel', 'manufacturing', 'robotics', 'cobotics', 'multilingual'].map(domain => <option key={domain}>{domain}</option>)}
        </select>
        <input value={context.applicationId || ''} onChange={event => setContext({ ...context, applicationId: event.target.value })} placeholder="Application" />
        <input value={context.selectedWorkflow || ''} onChange={event => setContext({ ...context, selectedWorkflow: event.target.value })} placeholder="Workflow" />
      </aside>
      <main>
        <h2>Runtime Workspace</h2>
        <textarea value={question} onChange={event => setQuestion(event.target.value)} />
        <button type="button" onClick={ask}>Ask COGNI</button>
        {answer && <section><h3>Simple Summary</h3><p>{answer.uxLayers?.simpleSummary || answer.directAnswer}</p></section>}
      </main>
      <aside>
        <h2>Ask COGNI Intelligence</h2>
        {guidance?.proactiveGuidance?.quickActions?.map((action: any) => (
          <button key={action.id} type="button" onClick={() => quickAction(action.id)}>{action.label}</button>
        ))}
        {answer?.uxLayers?.contextCards?.map(card => <article key={card.title}><h3>{card.title}</h3><p>{card.body}</p></article>)}
      </aside>
    </div>
  );
}
