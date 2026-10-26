'use client';

import { useEffect, useState } from 'react';
import { createGuestEvent } from '@/lib/local-events';
import { GuestEventPage } from './guest-event';
import { GuestEvents } from './guest-events';
import { AuctionTypePicker } from './auction-type-picker';
import { SiteNavbar } from './site-navbar';

export function GuestDashboard() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Football');
  const [error, setError] = useState('');
  const [offlineEventId, setOfflineEventId] = useState('');
  const [offlineView, setOfflineView] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fallbackId = params.get('event');
    setOfflineView(params.get('view') || '');
    if (fallbackId) setOfflineEventId(fallbackId);
    else if (location.hash.startsWith('#event/')) location.replace(`/local/${location.hash.slice(7)}`);
  }, []);

  function create(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try { const event = createGuestEvent(name, category); window.location.href = `/local/${encodeURIComponent(event.id)}`; }
    catch (caught) { setError((caught as Error).message); }
  }

  if (offlineEventId) return <GuestEventPage id={offlineEventId} />;
  if (offlineView === 'events' || offlineView === 'past') return <GuestEvents pastOnly={offlineView === 'past'} />;

  return <main className="shell local-dashboard-page"><SiteNavbar mode="local" backHref="/" backLabel="Home" />
    <section className="hero guest-hero dashboard-hero"><p className="eyebrow">YOUR LOCAL AUCTION STUDIO</p><h1>Make the next bid <em>count.</em></h1><p>Set up an event and run the auction from this browser. Your events stay here until this browser’s data is cleared.</p><div className="hero-steps"><span><b>01</b> Create</span><span><b>02</b> Add entries</span><span><b>03</b> Start bidding</span></div></section>
    <div className="local-room-notice"><strong>Need a live bidding room?</strong><span>Local auctions are run on this device and do not have a room for others to join. <a href="/signin">Sign in with Google</a> to host an online room.</span></div>
    <section className="panel create-panel"><div className="create-panel-heading"><div><p className="eyebrow">NEW AUCTION</p><h3>Create a local event</h3></div><p>No sign-in needed. Start with a name.</p></div><form className="create-form" onSubmit={create}><label>Event name<input value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder="e.g. Friday football auction" required /></label><AuctionTypePicker category={category} onChange={setCategory} /><button>Create event ↗</button></form>{error && <p role="alert" className="error-message">{error}</p>}</section>
  </main>;
}
