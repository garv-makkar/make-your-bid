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
    <section className="hero guest-hero"><p className="eyebrow">NO SIGN-IN NEEDED</p><h1>Your local<br /><em>auctions.</em></h1><p>Events here are saved only in this browser. Clearing site data, using a different browser, or losing this computer can remove them.</p></section>
    <section className="panel"><h3>Create a local event</h3><form className="create-form" onSubmit={create}><label>Event name<input value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder="e.g. Friday player auction" required /></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option>Players</option><option>Items</option><option>Other</option></select></label><button>Create event</button></form></section>
    {error && <p role="alert" className="error-message">{error}</p>}
    <section className="events-section"><div className="section-title"><h2>Events in this browser</h2><span>{events.length} total</span></div>{events.length ? <div className="event-grid">{events.map(event => <Link className="event-card" href={`/local/${event.id}`} key={event.id}><span className="status">{event.status}</span><h3>{event.name}</h3><p>{event.category} · {event.entries.length} entries</p><small>Updated {new Date(event.updatedAt).toLocaleDateString()}</small><span className="card-arrow">↗</span></Link>)}</div> : <div className="empty">No local events yet. Create one above to start.</div>}</section>
  </main>;
}
