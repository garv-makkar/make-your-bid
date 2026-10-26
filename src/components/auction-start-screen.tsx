'use client';

import { useState } from 'react';

export type StartOrder = 'ordered' | 'shuffle' | 'hidden';

const choices: { value: StartOrder; title: string; description: string; note: string }[] = [
  { value: 'ordered', title: 'In order', description: 'Auction entries in the order you arranged them.', note: 'Best when everyone knows the lineup.' },
  { value: 'shuffle', title: 'Shuffle', description: 'Mix the entries once, then show the new order.', note: 'Best for a surprise running order.' },
  { value: 'hidden', title: 'Keep the order hidden', description: 'Mix the entries and reveal each one only when its round begins.', note: 'Best for a full mystery auction.' },
];

export function AuctionStartScreen({ eventName, entryCount, bidderCount, busy, error, onBack, onStart }: {
  eventName: string;
  entryCount: number;
  bidderCount: number;
  busy: boolean;
  error?: string;
  onBack: () => void;
  onStart: (order: StartOrder) => void;
}) {
  const [selected, setSelected] = useState<StartOrder>('ordered');
  return <section className="start-screen" aria-labelledby="start-screen-title">
    <div className="start-screen-heading"><div><p className="eyebrow">READY TO BEGIN</p><h1 id="start-screen-title">How should the auction start?</h1><p>{eventName} · {entryCount} {entryCount === 1 ? 'entry' : 'entries'} · {bidderCount} {bidderCount === 1 ? 'bidder' : 'bidders'}</p></div><button type="button" className="secondary" onClick={onBack}>← Back to setup</button></div>
    <div className="start-screen-options" role="radiogroup" aria-label="Entry order">
      {choices.map(choice => <button type="button" role="radio" aria-checked={selected === choice.value} key={choice.value} className={selected === choice.value ? 'start-option selected' : 'start-option'} onClick={() => setSelected(choice.value)}><span className="start-option-mark" aria-hidden="true">{selected === choice.value ? '✓' : ''}</span><strong>{choice.title}</strong><span>{choice.description}</span><small>{choice.note}</small></button>)}
    </div>
    {error && <p role="alert" className="error-message start-screen-error">{error}</p>}
    <div className="start-screen-actions"><p>You can edit a saved result from the entry list during the auction.</p><button type="button" disabled={busy} onClick={() => onStart(selected)}>{busy ? 'Starting…' : 'Start auction →'}</button></div>
  </section>;
}
