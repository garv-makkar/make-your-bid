'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPrice, parseCsv } from '@/lib/validation';
import { guestCommand } from '@/lib/local-events';
import { apiError, displayError } from '@/lib/client-errors';
import { BidderSetup, bidderRemaining, type Bidder } from './bidder-setup';
import { AuctionProgress } from './auction-progress';
import { AuctionSummary } from './auction-summary';
import { summarizeAuction } from '@/lib/auction-summary';
import { RoundModePicker } from './round-mode-picker';
import { LocalBidRound } from './local-bid-round';
import type { RoundMode } from '@/lib/round-modes';
import { ProfileMenu } from './profile-menu';

type Entry = { id: string; name: string; basePriceCents: number; imageUrl: string | null; position: number; status: string; soldPriceCents: number | null; winner: string | null; winnerId?: string | null; saleMode: string | null };
type Event = { id: string; name: string; category: string; mode: string; status: string; roundMode: string; roundDurationSeconds: number; timerEndsAt: string | null; orderMode: string; version: number; startingBudgetCents: number; participants: Bidder[]; entries: Entry[]; bids: { id: string; entryId: string; bidderId: string; bidderName: string; amountCents: number; chargedCents: number }[] };

export function EventWorkspace({ initial, local = false }: { initial: Event & { joinCode?: string | null }; local?: boolean }) {
  const [event, setEvent] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('1');
  const [imageUrl, setImageUrl] = useState('');
  const [winner, setWinner] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [reverseBidder, setReverseBidder] = useState('');
  const [reverseAmount, setReverseAmount] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'single' | 'bulk' | 'csv'>('single');
  const [batchText, setBatchText] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [staged, setStaged] = useState<{ name: string; basePriceCents: number; imageUrl: string; file?: File }[]>([]);
  const pending = event.entries.find(entry => entry.status === 'PENDING');
  const editable = event.status === 'DRAFT' || event.status === 'PAUSED';
  const entriesEditable = editable && !(event.mode === 'ONLINE' && event.participants.length > 0);
  const sold = event.entries.filter(entry => entry.status === 'SOLD');
  const total = sold.reduce((sum, entry) => sum + (entry.soldPriceCents || 0), 0);
  const currentBids = event.bids.filter(bid => bid.entryId === pending?.id).reduce((latest, bid) => ({ ...latest, [bid.bidderId]: bid }), {} as Record<string, Event['bids'][number]>);
  const modeLocked = !!pending && event.bids.some(bid => bid.entryId === pending.id);
  const onlineWaiting = event.mode === 'ONLINE' && !event.participants.some(person => person.status === 'APPROVED');

  async function command(data: Record<string, unknown>) {
    setBusy(true); setError('');
    try {
      if (local) {
        const result = guestCommand(event.id, data);
        if ('deleted' in result) { window.location.href = '/local'; return true; }
        setEvent({ ...result }); return true;
      }
      const response = await fetch(`/api/events/${event.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, version: event.version }) });
      if (!response.ok) throw await apiError(response, 'Could not update this event.');
      const result = await response.json();
      if (result.deleted) { window.location.href = '/'; return true; }
      setEvent(result); return true;
    } catch (caught) { setError(local && caught instanceof Error ? caught.message : displayError(caught, 'Could not update this event.')); return false; }
    finally { setBusy(false); }
  }
  async function saveEntry(e: React.FormEvent) {
    e.preventDefault();
    const ok = await command({ action: editing ? 'edit' : 'add', ...(editing ? { entryId: editing } : {}), entry: { name, basePrice: price, imageUrl } });
    if (ok) { setName(''); setPrice('1'); setImageUrl(''); setEditing(null); }
  }
  async function uploadImage(file: File): Promise<string> {
      if (local) {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        return canvas.toDataURL('image/webp', 0.7);
      }
      const response = await fetch('/api/uploads', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      if (!response.ok) throw await apiError(response, 'Could not upload the image.');
      const result = await response.json();
      return result.url;
  }
  async function upload(file: File) {
    setBusy(true); setError('');
    try {
      setImageUrl(await uploadImage(file));
    } catch (caught) { setError(local && caught instanceof Error ? caught.message : displayError(caught, 'Could not upload the image.')); }
    finally { setBusy(false); }
  }
  function editEntry(entry: Entry) { setEditorMode('single'); setEditing(entry.id); setName(entry.name); setPrice(String(entry.basePriceCents / 100)); setImageUrl(entry.imageUrl || ''); requestAnimationFrame(() => document.getElementById('entry-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
  function previewRows(text: string) {
    setError('');
    try {
      const rows = parseCsv(text);
      setStaged(rows.map(row => ({ name: row.name, basePriceCents: row.basePrice, imageUrl: row.imageUrl })));
    } catch (caught) { setStaged([]); setError((caught as Error).message); }
  }
  async function chooseCsv(file: File) {
    setError('');
    try {
      if (file.size > 1024 * 1024) throw new Error('CSV must be 1 MB or smaller.');
      const text = await file.text();
      setCsvFileName(file.name);
      previewRows(text);
    } catch (caught) { setStaged([]); setError((caught as Error).message); }
  }
  async function addStaged() {
    if (!staged.length) return;
    setBusy(true); setError('');
    try {
      const entries = [];
      for (const row of staged) entries.push({ name: row.name, basePrice: String(row.basePriceCents / 100), imageUrl: row.file ? await uploadImage(row.file) : row.imageUrl });
      if (await command({ action: 'addMany', entries })) { setStaged([]); setBatchText(''); setCsvFileName(''); }
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }
  async function sell(e: React.FormEvent) { e.preventDefault(); const person = event.participants.find(item => item.userId === winner); if (pending && await command({ action: 'sell', entryId: pending.id, winner: person?.name || winner, winnerId: person?.userId, price: soldPrice })) { setWinner(''); setSoldPrice(''); } }
  async function recordReverseBid(e: React.FormEvent) { e.preventDefault(); const person = event.participants.find(item => item.userId === reverseBidder); if (pending && await command({ action: 'reverseBid', entryId: pending.id, bidder: person?.name || reverseBidder, bidderId: person?.userId, amount: reverseAmount })) { setReverseBidder(''); setReverseAmount(''); } }

  return <main className="shell">
    <header className="topbar"><Link href={local ? '/local' : '/dashboard'} className="brand">make your bid<span>.</span></Link><nav className="button-row">{local ? <a href="/local" className="text-button">← All events</a> : <Link href="/dashboard/events" className="text-button">← All events</Link>}{local ? <a href="/signin" className="button-link">Sign in</a> : <ProfileMenu />}</nav></header>
    <div className="workspace-header"><div><p className="eyebrow">{event.category.toUpperCase()} AUCTION</p><h1>{event.name}</h1><span className="status">{event.status}</span></div><div className="header-actions">{event.mode === 'LOCAL' && event.status === 'DRAFT' && <><button disabled={busy || !event.entries.length || onlineWaiting} onClick={() => command({ action: 'start', order: 'ordered' })}>Start auction</button><button className="secondary" disabled={busy || !event.entries.length || onlineWaiting} onClick={() => command({ action: 'start', order: 'shuffle' })}>Shuffle & start</button><button className="secondary" disabled={busy || !event.entries.length || onlineWaiting} onClick={() => command({ action: 'start', order: 'hidden' })}>Start hidden</button></>}{event.mode === 'LOCAL' && event.status === 'LIVE' && <button className="secondary" disabled={busy} onClick={() => command({ action: 'pause' })}>Pause</button>}{event.mode === 'LOCAL' && event.status === 'PAUSED' && <button disabled={busy || !pending} onClick={() => command({ action: 'resume' })}>Resume</button>}{event.status === 'COMPLETED' && <button className="secondary" disabled={busy} onClick={() => { if (confirm('Reset all results and return to draft?')) command({ action: 'reset' }); }}>Reset event</button>}</div></div>
    {error && <div role="alert" className="error-message workspace-error"><span>{error}</span><div className="button-row">{error.includes('session has expired') && <Link href="/signin" className="text-button">Sign in</Link>}{error.includes('another tab') && <button type="button" className="text-button" onClick={() => location.reload()}>Reload event</button>}<button type="button" className="text-button" onClick={() => setError('')}>Dismiss</button></div></div>}
    <div className="stats"><div><small>ENTRIES</small><strong>{event.entries.length}</strong></div><div><small>SOLD</small><strong>{sold.length}</strong></div><div><small>TOTAL SOLD</small><strong>{formatPrice(total)}</strong></div></div>
    <nav className="workspace-jumps" aria-label="Jump to event section">{event.mode === 'ONLINE' && <Link href={`/events/${event.id}/room`}>Bidding room ↗</Link>}{pending && event.status !== 'COMPLETED' && <a href="#round-mode">Round mode</a>}{event.status === 'COMPLETED' && <a href="#auction-summary-title">Results</a>}<a href="#bidder-setup">Bidders</a>{entriesEditable && <a href="#entry-editor">Entries</a>}</nav>
    {event.mode === 'ONLINE' && event.status === 'DRAFT' && <section className="panel setup-checklist" aria-label="Event setup checklist"><div className="setup-checklist-heading"><div><p className="eyebrow">BEFORE YOU START</p><h2>Get your auction ready</h2></div><strong>{[event.entries.length > 0, !!event.roundMode, event.participants.length > 0, event.participants.some(person => person.status === 'APPROVED')].filter(Boolean).length} of 4 ready</strong></div><ol><li className={event.entries.length ? 'is-done' : ''}><span className="setup-step-mark">{event.entries.length ? '✓' : '1'}</span><div><strong>Add entries</strong><small>{event.entries.length ? `${event.entries.length} added` : 'Add the items bidders will compete for.'}</small></div>{entriesEditable ? <a href="#entry-editor">{event.entries.length ? 'Manage' : 'Add entries'}</a> : <span>Entries locked</span>}</li><li className={event.roundMode ? 'is-done' : ''}><span className="setup-step-mark">✓</span><div><strong>Choose a round mode</strong><small>{event.roundMode.toLowerCase()} bidding selected</small></div><a href="#round-mode">Change</a></li><li className={event.participants.length ? 'is-done' : ''}><span className="setup-step-mark">{event.participants.length ? '✓' : '3'}</span><div><strong>Share the room</strong><small>{event.participants.length ? 'A bidder has requested access.' : 'Open the room to copy its link or code.'}</small></div><Link href={`/events/${event.id}/room`}>Open room</Link></li><li className={event.participants.some(person => person.status === 'APPROVED') ? 'is-done' : ''}><span className="setup-step-mark">{event.participants.some(person => person.status === 'APPROVED') ? '✓' : '4'}</span><div><strong>Approve a bidder</strong><small>{event.participants.filter(person => person.status === 'APPROVED').length} approved</small></div><Link href={`/events/${event.id}/room`}>Review requests</Link></li></ol></section>}
    {event.mode === 'LOCAL' && event.status === 'DRAFT' && <div className="workspace-guide"><span className="guide-mark">✦</span><div><strong>Set the stage for your first round</strong><p>Add entries and bidders, choose a round mode, then start the auction when you are ready.</p></div></div>}
    {event.mode === 'ONLINE' && event.status === 'DRAFT' && <div className="workspace-guide online-workspace-guide"><span className="guide-mark">↗</span><div><strong>{!event.joinCode ? 'Step 1 · Add entries before inviting bidders' : onlineWaiting ? 'Step 2 · Invite and approve bidders' : 'Step 3 · Ready to start'}</strong><p>{!event.joinCode ? 'Finish your entry list and base prices, then open the room for bidders.' : <>Share room code <b>{event.joinCode.slice(0, 6)}-{event.joinCode.slice(6)}</b>, approve bidders, then start the auction. <Link href={`/events/${event.id}/room`}>Open the bidding room →</Link></>}</p></div></div>}
    {event.status === 'PAUSED' && <div className="workspace-guide"><span className="guide-mark">Ⅱ</span><div><strong>Auction paused</strong><p>You can manage entries and bidders now. Resume when the next round is ready.</p></div></div>}
    <div className="workspace-body"><div className="workspace-main">
    {['DRAFT', 'LIVE', 'PAUSED'].includes(event.status) && pending && <div id="round-mode"><RoundModePicker title={event.status === 'DRAFT' ? 'Choose the first round' : 'Choose this round’s mode'} mode={event.roundMode} duration={event.roundDurationSeconds ?? 30} disabled={busy || modeLocked} onChange={(mode: RoundMode) => { void command({ action: 'roundMode', mode }); }} onDurationChange={seconds => { void command({ action: 'roundDuration', seconds }); }} /></div>}
    {event.status === 'COMPLETED' && <AuctionSummary entries={event.entries} collectedCents={summarizeAuction(event.entries, event.bids).collectedCents} />}
    {event.mode === 'ONLINE' && event.status === 'DRAFT' && !event.joinCode && <section className="panel room-promo"><div><p className="eyebrow">STEP 1 · PREPARE YOUR AUCTION</p><h2>Add entries, then open the room</h2><p>Set every entry and base price first. Bidders cannot join until you open the room.</p></div><button disabled={busy || !event.entries.length} onClick={() => command({ action: 'openRoom' })}>{event.entries.length ? 'Open room for bidders →' : 'Add an entry first'}</button></section>}
    {event.mode === 'ONLINE' && event.joinCode && <section className="panel room-promo"><div><p className="eyebrow">ONLINE ROOM</p><h2>Invite bidders to join</h2><p>Share the room code, approve requests, and start when ready.</p></div><Link className="button-link" href={`/events/${event.id}/room`}>Open bidding room →</Link></section>}
    {event.mode === 'LOCAL' && event.status === 'LIVE' && pending && (event.roundMode === 'SEALED' || event.roundMode === 'TIMED') && <LocalBidRound entry={pending} mode={event.roundMode} bidders={event.participants} bids={event.bids} timerEndsAt={event.timerEndsAt} busy={busy} command={command} />}
    {event.mode === 'LOCAL' && event.status === 'LIVE' && pending && (event.roundMode === 'NORMAL' || event.roundMode === 'REVERSE') && <section className="panel current"><p className="eyebrow">ON THE BLOCK · {event.roundMode}</p><div className="current-grid">{pending.imageUrl && <img src={pending.imageUrl} alt="" />}<div><h2>{pending.name}</h2><p>Base price: {formatPrice(pending.basePriceCents)}</p>{event.roundMode === 'NORMAL' ? <form className="bid-form" onSubmit={sell}><label>Winner{event.participants.length ? <select value={winner} onChange={e => setWinner(e.target.value)} required><option value="">Choose bidder</option>{event.participants.map(person => <option key={person.id} value={person.userId}>{person.name} - {formatPrice(bidderRemaining(event, person))} units left</option>)}</select> : <input value={winner} onChange={e => setWinner(e.target.value)} maxLength={120} required />}</label><label>Winning bid<input type="number" min={pending.basePriceCents / 100} step="0.01" value={soldPrice} onChange={e => setSoldPrice(e.target.value)} placeholder={String(pending.basePriceCents / 100)} required /></label><button disabled={busy}>Mark sold</button></form> : <><p>Lowest bidder receives this entry. Every bidder pays their own final bid.</p><form className="bid-form" onSubmit={recordReverseBid}><label>Bidder{event.participants.length ? <select value={reverseBidder} onChange={e => setReverseBidder(e.target.value)} required><option value="">Choose bidder</option>{event.participants.map(person => <option key={person.id} value={person.userId}>{person.name} - {formatPrice(bidderRemaining(event, person))} units left</option>)}</select> : <input value={reverseBidder} onChange={e => setReverseBidder(e.target.value)} maxLength={120} required />}</label><label>Bid<input type="number" min={pending.basePriceCents / 100} step="0.01" value={reverseAmount} onChange={e => setReverseAmount(e.target.value)} required /></label><button disabled={busy}>Record bid</button></form><div className="reverse-bids">{Object.values(currentBids).sort((a, b) => a.amountCents - b.amountCents).map(bid => <div key={bid.bidderId}>{bid.bidderName}: {formatPrice(bid.amountCents)}</div>)}</div><button disabled={busy || !Object.keys(currentBids).length} onClick={() => command({ action: 'reverseAward', entryId: pending.id })}>Award to lowest and charge all</button></>}<div className="button-row" style={{ marginTop: 18 }}><button className="secondary" disabled={busy} onClick={() => command({ action: 'skip', entryId: pending.id })}>Skip to end of queue</button><button className="text-button" disabled={busy} onClick={() => command({ action: 'unsold', entryId: pending.id })}>Mark permanently unsold</button></div></div></div></section>}
    <details id="bidder-setup" className="workspace-disclosure" open={event.mode === 'LOCAL' && event.participants.length === 0}><summary><strong>Bidders</strong><span>{event.participants.length} on roster</span></summary><BidderSetup event={event} busy={busy} command={command} /></details>
    {event.mode === 'ONLINE' && event.participants.length > 0 && editable && <div className="workspace-guide"><span className="guide-mark">✓</span><div><strong>Entries are locked</strong><p>Bidders have joined this room. The entry list and base prices stay fixed for this auction.</p></div></div>}
    {entriesEditable && <details id="entry-editor" className="workspace-disclosure entry-editor-disclosure" open={!event.entries.length || !!editing}><summary><strong>{editing ? 'Edit entry' : 'Add entries'}</strong><span>{event.entries.length} in auction</span></summary><section className="panel entry-editor">
      <div className="entry-mode-tabs" role="tablist" aria-label="Ways to add entries">
        <button type="button" role="tab" aria-selected={editorMode === 'single'} className={editorMode === 'single' ? '' : 'secondary'} onClick={() => setEditorMode('single')}>One at a time</button>
        <button type="button" role="tab" aria-selected={editorMode === 'bulk'} className={editorMode === 'bulk' ? '' : 'secondary'} onClick={() => { setEditorMode('bulk'); setStaged([]); }}>Paste many</button>
        <button type="button" role="tab" aria-selected={editorMode === 'csv'} className={editorMode === 'csv' ? '' : 'secondary'} onClick={() => { setEditorMode('csv'); setStaged([]); }}>Import CSV file</button>
      </div>
      {editorMode === 'single' && <form className="stack entry-single-form" onSubmit={saveEntry}>
        <label>Name<input value={name} onChange={e => setName(e.target.value)} maxLength={120} required /></label>
        <label>Base price<input type="number" min="0.01" max="10000000" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required /></label>
        <label>Image link (optional)<input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" /></label>
        <label className="file-label">Or upload an image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) upload(file); }} /></label>
        <div className="button-row"><button disabled={busy}>{editing ? 'Save entry' : 'Add entry'}</button>{editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setName(''); setPrice('1'); setImageUrl(''); }}>Cancel</button>}</div>
      </form>}
      {editorMode === 'bulk' && <div className="entry-bulk-form">
        <p>One entry per line: <code>name, base price, image URL</code>. Price and image are optional. Use quotes if a name contains a comma.</p>
        <textarea value={batchText} onChange={e => { setBatchText(e.target.value); setStaged([]); }} rows={9} placeholder={'Aarav,100,https://example.com/aarav.jpg\nPriya,75\nSameer'} />
        <button type="button" className="secondary" disabled={busy || !batchText.trim()} onClick={() => previewRows(batchText)}>Preview entries</button>
      </div>}
      {editorMode === 'csv' && <div className="entry-bulk-form">
        <p>Choose a .csv file with columns <code>name, base price, image URL</code>. A header row is optional. Blank prices become 1 unit.</p>
        <label className="csv-picker">Choose CSV file<input type="file" accept=".csv,text/csv" onChange={e => { const file = e.target.files?.[0]; if (file) chooseCsv(file); }} /></label>
        {csvFileName && <p>Selected: {csvFileName}</p>}
      </div>}
      {editorMode !== 'single' && staged.length > 0 && <div className="entry-preview">
        <h3>Ready to add {staged.length} {staged.length === 1 ? 'entry' : 'entries'}</h3>
        <p>Review the rows below. You can add an image link or upload an image for each entry.</p>
        <div className="entry-preview-list">{staged.map((row, index) => <div className="entry-preview-row" key={index}>
          <div><strong>{index + 1}. {row.name}</strong><small>Base {formatPrice(row.basePriceCents)} units</small></div>
          <label>Image link<input value={row.imageUrl} onChange={e => setStaged(current => current.map((item, i) => i === index ? { ...item, imageUrl: e.target.value } : item))} placeholder="https://..." /></label>
          <label>Or upload<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; setStaged(current => current.map((item, i) => i === index ? { ...item, file } : item)); }} /></label>
        </div>)}</div>
        <button type="button" disabled={busy} onClick={addStaged}>{busy ? 'Adding entries...' : `Add all ${staged.length} entries`}</button>
      </div>}
    </section></details>}
    </div><aside className="workspace-aside">
      <AuctionProgress entries={event.entries.map(entry => ({ id: entry.id, name: entry.name, status: entry.status, winner: entry.winner, soldPriceCents: entry.soldPriceCents, saleMode: entry.saleMode }))} currentId={event.status === 'LIVE' || event.status === 'PAUSED' ? pending?.id : undefined} hidden={event.orderMode === 'HIDDEN' && event.status !== 'DRAFT' && event.status !== 'COMPLETED'} />
      {event.entries.length > 0 && <details className="entry-manage"><summary>{entriesEditable ? 'Manage entry order and details' : 'Entries and base prices'}</summary><div className="entry-list">{event.entries.map((entry, index) => <div className="entry-row" key={entry.id}><span className="entry-number">{String(index + 1).padStart(2, '0')}</span><div className="entry-details"><strong>{event.orderMode === 'HIDDEN' && event.status === 'PAUSED' && entry.id !== pending?.id ? 'Hidden entry' : entry.name}</strong><span>Base {formatPrice(entry.basePriceCents)} · {entry.status}</span></div>{entriesEditable && entry.status === 'PENDING' && <div className="entry-actions"><button className="text-button" aria-label={`Move entry ${index + 1} up`} disabled={busy || index === 0} onClick={() => { const ids = event.entries.map(e => e.id); [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; command({ action: 'reorder', ids }); }}>↑</button><button className="text-button" aria-label={`Move entry ${index + 1} down`} disabled={busy || index === event.entries.length - 1} onClick={() => { const ids = event.entries.map(e => e.id); [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]]; command({ action: 'reorder', ids }); }}>↓</button><button className="text-button" disabled={busy} onClick={() => editEntry(entry)}>Edit</button><button className="text-button danger" disabled={busy} onClick={() => { if (confirm(`Remove ${entry.name}?`)) command({ action: 'remove', entryId: entry.id }); }}>Remove</button></div>}</div>)}</div></details>}
    </aside></div>
    <footer className="workspace-footer"><button className="text-button danger" disabled={busy} onClick={() => { if (confirm(`Permanently delete ${event.name} and all entries?`)) command({ action: 'delete' }); }}>Delete event</button></footer>
  </main>;
}
