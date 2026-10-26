'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listGuestEvents, type GuestEvent } from '@/lib/local-events';
import { SiteNavbar } from './site-navbar';

export function GuestEvents({ pastOnly = false }: { pastOnly?: boolean }) {
  const [events, setEvents] = useState<GuestEvent[]>([]);
  useEffect(() => {
    const refresh = () => setEvents(listGuestEvents());
    refresh();
    window.addEventListener('make-your-bid:local-change', refresh);
    return () => window.removeEventListener('make-your-bid:local-change', refresh);
  }, []);
  const visible = pastOnly ? events.filter(event => event.status === 'COMPLETED') : events;

  return <main className="shell event-history-page">
    <SiteNavbar mode="local" backHref="/local" backLabel="Create event" />
    <div className="history-heading"><div><p className="eyebrow">LOCAL AUCTIONS</p><h1>{pastOnly ? 'Past events' : 'Events in this browser'}<span>.</span></h1><p>{pastOnly ? 'Revisit completed auctions saved on this device.' : 'Pick up an auction saved on this device.'}</p></div><Link className="button-link" href="/local">Create an event ↗</Link></div>
    <div className="history-tabs" role="group" aria-label="Filter local events"><Link className={!pastOnly ? 'selected' : ''} href="/local/events">All <span>{events.length}</span></Link><Link className={pastOnly ? 'selected' : ''} href="/local/events/past">Past events <span>{events.filter(event => event.status === 'COMPLETED').length}</span></Link></div>
    {visible.length ? <div className="history-list">{visible.map(event => <Link className="history-row" href={`/local/${encodeURIComponent(event.id)}`} key={event.id}><span className={`status status-${event.status.toLowerCase()}`}>{event.status}</span><span className="history-row-main"><strong>{event.name}</strong><small>{event.category} · {event.entries.length} {event.entries.length === 1 ? 'entry' : 'entries'}</small></span><small>Updated {new Date(event.updatedAt).toLocaleDateString()}</small><span aria-hidden="true">↗</span></Link>)}</div> : <div className="history-empty"><strong>{pastOnly ? 'No past events yet.' : 'Your first auction starts here.'}</strong><p>{pastOnly ? 'Completed auctions will appear here.' : 'Create an event to get started.'}</p></div>}
  </main>;
}
