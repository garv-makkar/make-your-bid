'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/validation';

export type Bidder = { id: string; userId: string; name: string; status: string; budgetCents: number };
type BidderEvent = {
  mode: string; status: string; startingBudgetCents: number;
  participants: Bidder[];
  entries: { status: string; winnerId?: string | null; soldPriceCents: number | null; saleMode: string | null }[];
  bids: { bidderId: string; chargedCents: number }[];
};

export function bidderRemaining(event: BidderEvent, bidder: Bidder) {
  const normal = event.entries.filter(entry => entry.status === 'SOLD' && entry.saleMode !== 'REVERSE' && entry.winnerId === bidder.userId).reduce((sum, entry) => sum + (entry.soldPriceCents || 0), 0);
  const reverse = event.bids.filter(bid => bid.bidderId === bidder.userId).reduce((sum, bid) => sum + bid.chargedCents, 0);
  return bidder.budgetCents - normal - reverse;
}

function BidderRow({ person, event, editable, busy, command }: { person: Bidder; event: BidderEvent; editable: boolean; busy: boolean; command: (data: Record<string, unknown>) => Promise<boolean> }) {
  const [name, setName] = useState(person.name);
  const [budget, setBudget] = useState(String(person.budgetCents / 100));
  const [saved, setSaved] = useState(false);
  useEffect(() => { setName(person.name); setBudget(String(person.budgetCents / 100)); }, [person.name, person.budgetCents]);
  const remaining = bidderRemaining(event, person);
  const changed = (event.mode === 'LOCAL' && name.trim() !== person.name) || Number(budget) !== person.budgetCents / 100;
  return <form className="bidder-row" onSubmit={async e => { e.preventDefault(); if (changed && await command({ action: 'updateBidder', bidderId: person.id, name, amount: budget })) setSaved(true); }}>
    {event.mode === 'LOCAL' && editable ? <label>Name<input value={name} onChange={e => { setName(e.target.value); setSaved(false); }} maxLength={120} required /></label> : <div className="bidder-name"><strong>{person.name}</strong><small>{person.status}</small></div>}
    {editable ? <label>Total units<input type="number" min="0.01" max="10000000" step="0.01" value={budget} onChange={e => { setBudget(e.target.value); setSaved(false); }} required /></label> : <div><small>Total units</small><strong>{formatPrice(person.budgetCents)}</strong></div>}
    <div><small>Units left</small><strong>{formatPrice(remaining)}</strong></div>
    {editable && <button disabled={busy || !changed}>{changed ? 'Save changes' : saved ? 'Saved ✓' : 'No changes'}</button>}
    {event.mode === 'LOCAL' && editable && <button type="button" className="text-button danger" disabled={busy} onClick={() => { if (confirm(`Remove bidder ${person.name}?`)) command({ action: 'removeBidder', bidderId: person.id }); }}>Remove</button>}
  </form>;
}

export function BidderSetup({ event, busy, command }: { event: BidderEvent; busy: boolean; command: (data: Record<string, unknown>) => Promise<boolean> }) {
  const [defaultBudget, setDefaultBudget] = useState(String(event.startingBudgetCents / 100));
  const [names, setNames] = useState('');
  const editable = event.status === 'DRAFT' || event.status === 'PAUSED';
  const count = event.participants.length;

  return <section className="panel bidder-setup">
    <div className="section-title"><div><p className="eyebrow">AUCTION SETUP</p><h2>Bidders</h2></div><span>{count} {count === 1 ? 'bidder' : 'bidders'}</span></div>
    <p>{event.mode === 'LOCAL' ? event.status === 'DRAFT' ? 'Add the people bidding and set their units before you start.' : 'Review bidders and remaining units. Pause the auction to edit budgets.' : 'Share the online room link. People appear here after they request to join; approve them in the room.'}</p>
    {event.status === 'DRAFT' && <form className="bidder-default" onSubmit={e => { e.preventDefault(); if (Number(defaultBudget) !== event.startingBudgetCents / 100) void command({ action: 'startingBudget', amount: defaultBudget }); }}><label>Default units per bidder<input type="number" min="0.01" max="10000000" step="0.01" value={defaultBudget} onChange={e => setDefaultBudget(e.target.value)} required /></label><button className="secondary" disabled={busy || Number(defaultBudget) === event.startingBudgetCents / 100}>{Number(defaultBudget) === event.startingBudgetCents / 100 ? 'Default saved' : 'Save default'}</button><small>Saving this default also sets existing bidders to this amount. You can adjust each bidder below.</small></form>}
    {event.mode === 'LOCAL' && editable && <form className="bidder-add" onSubmit={async e => { e.preventDefault(); const list = names.split(/[\n,]+/).map(name => name.trim()).filter(Boolean); if (list.length && await command({ action: 'addBidders', names: list })) setNames(''); }}><label>Add bidder names<textarea value={names} onChange={e => setNames(e.target.value)} rows={3} placeholder={'Aarav\nPriya\nSameer'} /></label><button disabled={busy || !names.trim()}>Add bidders</button><small>Enter one name per line, or separate names with commas. New bidders receive the default units.</small></form>}
    {event.mode === 'ONLINE' && <button className="text-button" onClick={() => location.reload()}>Refresh bidder list</button>}
    {count > 0 ? <div className="bidder-list">{event.participants.map(person => <BidderRow key={person.id} person={person} event={event} editable={editable} busy={busy} command={command} />)}</div> : <div className="empty">No bidders added yet.</div>}
  </section>;
}
