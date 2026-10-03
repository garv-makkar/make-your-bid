'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DeleteAccount, SignOutButton } from './account-controls';
import { JoinRoomByCode } from './join-room-by-code';

type EventSummary = { id: string; name: string; category: string; status: string; updatedAt: string; _count: { entries: number } };

export function Dashboard({ user, email }: { user: string; email?: string }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Players');
  const [mode, setMode] = useState('LOCAL');
  const [startingBudget, setStartingBudget] = useState('100');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/events').then(async response => {
      if (!response.ok) throw new Error((await response.json()).error || 'Could not load events.');
      return response.json();
    }).then(setEvents).catch(error => setError(error.message));
  }, []);

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
    <header className="topbar"><Link href="/" className="brand">make your bid<span>.</span></Link><SignOutButton /></header>
    <section className="hero dashboard-hero"><p className="eyebrow">YOUR AUCTION STUDIO</p><h1>Make the next bid<br /><em>count.</em></h1><p>Create an event, add your entries, and guide each round from opening bid to final result.</p><div className="hero-steps"><span><b>01</b> Create</span><span><b>02</b> Add entries</span><span><b>03</b> Start bidding</span></div></section>
      <div className="section-title"><div><p className="eyebrow">WELCOME BACK</p><h2>{user || 'Your dashboard'}</h2></div></div>
      <section className="panel create-panel"><div className="create-panel-heading"><div><p className="eyebrow">NEW AUCTION</p><h3>Create an event</h3></div><p>Give it a name and choose how people will bid.</p></div><form className="create-form" onSubmit={createEvent}><label>Event name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Friday player auction" maxLength={120} required /></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option>Players</option><option>Items</option><option>Other</option></select></label><label>Mode<select value={mode} onChange={e => setMode(e.target.value)}><option value="LOCAL">Local / host run</option><option value="ONLINE">Online / bidders join</option></select></label>{mode === 'ONLINE' && <label>Starting units per bidder<input type="number" min="0.01" max="10000000" step="0.01" value={startingBudget} onChange={e => setStartingBudget(e.target.value)} required /></label>}<button disabled={busy}>{busy ? 'Creating…' : 'Create event ↗'}</button></form></section>
      <JoinRoomByCode />
      <section className="events-section"><div className="section-title"><h2>Your events</h2><span>{events.length} total</span></div>{events.length ? <div className="event-grid">{events.map(event => <Link className="event-card" href={`/events/${event.id}`} key={event.id}><div className="event-card-top"><span className={`status status-${event.status.toLowerCase()}`}>{event.status}</span><span className="event-card-mode">{event.category}</span></div><h3>{event.name}</h3><p>{event._count.entries} {event._count.entries === 1 ? 'entry' : 'entries'} ready</p><small>Updated {new Date(event.updatedAt).toLocaleDateString()}</small><span className="card-arrow">↗</span></Link>)}</div> : <div className="empty empty-events"><span aria-hidden="true">✦</span><strong>Your first auction starts here.</strong><p>Create an event above, then add the people or items you want to put on the block.</p></div>}</section>
      <section className="panel account-settings"><div><p className="eyebrow">ACCOUNT &amp; PRIVACY</p><h2>{user}</h2>{email && <p>{email}</p>}<p>Signing out keeps your saved events. Deleting account data permanently removes events you own and anonymizes your activity in other auctions.</p></div><div className="account-actions"><SignOutButton /><DeleteAccount eventCount={events.length} /></div></section>
    {error && <p role="alert" className="error-message">{error}</p>}
  </main>;
}
