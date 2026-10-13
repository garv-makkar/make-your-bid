'use client';

import { useState } from 'react';
import { apiError, displayError } from '@/lib/client-errors';

export function JoinRoomByCode() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/rooms/join-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      if (!response.ok) throw await apiError(response, 'Could not find that room. Check the code and try again.');
      const result = await response.json();
      window.location.href = `/events/${result.id}/room`;
    } catch (caught) {
      setError(displayError(caught, 'Could not open the room.'));
      setBusy(false);
    }
  }

  return <section className="panel join-code-panel"><div><p className="eyebrow">JOIN AN AUCTION</p><h2>Have a room code?</h2><p>Enter the code from your host to open the bidding room and request access.</p></div><form onSubmit={join}><label htmlFor="room-code">Room code<input id="room-code" value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="XXXXXX-XXXXXX" maxLength={13} autoComplete="off" autoCapitalize="characters" spellCheck={false} required /></label><button disabled={busy}>{busy ? 'Opening…' : 'Join room →'}</button></form>{error && <p role="alert" className="error-message">{error}</p>}</section>;
}
