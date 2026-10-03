import { formatPrice } from '@/lib/validation';

type Action = 'award' | 'skip' | 'unsold';
type Preview = { bidderName: string; amountCents: number; chargedCents: number; bidderCount: number } | null;

export function CloseRoundPreview({ action, entryName, mode, preview, busy, onCancel, onConfirm }: {
  action: Action;
  entryName: string;
  mode: string;
  preview: Preview;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const award = action === 'award';
  const title = award ? 'Award this entry?' : action === 'skip' ? 'Move this entry to the end?' : 'Mark this entry unsold?';
  return <div className="round-preview-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <section className="round-preview" role="alertdialog" aria-modal="true" aria-labelledby="round-preview-title" aria-describedby="round-preview-description" onKeyDown={event => { if (event.key === 'Escape' && !busy) onCancel(); }}>
      <p className="eyebrow">REVIEW ROUND RESULT</p>
      <h2 id="round-preview-title">{title}</h2>
      <p className="round-preview-entry">{entryName}</p>
      <div id="round-preview-description" className="round-preview-result">
        {award && preview ? <><span>{mode === 'REVERSE' ? 'Lowest bidder' : 'Highest bidder'}</span><strong>{preview.bidderName}</strong><span>Winning bid: {formatPrice(preview.amountCents)} units</span>{mode === 'REVERSE' && <span>All {preview.bidderCount} final bidders pay their own bid · {formatPrice(preview.chargedCents)} units total</span>}</> : action === 'skip' ? <p>The entry returns at the end of the pending queue. Bids on it will be cleared.</p> : <p>The entry closes without a winner. It will appear in the final results as unsold.</p>}
      </div>
      <div className="button-row"><button type="button" disabled={busy} onClick={onConfirm}>{busy ? 'Closing round…' : award ? 'Confirm award' : action === 'skip' ? 'Move to end' : 'Mark unsold'}</button><button type="button" className="secondary" autoFocus disabled={busy} onClick={onCancel}>Keep bidding</button></div>
    </section>
  </div>;
}
