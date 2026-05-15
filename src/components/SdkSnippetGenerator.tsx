import React, { useState } from 'react';

type Props = {
  method: string;
  path: string;
  body?: unknown;
};

export function SdkSnippetGenerator({ method, path, body }: Props) {
  const [language, setLanguage] = useState('curl');
  const [snippet, setSnippet] = useState('');

  async function generate(nextLanguage = language) {
    setLanguage(nextLanguage);
    const response = await fetch('/api/sdk/snippet', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, path, language: nextLanguage, body })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Snippet generation failed');
    setSnippet(payload.snippet);
  }

  return (
    <div className="sdk-snippet">
      <select value={language} onChange={event => generate(event.target.value)} aria-label="SDK language">
        <option value="curl">cURL</option>
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
      </select>
      <button type="button" onClick={() => generate(language)}>Generate snippet</button>
      {snippet ? (
        <>
          <button type="button" onClick={() => navigator.clipboard.writeText(snippet)}>Copy</button>
          <pre>{snippet}</pre>
        </>
      ) : null}
    </div>
  );
}
