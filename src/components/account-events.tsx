'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SiteNavbar } from './site-navbar';
import { apiError, displayError } from '@/lib/client-errors';

type EventSummary = { id: string; name: string; category: string; status: string; updatedAt: string; _count: { entries: number } };

export function AccountEvents({ name, email, initialFilter = 'all' }: { name: string; email?: string; initialFilter?: 'all' | 'completed' }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>(initialFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadEvents() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/events');
      if (!response.ok) throw await apiError(response, 'Could not load your events.');
      setEvents(await response.json());
    } catch (caught) {
      setError(displayError(caught, 'Could not load your events.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadEvents(); }, []);

  const visible = events.filter((event) => filter === 'all' || (filter === 'completed' ? event.status === 'COMPLETED' : event.status !== 'COMPLETED'));

  return <main className="shell event-history-page">
    <SiteNavbar mode="account" backHref="/dashboard" backLabel="Dashboard" name={name} email={email} />
    <div className="history-heading"><div><p className="eyebrow">YOUR AUCTION ARCHIVE</p><h1>Your events<span>.</span></h1><p>Pick up an auction or revisit a finished one.</p></div><Link className="button-link" href="/dashboard">Create an event ↗</Link></div>
    <div className="history-tabs" role="group" aria-label="Filter events"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All <span>{events.length}</span></button><button className={filter === 'active' ? 'selected' : ''} onClick={() => setFilter('active')}>In progress <span>{events.filter((event) => event.status !== 'COMPLETED').length}</span></button><button className={filter === 'completed' ? 'selected' : ''} onClick={() => setFilter('completed')}>Past events <span>{events.filter((event) => event.status === 'COMPLETED').length}</span></button></div>
    {error && <div role="alert" className="error-message">{error} {error.includes('session has expired') ? <Link href="/signin" className="text-button">Sign in</Link> : <button type="button" className="text-button" onClick={() => { void loadEvents(); }}>Try again</button>}</div>}
    {loading ? <p className="history-empty">Loading events…</p> : error ? null : visible.length ? <div className="history-list">{visible.map((event) => <Link className="history-row" href={`/events/${event.id}`} key={event.id}><span className={`status status-${event.status.toLowerCase()}`}>{event.status}</span><span className="history-row-main"><strong>{event.name}</strong><small>{event.category} · {event._count.entries} {event._count.entries === 1 ? 'entry' : 'entries'}</small></span><small>Updated {new Date(event.updatedAt).toLocaleDateString()}</small><span aria-hidden="true">↗</span></Link>)}</div> : <div className="history-empty"><strong>{filter === 'completed' ? 'No past events yet.' : 'No events here yet.'}</strong><p>{filter === 'completed' ? 'Finished auctions will appear here.' : 'Create an event to get started.'}</p></div>}
  </main>;
}
