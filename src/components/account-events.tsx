'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProfileMenu } from './profile-menu';

type EventSummary = { id: string; name: string; category: string; status: string; updatedAt: string; _count: { entries: number } };

export function AccountEvents({ name, email }: { name: string; email?: string }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/events').then(async (response) => {
      if (!response.ok) throw new Error((await response.json()).error || 'Could not load events.');
      return response.json();
    }).then(setEvents).catch((caught) => setError((caught as Error).message)).finally(() => setLoading(false));
  }, []);

  const visible = events.filter((event) => filter === 'all' || (filter === 'completed' ? event.status === 'COMPLETED' : event.status !== 'COMPLETED'));

  return <main className="shell event-history-page">
    <header className="topbar"><Link href="/" className="brand">make your bid<span>.</span></Link><div className="button-row"><Link className="text-button" href="/dashboard">Dashboard</Link><ProfileMenu name={name} email={email} /></div></header>
    <div className="history-heading"><div><p className="eyebrow">YOUR AUCTION ARCHIVE</p><h1>Your events<span>.</span></h1><p>Pick up an auction or revisit a finished one.</p></div><Link className="button-link" href="/dashboard">Create an event ↗</Link></div>
    <div className="history-tabs" role="group" aria-label="Filter events"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All <span>{events.length}</span></button><button className={filter === 'active' ? 'selected' : ''} onClick={() => setFilter('active')}>In progress <span>{events.filter((event) => event.status !== 'COMPLETED').length}</span></button><button className={filter === 'completed' ? 'selected' : ''} onClick={() => setFilter('completed')}>Past events <span>{events.filter((event) => event.status === 'COMPLETED').length}</span></button></div>
    {error && <p role="alert" className="error-message">{error}</p>}
    {loading ? <p className="history-empty">Loading events…</p> : visible.length ? <div className="history-list">{visible.map((event) => <Link className="history-row" href={`/events/${event.id}`} key={event.id}><span className={`status status-${event.status.toLowerCase()}`}>{event.status}</span><span className="history-row-main"><strong>{event.name}</strong><small>{event.category} · {event._count.entries} {event._count.entries === 1 ? 'entry' : 'entries'}</small></span><small>Updated {new Date(event.updatedAt).toLocaleDateString()}</small><span aria-hidden="true">↗</span></Link>)}</div> : <div className="history-empty"><strong>{filter === 'completed' ? 'No past events yet.' : 'No events here yet.'}</strong><p>{filter === 'completed' ? 'Finished auctions will appear here.' : 'Create an event to get started.'}</p></div>}
  </main>;
}
