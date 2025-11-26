import React, { useState } from 'react';
import API_BASE from '../services/api';

export default function Verify() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!query.trim()) {
      setError('Enter a credential ID to verify.');
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/verify/${query.trim()}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Credential could not be verified.');
        setIsLoading(false);
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err.message || 'Unexpected error while verifying.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card form-card">
      <h3>Instant verification</h3>
      <p className="lead">Paste a credential ID to confirm its authenticity in real time.</p>
      <form className="form" onSubmit={submit}>
        <label>
          Credential ID
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. CERT-8F92-AK3"
            required
          />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Verifying…' : 'Verify credential'}
        </button>
      </form>
      {error && <p className="form-feedback error">{error}</p>}
      {result && <pre className="verify-result">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
