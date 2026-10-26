'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/validation';
import { StyledSelect } from './styled-select';

export function ResultEditor({ entry, bidders, busy, onClose, onSave, error }: {
  entry: { id: string; name: string | null; basePriceCents: number; soldPriceCents: number | null; winnerId?: string | null; winner: string | null; saleMode: string | null };
  bidders: { userId: string; name: string }[];
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSave: (winnerId: string, price: string) => Promise<boolean>;
}) {
  const [winnerId, setWinnerId] = useState(entry.winnerId || bidders.find(person => person.name === entry.winner)?.userId || '');
  const [price, setPrice] = useState(String((entry.soldPriceCents || entry.basePriceCents) / 100));
  const [validationError, setValidationError] = useState('');
  return <section className="result-editor" aria-label={`Edit result for ${entry.name}`}>
    <div className="result-editor-heading"><div><span className="eyebrow">EDIT RESULT</span><h3>{entry.name}</h3></div><button type="button" className="text-button" onClick={onClose} aria-label="Close result editor">✕</button></div>
    <p>Current: {entry.winner} · {formatPrice(entry.soldPriceCents || 0)} units</p>
    <form onSubmit={async e => { e.preventDefault(); if (!winnerId) { setValidationError('Choose a bidder.'); return; } setValidationError(''); await onSave(winnerId, price); }}>
      <StyledSelect label="Winning bidder" value={winnerId} onChange={value => { setWinnerId(value); setValidationError(''); }} options={[{ value: '', label: 'Choose bidder' }, ...bidders.map(person => ({ value: person.userId, label: person.name }))]} />
      <label>Sold price (units)<input type="number" min={entry.basePriceCents / 100} step="0.01" value={price} onChange={e => setPrice(e.target.value)} required /></label>
      {(validationError || error) && <p role="alert" className="bid-inline-error">{validationError || error}</p>}
      <div className="button-row"><button disabled={busy}>Save result</button><button type="button" className="secondary" onClick={onClose}>Cancel</button></div>
    </form>
  </section>;
}
