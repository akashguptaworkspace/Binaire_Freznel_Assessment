import React, { useState } from 'react';
import { API_BASE, setApiBase } from '../api/client.js';

/**
 * The frontend and backend are deployed separately. If the app can't reach the
 * configured backend, let the user point it somewhere else on the fly
 * (stored in localStorage). Also shown as a slim, dismissible info strip when
 * everything is fine, so it's always clear which backend is in use.
 */
export default function ApiBaseBanner({ status }) {
  const [draft, setDraft] = useState(API_BASE);
  const offline = status === 'offline';
  const label = API_BASE || `${window.location.origin} (same origin)`;

  if (!offline) {
    return (
      <div className="api-strip">
        backend: <code>{label}</code>
        <button className="link-btn" onClick={() => setApiBase(window.prompt('Backend base URL', API_BASE) || API_BASE)}>
          change
        </button>
      </div>
    );
  }

  return (
    <div className="api-banner">
      <div>
        <strong>Can't reach the backend</strong> at <code>{label}</code>.
        <span className="muted"> Enter the deployed backend URL (e.g. the Render service URL):</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApiBase(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://freznel-queue-backend.onrender.com"
        />
        <button className="btn-solid" type="submit">
          connect
        </button>
      </form>
    </div>
  );
}
