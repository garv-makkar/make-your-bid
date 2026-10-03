import { formatPrice } from '@/lib/validation';
import { type SummaryEntry } from '@/lib/auction-summary';

export function AuctionSummary({ entries, collectedCents }: { entries: SummaryEntry[]; collectedCents: number }) {
  const sold = entries.filter(entry => entry.status === 'SOLD');
  const unsold = entries.filter(entry => entry.status === 'UNSOLD');

  return <section className="panel auction-summary" aria-labelledby="auction-summary-title">
    <p className="eyebrow">FINAL RESULTS</p>
    <h2 id="auction-summary-title">Auction summary</h2>
    <p className="summary-intro">All {entries.length} {entries.length === 1 ? 'entry has' : 'entries have'} been processed.</p>
    <div className="summary-totals">
      <div><small>SOLD</small><strong>{sold.length}</strong></div>
      <div><small>UNSOLD</small><strong>{unsold.length}</strong></div>
      <div><small>TOTAL COLLECTED</small><strong>{formatPrice(collectedCents)} <span>units</span></strong></div>
    </div>
    {sold.length > 0 && <div className="summary-group"><h3>Sold entries</h3><ul>{sold.map(entry => <li key={entry.id}><div><strong>{entry.name}</strong><span>Won by {entry.winner || 'Unknown bidder'}{entry.saleMode === 'REVERSE' ? ' · reverse round' : ''}</span></div><b>{formatPrice(entry.soldPriceCents ?? 0)} units</b></li>)}</ul></div>}
    {unsold.length > 0 && <div className="summary-group"><h3>Unsold entries</h3><ul>{unsold.map(entry => <li key={entry.id}><strong>{entry.name}</strong><span>Unsold</span></li>)}</ul></div>}
    {entries.some(entry => entry.saleMode === 'REVERSE' && entry.status === 'SOLD') && <p className="summary-note">In reverse rounds, every participating bidder paid their final bid. Total collected includes those payments; the listed sold price is the winning bid.</p>}
  </section>;
}
