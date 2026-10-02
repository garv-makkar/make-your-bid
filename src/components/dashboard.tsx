'use client';

import { useEffect, useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

type EventSummary = { id: string; name: string; category: string; status: string; updatedAt: string; _count: { entries: number } };

export function Dashboard({ user }: { user: string }) {
  const signedIn = true;
  const googleEnabled = false;
  const devEnabled = false;
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Players');
  const [mode, setMode] = useState('LOCAL');
  const [startingBudget, setStartingBudget] = useState('100');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    fetch('/api/events').then(async response => {
      if (!response.ok) throw new Error((await response.json()).error || 'Could not load events.');
      return response.json();
    }).then(setEvents).catch(error => setError(error.message));
  }, [signedIn]);

  async function createEvent(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, category, mode, startingBudget }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create event.');
      window.location.href = `/events/${data.id}`;
    } catch (error) { setError((error as Error).message); setBusy(false); }
  }

  return <main className="shell">
    <header className="topbar"><Link href="/" className="brand">make your bid<span>.</span></Link>{signedIn && <button className="text-button" onClick={() => signOut({ callbackUrl: '/' })}>Sign out</button>}</header>
    <section className="hero"><p className="eyebrow">AUCTION WORKSPACE</p><h1>Run your auction<br /><em>your way.</em></h1><p>Create an event, add your entries, and record each winning bid.</p></section>
    {!signedIn ? <section className="panel sign-in"><div><h2>Start here</h2><p>Sign in to save events on this computer.</p></div><div className="button-row">{devEnabled && <button onClick={() => signIn('credentials', { account: 'demo', callbackUrl: '/' })}>Continue with local demo</button>}{googleEnabled && <button className="secondary" onClick={() => signIn('google', { callbackUrl: '/' })}>Continue with Google</button>}{!devEnabled && !googleEnabled && <p>Configure a sign-in provider in .env to continue.</p>}</div></section> : <>
      <div className="section-title"><div><p className="eyebrow">WELCOME BACK</p><h2>{user || 'Your dashboard'}</h2></div></div>
      <section className="panel"><h3>Create an event</h3><form className="create-form" onSubmit={createEvent}><label>Event name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Friday player auction" maxLength={120} required /></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option>Players</option><option>Items</option><option>Other</option></select></label><label>Mode<select value={mode} onChange={e => setMode(e.target.value)}><option value="LOCAL">Local / host run</option><option value="ONLINE">Online / bidders join</option></select></label>{mode === 'ONLINE' && <label>Starting units per bidder<input type="number" min="0.01" max="10000000" step="0.01" value={startingBudget} onChange={e => setStartingBudget(e.target.value)} required /></label>}<button disabled={busy}>{busy ? 'Creating…' : 'Create event'}</button></form></section>
      <section className="events-section"><div className="section-title"><h2>Your events</h2><span>{events.length} total</span></div>{events.length ? <div className="event-grid">{events.map(event => <Link className="event-card" href={`/events/${event.id}`} key={event.id}><span className="status">{event.status}</span><h3>{event.name}</h3><p>{event.category} · {event._count.entries} entries</p><small>Updated {new Date(event.updatedAt).toLocaleDateString()}</small><span className="card-arrow">↗</span></Link>)}</div> : <div className="empty">No events yet. Create one above to get started.</div>}</section>
    </>}
    {error && <p role="alert" className="error-message">{error}</p>}
  </main>;
}
