'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SiteNavbar } from './site-navbar';
import { JoinRoomByCode } from './join-room-by-code';
import { apiError, displayError } from '@/lib/client-errors';
import { StyledSelect } from './styled-select';
import { AuctionTypePicker } from './auction-type-picker';

type EventSummary = { id: string; name: string; category: string; status: string; updatedAt: string; _count: { entries: number } };

export function Dashboard({ user, email }: { user: string; email?: string }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Football');
  const [mode, setMode] = useState('LOCAL');
  const [startingBudget, setStartingBudget] = useState('100');
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/events').then(async response => {
      if (!response.ok) throw await apiError(response, 'Could not load your events.');
      return response.json();
    }).then(setEvents).catch(caught => setLoadError(displayError(caught, 'Could not load your events.')));
  }, []);

  async function createEvent(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, category, mode, startingBudget }) });
      if (!response.ok) throw await apiError(response, 'Could not create the event.');
      const data = await response.json();
      window.location.href = `/events/${data.id}`;
    } catch (caught) { setError(displayError(caught, 'Could not create the event.')); setBusy(false); }
  }

  return <main className="shell account-dashboard-page">
    <SiteNavbar mode="account" name={user} email={email} />
    <section className="hero dashboard-hero"><p className="eyebrow">YOUR AUCTION STUDIO</p><h1>Make the next bid<br /><em>count.</em></h1><p>Create an event, add your entries, and guide each round from opening bid to final result.</p><div className="hero-steps"><span><b>01</b> Create</span><span><b>02</b> Add entries</span><span><b>03</b> Start bidding</span></div></section>
      <div className="section-title"><div><p className="eyebrow">WELCOME BACK</p><h2>{user || 'Your dashboard'}</h2></div></div>
      <section className="panel create-panel"><div className="create-panel-heading"><div><p className="eyebrow">NEW AUCTION</p><h3>Create an event</h3></div><p>Give it a name and choose how people will bid.</p></div><form className="create-form" onSubmit={createEvent}><label>Event name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Friday football auction" maxLength={120} required /></label><AuctionTypePicker category={category} onChange={setCategory} /><StyledSelect label="Mode" value={mode} onChange={setMode} options={[{ value: 'LOCAL', label: 'Local / host run', description: 'Run bids on this device' }, { value: 'ONLINE', label: 'Online / bidders join', description: 'Invite bidders to a room' }]} />{mode === 'ONLINE' && <label>Starting units per bidder<input type="number" min="0.01" max="10000000" step="0.01" value={startingBudget} onChange={e => setStartingBudget(e.target.value)} required /></label>}<button disabled={busy}>{busy ? 'Creating…' : 'Create event ↗'}</button></form>{error && <p role="alert" className="error-message">{error}</p>}</section>
      <JoinRoomByCode />
    {loadError ? <div role="alert" className="error-message dashboard-events-error">{loadError} {loadError.includes('session has expired') ? <Link href="/signin" className="text-button">Sign in</Link> : <button type="button" className="text-button" onClick={() => window.location.reload()}>Try again</button>}</div> : <Link className="dashboard-events-link" href="/dashboard/events"><strong>{events.length}</strong><span>Your events <b>↗</b><small>{events.filter(event => event.status === 'COMPLETED').length} completed</small></span></Link>}
  </main>;
}
