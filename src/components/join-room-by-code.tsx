'use client';

import { useState } from 'react';

export function JoinRoomByCode() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/rooms/join-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not find that room.');
      window.location.href = `/events/${result.id}/room`;
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
    }
  }

  return <section className="panel join-code-panel"><div><p className="eyebrow">JOIN AN AUCTION</p><h2>Have a room code?</h2><p>Enter the code from your host to open the bidding room and request access.</p></div><form onSubmit={join}><label htmlFor="room-code">Room code<input id="room-code" value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="XXXXXX-XXXXXX" maxLength={13} autoComplete="off" autoCapitalize="characters" spellCheck={false} required /></label><button disabled={busy}>{busy ? 'Opening…' : 'Join room →'}</button></form>{error && <p role="alert" className="error-message">{error}</p>}</section>;
}
