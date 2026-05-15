import React, { useEffect, useState } from 'react';

export function EnterpriseSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/settings/platform', { credentials: 'include' })
      .then(response => response.json())
      .then(payload => setSettings(payload.settings))
      .catch(err => setError(err.message));
  }, []);

  async function save(next: any) {
    const response = await fetch('/api/settings/platform', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to save settings');
    setSettings(payload.settings);
  }

  if (error) return <p role="alert">{error}</p>;
  if (!settings) return <p>Loading settings...</p>;

  return (
    <section>
      <h2>Enterprise Access Mode</h2>
      <label>
        <input
          type="checkbox"
          checked={settings.publicSandboxEnabled}
          onChange={event => save({ publicSandboxEnabled: event.target.checked, accessMode: event.target.checked ? 'public-sandbox' : 'authenticated-only' })}
        />
        Public Sandbox enabled
      </label>
      <p>Mode: {settings.accessMode}</p>
    </section>
  );
}
