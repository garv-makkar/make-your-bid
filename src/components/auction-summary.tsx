'use client';

import { formatPrice } from '@/lib/validation';
import { type SummaryEntry } from '@/lib/auction-summary';

export function AuctionSummary({ entries, collectedCents }: { entries: SummaryEntry[]; collectedCents: number }) {
  const sold = entries.filter(entry => entry.status === 'SOLD');
  const unsold = entries.filter(entry => entry.status === 'UNSOLD');
  const bidders = new Map<string, { name: string; entries: SummaryEntry[]; winningBidsCents: number }>();
  for (const entry of sold) {
    const name = entry.winner?.trim() || 'Unknown bidder';
    const key = entry.winnerId || `name:${name.toLocaleLowerCase()}`;
    const bidder = bidders.get(key) || { name, entries: [], winningBidsCents: 0 };
    bidder.entries.push(entry);
    bidder.winningBidsCents += entry.soldPriceCents ?? 0;
    bidders.set(key, bidder);
  }

  return <section className="panel auction-summary" aria-labelledby="auction-summary-title">
    <p className="eyebrow">FINAL RESULTS</p>
    <div className="summary-title-row"><h2 id="auction-summary-title">Auction results</h2><button type="button" className="secondary summary-print" onClick={() => window.print()}>Print results</button></div>
    <p className="summary-intro">All {entries.length} {entries.length === 1 ? 'entry has' : 'entries have'} been processed.</p>
    <div className="summary-totals">
      <div><small>SOLD</small><strong>{sold.length}</strong></div>
      <div><small>WINNERS</small><strong>{new Set(sold.map(entry => entry.winner || 'Unknown bidder')).size}</strong></div>
      <div><small>UNSOLD</small><strong>{unsold.length}</strong></div>
      <div><small>TOTAL COLLECTED</small><strong>{formatPrice(collectedCents)} <span>units</span></strong></div>
    </div>
    {sold.length > 0 && <div className="summary-group"><h3>Entries by bidder</h3>{[...bidders.entries()].map(([key, bidder]) => <div className="summary-bidder" key={key}><div className="summary-bidder-heading"><h4>{bidder.name}</h4><span>{bidder.entries.length} {bidder.entries.length === 1 ? 'entry' : 'entries'} · Winning bids: {formatPrice(bidder.winningBidsCents)} units</span></div><ul>{bidder.entries.map(entry => <li key={entry.id}><div><strong>{entry.name}</strong>{entry.saleMode === 'REVERSE' && <span>Reverse round</span>}</div><b>{formatPrice(entry.soldPriceCents ?? 0)} units</b></li>)}</ul></div>)}</div>}
    {unsold.length > 0 && <div className="summary-group"><h3>Unsold entries</h3><ul>{unsold.map(entry => <li key={entry.id}><strong>{entry.name}</strong><span>Unsold</span></li>)}</ul></div>}
    {entries.some(entry => entry.saleMode === 'REVERSE' && entry.status === 'SOLD') && <p className="summary-note">In reverse rounds, every participating bidder paid their final bid. Total collected includes those payments; the listed sold price is the winning bid.</p>}
  </section>;
}
