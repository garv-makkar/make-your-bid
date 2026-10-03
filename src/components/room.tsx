'use client';



import { useCallback, useEffect, useRef, useState } from 'react';

import { signIn } from 'next-auth/react';

import Link from 'next/link';

import { formatPrice } from '@/lib/validation';
import { AuctionProgress } from './auction-progress';
import { SignOutButton } from './account-controls';



type Won = { name: string; priceCents: number };

type Participant = { id: string; name: string; status: string; budgetCents: number; remainingCents: number; won: Won[] };

type RoomState = { id: string; name: string; category: string; status: string; version: number; startingBudgetCents: number; timerEndsAt: string | null; roundMode: string; orderMode: string; role: string; current: { id: string; name: string; basePriceCents: number; imageUrl: string | null } | null; leading: { amountCents: number; bidderName: string; mine: boolean } | null; myOfferCents: number | null; offerCount: number; balance: { budgetCents: number; remainingCents: number; won: Won[] } | null; entries: { id: string; name: string | null; status: string; winner: string | null; soldPriceCents: number | null; saleMode: string | null }[]; participants: Participant[] };



export function Room({ id, signedIn, googleEnabled }: { id: string; signedIn: boolean; googleEnabled: boolean }) {

  const [room, setRoom] = useState<RoomState | null>(null);

  const [error, setError] = useState('');

  const [connectionIssue, setConnectionIssue] = useState('');

  const [notice, setNotice] = useState('');

  const [busy, setBusy] = useState(false);

  const [offer, setOffer] = useState('');

  const [budget, setBudget] = useState('100');

  const [now, setNow] = useState(Date.now());

  const [copied, setCopied] = useState(false);

  const refreshInFlight = useRef<Promise<void> | null>(null);

  const roomVersion = useRef<number | null>(null);
  const budgetInitialized = useRef(false);

  const seconds = room?.timerEndsAt ? Math.max(0, Math.ceil((new Date(room.timerEndsAt).getTime() - now) / 1000)) : null;

  const refresh = useCallback(async () => {

    if (refreshInFlight.current) return refreshInFlight.current;

    const pending = (async () => {

      try {

        const suffix = roomVersion.current === null ? '' : `?version=${roomVersion.current}`;

        const response = await fetch(`/api/rooms/${id}${suffix}`, { cache: 'no-store' });

        if (response.status === 204) { setConnectionIssue(''); return; }

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Could not load room.');

        if (!budgetInitialized.current) {
          setBudget(String(data.startingBudgetCents / 100));
          budgetInitialized.current = true;
        }
        roomVersion.current = data.version;

        setRoom(data); setError(''); setConnectionIssue('');

      } catch (caught) {

        const message = (caught as Error).message;

        if (roomVersion.current === null) setError(message);

        else setConnectionIssue('Connection interrupted. Retrying automatically…');

      }

    })();

    refreshInFlight.current = pending;

    try { await pending; }

    finally { if (refreshInFlight.current === pending) refreshInFlight.current = null; }

  }, [id]);

  const refreshAfterAction = useCallback(async () => {

    if (refreshInFlight.current) await refreshInFlight.current;

    roomVersion.current = null;

    await refresh();

  }, [refresh]);

  useEffect(() => {

    if (!signedIn) return;

    let stopped = false;

    let timeout: ReturnType<typeof setTimeout>;

    const poll = async () => {

      await refresh();

      if (!stopped) timeout = setTimeout(poll, document.hidden ? 10000 : 1000);

    };

    void poll();

    return () => { stopped = true; clearTimeout(timeout); };

  }, [signedIn, refresh]);

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  useEffect(() => {

    if (!notice) return;

    const timer = setTimeout(() => setNotice(''), 4000);

    return () => clearTimeout(timer);

  }, [notice]);



  async function act(data: Record<string, unknown>) {

    setBusy(true); setError(''); setNotice('');

    try {

      const response = await fetch(`/api/rooms/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Could not complete action.');

      const action = String(data.action || '');

      const messages: Record<string, string> = { join: 'Request sent to the host.', decide: 'Bidder access updated.', bid: 'Bid placed.', timer: 'Timer started.', cancelTimer: 'Timer cancelled.', roundMode: 'Round mode updated.', startingBudget: 'Starting balance updated.', budget: 'Bidder balance updated.', award: 'Round awarded.', skip: 'Entry moved to the end.', unsold: 'Entry marked unsold.' };

      if (action === 'join') setRoom(current => current ? { ...current, role: 'PENDING' } : current);

      setNotice(messages[action] || 'Room updated.');

      await refreshAfterAction(); return true;

    } catch (error) { const message = (error as Error).message; await refresh(); setError(message); return false; }

    finally { setBusy(false); }

  }

  async function eventAction(action: string, order: 'ordered' | 'shuffle' | 'hidden' = 'ordered') {

    if (!room) return;

    setBusy(true); setError(''); setNotice('');

    try {

      const response = await fetch(`/api/events/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, version: room.version, ...(action === 'start' ? { order } : {}) }) });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Could not update event.');

      setNotice(action === 'start' ? 'Auction started.' : action === 'pause' ? 'Bidding paused.' : 'Bidding resumed.');

      await refreshAfterAction();

    } catch (error) { const message = (error as Error).message; await refresh(); setError(message); }

    finally { setBusy(false); }

  }

  async function submitBid(e: React.FormEvent) { e.preventDefault(); if (room?.current && await act({ action: 'bid', entryId: room.current.id, amount: offer, version: room.version })) setOffer(''); }

  async function closeRound(action: 'award' | 'unsold' | 'skip') { if (room?.current) await act({ action, entryId: room.current.id, version: room.version }); }

  async function copyLink() { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }



  return <main className="shell room-shell"><header className="topbar"><Link href="/" className="brand">make your bid<span>.</span></Link><nav className="button-row">{room?.role === 'HOST' && <Link href={`/events/${id}`} className="text-button">Manage entries →</Link>}{signedIn && <SignOutButton />}</nav></header>

    {connectionIssue && <div role="status" className="room-message warning"><span className="connection-dot" />{connectionIssue}</div>}

    {error && <div role="alert" className="room-message error"><span>{error}</span><button className="text-button" onClick={() => { setError(''); void refresh(); }}>Retry</button></div>}

    {notice && <div role="status" className="room-message success"><span>{notice}</span><button className="text-button" aria-label="Dismiss message" onClick={() => setNotice('')}>Dismiss</button></div>}

    {!signedIn ? <section className="panel room-gate"><p className="eyebrow">BIDDING ROOM</p><h1>Sign in to join</h1><p>After signing in, request access from the host.</p><div className="button-row">{googleEnabled && <button onClick={() => signIn('google', { callbackUrl: location.href })}>Continue with Google</button>}</div></section> : !room ? <div className="panel room-loading"><span className="loading-spinner" /><div><strong>Opening bidding room</strong><p>Connecting to the live auction…</p></div></div> : <>

      <div className="room-heading"><div><p className="eyebrow">LIVE BIDDING ROOM · {room.category.toUpperCase()}</p><h1>{room.name}</h1><span className="status">{room.status}</span></div><div className="button-row">{room.role === 'HOST' && <button className="secondary" onClick={copyLink}>{copied ? 'Copied!' : 'Copy invite link'}</button>}</div></div>

      {room.role === 'VISITOR' && <section className="panel room-gate"><h2>Join this auction</h2><p>Ask the host for approval to bid and follow the live rounds.</p><button disabled={busy} onClick={() => act({ action: 'join' })}>{busy ? 'Sending request…' : 'Request to join'}</button></section>}

      {room.role === 'PENDING' && <div className="panel room-gate waiting-card"><span className="loading-spinner" /><div><h2>Waiting for host approval</h2><p>You can leave this screen open. Access updates automatically.</p></div></div>}

      {room.role === 'REJECTED' && <div className="panel room-gate"><h2>Join request declined</h2><p>Ask the host if you need access to this room.</p></div>}

      {room.role === 'HOST' && <div className="host-tools"><section className="panel"><h2>Round controls</h2><p>Run the auction from here. The room refreshes for everyone every few seconds.</p><div className="button-row">{room.status === 'DRAFT' && <><button disabled={busy || !room.entries.length} onClick={() => eventAction('start')}>Start in order</button><button className="secondary" disabled={busy || !room.entries.length} onClick={() => eventAction('start', 'shuffle')}>Shuffle & start</button><button className="secondary" disabled={busy || !room.entries.length} onClick={() => eventAction('start', 'hidden')}>Start hidden</button></>}{room.status === 'LIVE' && <button className="secondary" disabled={busy} onClick={() => eventAction('pause')}>Pause bidding</button>}{room.status === 'PAUSED' && <button disabled={busy} onClick={() => eventAction('resume')}>Resume bidding</button>}</div>{room.current && ['LIVE', 'PAUSED'].includes(room.status) && <div className="reverse-controls"><p>Reverse bidding: lowest offer wins; every bidder pays their own final bid.</p><div className="button-row"><button disabled={busy || room.offerCount > 0 || room.roundMode === 'NORMAL'} onClick={() => act({ action: 'roundMode', mode: 'NORMAL', version: room.version })}>Normal round</button><button className="secondary" disabled={busy || room.offerCount > 0 || room.roundMode === 'REVERSE'} onClick={() => act({ action: 'roundMode', mode: 'REVERSE', version: room.version })}>Reverse round</button></div></div>}{room.status === 'DRAFT' && <form className="budget-form" onSubmit={async e => { e.preventDefault(); await act({ action: 'startingBudget', amount: budget }); }}><label>Starting units per bidder<input type="number" min="0.01" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} /></label><button className="secondary" disabled={busy}>Update balance</button><small>Current: {formatPrice(room.startingBudgetCents)} units</small></form>}</section><section className="panel"><h2>Bidder requests</h2>{room.participants.length ? <div className="participants">{room.participants.map(person => <div key={person.id} className="participant"><div><strong>{person.name}</strong><small>{person.status} · {formatPrice(person.remainingCents)} / {formatPrice(person.budgetCents)} units left</small>{person.won.length > 0 && <small>Won: {person.won.map(item => item.name).join(', ')}</small>}</div>{person.status === 'PENDING' && <div className="button-row"><button disabled={busy} onClick={() => act({ action: 'decide', participantId: person.id, approve: true })}>Approve</button><button className="secondary" disabled={busy} onClick={() => act({ action: 'decide', participantId: person.id, approve: false })}>Decline</button></div>}</div>)}</div> : <p>No join requests yet. Share the invite link.</p>}</section></div>}

      {(room.role === 'HOST' || room.role === 'APPROVED') && <><div className="room-stats"><div><small>ROUND</small><strong>{room.entries.filter(entry => entry.status !== 'PENDING').length + (room.status === 'COMPLETED' ? 0 : 1)} / {room.entries.length}</strong></div>{room.balance && <div><small>YOUR UNITS LEFT</small><strong>{formatPrice(room.balance.remainingCents)}</strong></div>}{room.leading && <div><small>{room.roundMode === 'REVERSE' ? 'LOWEST OFFER' : 'HIGHEST OFFER'}</small><strong>{formatPrice(room.leading.amountCents)}</strong></div>}</div><div className="room-body"><div className="room-main">{room.current && <section className="panel round-card"><div className="round-top"><span className="eyebrow">{room.status === 'LIVE' ? 'NOW BIDDING' : 'UP NEXT'} - {room.roundMode}</span>{seconds !== null && <span className="countdown">{seconds}s left</span>}</div><div className="round-content">{room.current.imageUrl && <img src={room.current.imageUrl} alt="" />}<div><h2>{room.current.name}</h2><p>Base price: {formatPrice(room.current.basePriceCents)} units</p><div className="highest">{room.leading ? <>{room.roundMode === 'REVERSE' ? 'Lowest' : 'Highest'} bid <strong>{formatPrice(room.leading.amountCents)}</strong> by {room.leading.bidderName}</> : 'No offers yet'}</div>{room.roundMode === 'REVERSE' && <p>{room.offerCount} bidders; each will pay their own final bid if awarded.</p>}{room.role === 'APPROVED' && room.status === 'LIVE' && <form className="bid-form" onSubmit={submitBid}><label>Your offer<input type="number" min="0.01" step="0.01" value={offer} onChange={e => setOffer(e.target.value)} placeholder={String((room.leading?.amountCents || room.current.basePriceCents) / 100)} required /></label><button disabled={busy}>{busy ? 'Submitting…' : 'Place bid'}</button>{room.myOfferCents !== null && <small>Your current bid: {formatPrice(room.myOfferCents)}</small>}</form>}{room.role === 'HOST' && room.status === 'LIVE' && <div className="host-round-actions"><div className="button-row"><button disabled={busy || !room.leading} onClick={() => closeRound('award')}>{room.roundMode === 'REVERSE' ? 'Award lowest; charge all' : 'Accept highest bid'}</button></div><div className="button-row"><button className="secondary" disabled={busy} onClick={() => closeRound('skip')}>Skip to end</button><button className="text-button" disabled={busy} onClick={() => closeRound('unsold')}>Mark permanently unsold</button></div><div className="button-row" style={{ marginTop: 12 }}><span>Timer:</span>{([10, 15, 30] as const).map(value => <button key={value} className="secondary" disabled={busy} onClick={() => act({ action: 'timer', seconds: value, version: room.version })}>{value}s</button>)}{room.timerEndsAt && <button className="text-button" disabled={busy} onClick={() => act({ action: 'cancelTimer', version: room.version })}>Cancel timer</button>}</div></div>}</div></div></section>}{room.status === 'COMPLETED' && <div className="panel room-gate"><h2>Auction complete</h2><p>All entries have been processed.</p></div>}{room.balance && <section className="panel owned-panel"><h2>Your objects</h2>{room.balance.won.length ? <ul>{room.balance.won.map((item, index) => <li key={index}>{item.name} · {formatPrice(item.priceCents)} units</li>)}</ul> : <p>No items won yet.</p>}</section>}</div><aside className="room-aside"><AuctionProgress entries={room.entries} currentId={room.status === 'LIVE' || room.status === 'PAUSED' ? room.current?.id : undefined} hidden={room.orderMode === 'HIDDEN' && room.status !== 'DRAFT' && room.status !== 'COMPLETED'} /></aside></div></>}

    </>}

  </main>;

}

