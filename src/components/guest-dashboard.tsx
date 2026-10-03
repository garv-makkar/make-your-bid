'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createGuestEvent, listGuestEvents, type GuestEvent } from '@/lib/local-events';

export function GuestDashboard() {
  const [events, setEvents] = useState<GuestEvent[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Players');
  const [error, setError] = useState('');
  useEffect(() => { setEvents(listGuestEvents()); }, []);

  function create(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try { const event = createGuestEvent(name, category); window.location.href = `/local/${event.id}`; }
    catch (caught) { setError((caught as Error).message); }
  }

  return <main className="shell"><header className="topbar"><Link href="/" className="brand">make your bid<span>.</span></Link><div className="button-row"><Link className="text-button" href="/">Home</Link><Link className="button-link" href="/signin">Sign in with Google</Link></div></header>
    <section className="hero guest-hero dashboard-hero"><p className="eyebrow">YOUR LOCAL AUCTION STUDIO</p><h1>Make the next bid<br /><em>count.</em></h1><p>Set up an event and run the auction from this browser. Your events stay here until this browser’s data is cleared.</p><div className="hero-steps"><span><b>01</b> Create</span><span><b>02</b> Add entries</span><span><b>03</b> Start bidding</span></div></section>
    <div className="local-room-notice"><strong>Need a live bidding room?</strong><span>Local auctions are run on this device and do not have a room for others to join. <Link href="/signin">Sign in with Google</Link> to host an online room.</span></div>
    <section className="panel create-panel"><div className="create-panel-heading"><div><p className="eyebrow">NEW AUCTION</p><h3>Create a local event</h3></div><p>No sign-in needed. Start with a name.</p></div><form className="create-form" onSubmit={create}><label>Event name<input value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder="e.g. Friday player auction" required /></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option>Players</option><option>Items</option><option>Other</option></select></label><button>Create event ↗</button></form></section>
    {error && <p role="alert" className="error-message">{error}</p>}
    <section className="events-section"><div className="section-title"><h2>Events in this browser</h2><span>{events.length} total</span></div>{events.length ? <div className="event-grid">{events.map(event => <Link className="event-card" href={`/local/${event.id}`} key={event.id}><div className="event-card-top"><span className={`status status-${event.status.toLowerCase()}`}>{event.status}</span><span className="event-card-mode">{event.category}</span></div><h3>{event.name}</h3><p>{event.entries.length} {event.entries.length === 1 ? 'entry' : 'entries'} ready</p><small>Updated {new Date(event.updatedAt).toLocaleDateString()}</small><span className="card-arrow">↗</span></Link>)}</div> : <div className="empty empty-events"><span aria-hidden="true">✦</span><strong>Your first auction starts here.</strong><p>Create an event above, then add the people or items you want to put on the block.</p></div>}</section>
  </main>;
}
