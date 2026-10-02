import { formatPrice } from '@/lib/validation';

export type ProgressEntry = {
  id: string;
  name: string | null;
  status: string;
  winner: string | null;
  soldPriceCents: number | null;
  saleMode: string | null;
};

export function AuctionProgress({ entries, currentId, hidden }: { entries: ProgressEntry[]; currentId?: string; hidden: boolean }) {
  const finished = entries.filter(entry => entry.status !== 'PENDING').length;
  return <section className="progress-panel" aria-label="Auction entries">
    <div className="progress-heading"><div><p className="eyebrow">AUCTION PROGRESS</p><h2>All entries</h2></div><span>{finished} / {entries.length} finished</span></div>
    {hidden && <p className="progress-help">Upcoming entries are revealed when their round begins.</p>}
    {entries.length ? <ol className="progress-list">{entries.map((entry, index) => {
      const concealed = hidden && entry.status === 'PENDING' && entry.id !== currentId;
      const current = entry.id === currentId;
      return <li key={entry.id} className={`progress-item${current ? ' is-current' : ''}`}>
        <span className="progress-index">{String(index + 1).padStart(2, '0')}</span>
        <div className="progress-copy"><strong>{concealed ? 'Hidden entry' : entry.name}</strong>
          <span>{entry.status === 'SOLD' ? `Sold to ${entry.winner || 'Unknown bidder'} · ${formatPrice(entry.soldPriceCents ?? 0)} units${entry.saleMode === 'REVERSE' ? ' · reverse round' : ''}` : entry.status === 'UNSOLD' ? 'Unsold' : current ? 'On the block now' : hidden ? 'Reveals when on the block' : 'Upcoming'}</span>
        </div><span className={`progress-state state-${entry.status.toLowerCase()}`}>{current ? 'NOW' : entry.status === 'SOLD' ? 'SOLD' : entry.status === 'UNSOLD' ? 'UNSOLD' : 'NEXT'}</span>
      </li>;
    })}</ol> : <div className="empty">No entries added yet.</div>}
  </section>;
}
