'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export function GoogleSignIn({ enabled }: { enabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function startSignIn() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await signIn('google', { callbackUrl: '/dashboard' });
      if (result?.error) throw new Error('Google sign-in could not start. Please try again.');
    } catch {
      setError('Google sign-in could not start. Please try again.');
      setBusy(false);
    }
  }

  if (!enabled) return <div className="error-message">Google sign-in is not configured yet. Add your Google client ID and secret to <code>.env</code>, then restart the server.</div>;
  return <><button className="google-button" disabled={busy} onClick={startSignIn}><span className="google-mark">G</span> {busy ? 'Opening Google…' : 'Continue with Google'}</button>{error && <p role="alert" className="error-message">{error}</p>}</>;
}
