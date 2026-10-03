'use client';

import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/validation';
import { roundRules } from '@/lib/round-modes';

type Bidder = { id: string; userId: string; name: string };
type Bid = { entryId: string; bidderId: string; bidderName: string; amountCents: number };
type Entry = { id: string; name: string; basePriceCents: number; imageUrl: string | null };

export function LocalBidRound({ entry, mode, bidders, bids, timerEndsAt, busy, command }: {
  entry: Entry; mode: string; bidders: Bidder[]; bids: Bid[]; timerEndsAt: string | null;
  busy: boolean; command: (data: Record<string, unknown>) => Promise<boolean>;
}) {
  const [bidder, setBidder] = useState('');
  const [amount, setAmount] = useState('');
  const [now, setNow] = useState(Date.now());
  const settling = useRef<string | null>(null);
  const current = bids.filter(bid => bid.entryId === entry.id);
  const latest = new Map<string, Bid>();
  for (const bid of current) latest.set(bid.bidderId, bid);
  const offers = [...latest.values()].sort((a, b) => b.amountCents - a.amountCents);
  const seconds = timerEndsAt ? Math.max(0, Math.ceil((new Date(timerEndsAt).getTime() - now) / 1000)) : null;

  useEffect(() => { const tick = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(tick); }, []);
  useEffect(() => {
    if (mode !== 'TIMED' || seconds !== 0 || busy || settling.current === entry.id) return;
    settling.current = entry.id;
    void command({ action: 'settleTimed', entryId: entry.id });
  }, [mode, seconds, busy, entry.id, command]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const person = bidders.find(item => item.userId === bidder);
    if (await command({ action: 'recordBid', entryId: entry.id, bidder: person?.name || bidder, bidderId: person?.userId, amount })) setAmount('');
  }

  return <section className="panel current">
    <div className="round-top"><p className="eyebrow">ON THE BLOCK · {roundRules(mode).name.toUpperCase()}</p>{seconds !== null && <strong className="countdown">{seconds}s left</strong>}</div>
    <div className="round-rules"><strong>Rules for this round</strong><p>{roundRules(mode).rules}</p></div>
    <div className="current-grid">{entry.imageUrl && <img src={entry.imageUrl} alt="" />}<div>
      <h2>{entry.name}</h2><p>Base price: {formatPrice(entry.basePriceCents)} units</p>
      <p>{mode === 'SEALED' ? `${offers.length} sealed ${offers.length === 1 ? 'offer' : 'offers'} received. The winning offer appears after this round closes.` : offers.length ? `Leading bid: ${formatPrice(offers[0].amountCents)} units by ${offers[0].bidderName}` : 'No offers yet.'}</p>
      {seconds !== 0 && <form className="bid-form" onSubmit={submit}><label>Bidder{bidders.length ? <select value={bidder} onChange={e => setBidder(e.target.value)} required><option value="">Choose bidder</option>{bidders.map(person => <option key={person.id} value={person.userId}>{person.name}</option>)}</select> : <input value={bidder} onChange={e => setBidder(e.target.value)} maxLength={120} required />}</label><label>Offer<input type="number" min={entry.basePriceCents / 100} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required /></label><button disabled={busy}>Record {mode === 'SEALED' ? 'sealed' : 'timed'} bid</button></form>}
      {mode === 'SEALED' && <button disabled={busy || !offers.length} onClick={() => command({ action: 'awardBids', entryId: entry.id })}>Close bids and award highest</button>}
      {mode === 'TIMED' && seconds === 0 && <button disabled={busy} onClick={() => command({ action: 'settleTimed', entryId: entry.id })}>Settle timed round</button>}
      {mode === 'SEALED' && <div className="button-row" style={{ marginTop: 18 }}><button className="secondary" disabled={busy} onClick={() => command({ action: 'skip', entryId: entry.id })}>Skip to end of queue</button><button className="text-button" disabled={busy} onClick={() => command({ action: 'unsold', entryId: entry.id })}>Mark permanently unsold</button></div>}
    </div></div>
  </section>;
}
