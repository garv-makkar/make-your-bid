'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice, isSportsCategory, parseCsv } from '@/lib/validation';
import { guestCommand } from '@/lib/local-events';
import { apiError, displayError } from '@/lib/client-errors';
import { BidderSetup, bidderRemaining, type Bidder } from './bidder-setup';
import { AuctionProgress } from './auction-progress';
import { AuctionSummary } from './auction-summary';
import { summarizeAuction } from '@/lib/auction-summary';
import { RoundModePicker } from './round-mode-picker';
import { LocalBidRound } from './local-bid-round';
import type { RoundMode } from '@/lib/round-modes';
import { SiteNavbar } from './site-navbar';
import { StyledSelect } from './styled-select';
import { EntryFacts } from './entry-facts';
import { AuctionStartScreen, type StartOrder } from './auction-start-screen';
import { ResultEditor } from './result-editor';

type Entry = { id: string; name: string; basePriceCents: number; imageUrl: string | null; description?: string | null; role?: string | null; specialty?: string | null; position: number; status: string; soldPriceCents: number | null; winner: string | null; winnerId?: string | null; saleMode: string | null };
type Event = { id: string; ownerId?: string; name: string; category: string; mode: string; status: string; roundMode: string; roundDurationSeconds: number; timerEndsAt: string | null; orderMode: string; version: number; startingBudgetCents: number; participants: Bidder[]; entries: Entry[]; bids: { id: string; entryId: string; bidderId: string; bidderName: string; amountCents: number; chargedCents: number }[] };

export function EventWorkspace({ initial, local = false }: { initial: Event & { joinCode?: string | null }; local?: boolean }) {
  const [event, setEvent] = useState(initial);
  const [error, setError] = useState('');
  const [bidError, setBidError] = useState('');
  const [resultError, setResultError] = useState('');
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [showStartScreen, setShowStartScreen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('1');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [winner, setWinner] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [reverseBidder, setReverseBidder] = useState('');
  const [reverseAmount, setReverseAmount] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'single' | 'bulk' | 'csv'>('single');
  const [batchText, setBatchText] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [staged, setStaged] = useState<{ name: string; basePriceCents: number; imageUrl: string; description: string; role: string; specialty: string; file?: File }[]>([]);
  const [setupStep, setSetupStep] = useState<'entries' | 'bidders' | 'review'>('entries');
  useEffect(() => { const step = new URLSearchParams(location.search).get('step'); if (step === 'entries' || step === 'bidders' || step === 'review') setSetupStep(step); }, []);
  const pending = event.entries.find(entry => entry.status === 'PENDING');
  const draft = event.status === 'DRAFT';
  const approvedBidders = event.participants.filter(person => person.status === 'APPROVED' && person.userId !== event.ownerId);
  const readyToStart = event.entries.length > 0 && (event.mode === 'LOCAL' ? event.participants.length > 0 : !!event.joinCode && approvedBidders.length > 0);
  const showEntries = !draft || setupStep === 'entries';
  const showBidders = !draft || setupStep === 'bidders';
  const showReview = !draft || setupStep === 'review';
  const editable = event.status === 'DRAFT' || event.status === 'PAUSED';
  const entriesEditable = editable && !(event.mode === 'ONLINE' && event.participants.length > 0);
  const sold = event.entries.filter(entry => entry.status === 'SOLD');
  const total = sold.reduce((sum, entry) => sum + (entry.soldPriceCents || 0), 0);
  const currentBids = event.bids.filter(bid => bid.entryId === pending?.id).reduce((latest, bid) => ({ ...latest, [bid.bidderId]: bid }), {} as Record<string, Event['bids'][number]>);
  const modeLocked = !!pending && event.bids.some(bid => bid.entryId === pending.id);
  const sports = isSportsCategory(event.category);
  const primaryLabel = event.category === 'Football' ? 'Position' : event.category === 'Cricket' ? 'Role' : 'Role / position';
  const advancedLabel = event.category === 'Football' ? 'Advanced position' : 'Advanced role';

  async function command(data: Record<string, unknown>) {
    const bidAction = ['sell', 'reverseBid', 'recordBid', 'awardBids', 'reverseAward', 'settleTimed'].includes(String(data.action));
    setBusy(true); setError(''); if (bidAction) setBidError(''); if (data.action === 'correctResult') setResultError('');
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
    } catch (caught) { const message = local && caught instanceof Error ? caught.message : displayError(caught, 'Could not update this event.'); if (bidAction) setBidError(message); else if (data.action === 'correctResult') setResultError(message); else setError(message); return false; }
    finally { setBusy(false); }
  }
  async function saveEntry(e: React.FormEvent) {
    e.preventDefault();
    const ok = await command({ action: editing ? 'edit' : 'add', ...(editing ? { entryId: editing } : {}), entry: { name, basePrice: price, imageUrl, description, role: sports ? role : '', specialty: sports ? specialty : '' } });
    if (ok) { setName(''); setPrice('1'); setImageUrl(''); setDescription(''); setRole(''); setSpecialty(''); setEditing(null); }
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
  function editEntry(entry: Entry) { setSetupStep('entries'); setEditorMode('single'); setEditing(entry.id); setName(entry.name); setPrice(String(entry.basePriceCents / 100)); setImageUrl(entry.imageUrl || ''); setDescription(entry.description || ''); setRole(entry.role || ''); setSpecialty(entry.specialty || ''); requestAnimationFrame(() => { const details = document.getElementById('entry-editor') as HTMLDetailsElement | null; if (details) { details.open = true; details.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }); }
  function showSection(id: string) { const section = document.getElementById(id) as HTMLDetailsElement | null; if (section) { section.open = true; section.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
  function goToStep(step: 'entries' | 'bidders' | 'review') { setSetupStep(step); const url = new URL(location.href); url.searchParams.set('step', step); history.replaceState(history.state, '', url);  }
  function previewRows(text: string) {
    setError('');
    try {
      const rows = parseCsv(text);
      setStaged(rows.map(row => ({ name: row.name, basePriceCents: row.basePrice, imageUrl: row.imageUrl, description: row.description, role: row.role, specialty: row.specialty })));
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
      for (const row of staged) entries.push({ name: row.name, basePrice: String(row.basePriceCents / 100), imageUrl: row.file ? await uploadImage(row.file) : row.imageUrl, description: row.description, role: sports ? row.role : '', specialty: sports ? row.specialty : '' });
      if (await command({ action: 'addMany', entries })) { setStaged([]); setBatchText(''); setCsvFileName(''); }
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }
  async function sell(e: React.FormEvent) { e.preventDefault(); if (event.participants.length && !winner) { setBidError('Choose a bidder first.'); return; } const person = event.participants.find(item => item.userId === winner); if (pending && await command({ action: 'sell', entryId: pending.id, winner: person?.name || winner, winnerId: person?.userId, price: soldPrice })) { setWinner(''); setSoldPrice(''); } }
  async function recordReverseBid(e: React.FormEvent) { e.preventDefault(); if (event.participants.length && !reverseBidder) { setBidError('Choose a bidder first.'); return; } const person = event.participants.find(item => item.userId === reverseBidder); if (pending && await command({ action: 'reverseBid', entryId: pending.id, bidder: person?.name || reverseBidder, bidderId: person?.userId, amount: reverseAmount })) { setReverseBidder(''); setReverseAmount(''); } }

  if (showStartScreen && draft && event.mode === 'LOCAL') return <main className="shell start-auction-shell"><SiteNavbar mode={local ? 'local' : 'account'} backHref={local ? '/local' : '/dashboard/events'} backLabel="All events" /><AuctionStartScreen eventName={event.name} entryCount={event.entries.length} bidderCount={event.participants.length} busy={busy} error={error} onBack={() => { setShowStartScreen(false); setError(''); }} onStart={async (order: StartOrder) => { if (await command({ action: 'start', order })) setShowStartScreen(false); }} /></main>;

  return <main className={'shell auction-workspace workspace-step-' + setupStep}>
    <SiteNavbar mode={local ? 'local' : 'account'} backHref={local ? '/local' : '/dashboard/events'} backLabel="All events" contextHref={!local && event.mode === 'ONLINE' ? `/events/${event.id}/room` : undefined} contextLabel={!local && event.mode === 'ONLINE' ? 'Bidding room' : undefined} />
    <div className="workspace-header"><div><p className="eyebrow">{event.category.toUpperCase()} AUCTION</p><h1>{event.name}</h1><span className="status">{event.status}</span></div><div className="header-actions">{event.mode === 'LOCAL' && draft && setupStep === 'review' && <button disabled={busy || !readyToStart} onClick={() => setShowStartScreen(true)}>Start auction →</button>}{event.mode === 'LOCAL' && event.status === 'LIVE' && <button className="secondary" disabled={busy} onClick={() => command({ action: 'pause' })}>Pause</button>}{event.mode === 'LOCAL' && event.status === 'PAUSED' && <button disabled={busy || !pending} onClick={() => command({ action: 'resume' })}>Resume</button>}{event.status === 'COMPLETED' && <button className="secondary" disabled={busy} onClick={() => { if (confirm('Reset all results and return to draft?')) command({ action: 'reset' }); }}>Reset event</button>}</div></div>
    {error && <div role="alert" className="error-message workspace-error"><span>{error}</span><div className="button-row">{error.includes('session has expired') && <Link href="/signin" className="text-button">Sign in</Link>}{error.includes('another tab') && <button type="button" className="text-button" onClick={() => location.reload()}>Reload event</button>}<button type="button" className="text-button" onClick={() => setError('')}>Dismiss</button></div></div>}
    <div className="stats"><div><small>ENTRIES</small><strong>{event.entries.length}</strong></div><div><small>SOLD</small><strong>{sold.length}</strong></div><div><small>TOTAL SOLD</small><strong>{formatPrice(total)}</strong></div></div>
    {draft ? <section className="setup-steps" aria-label="Auction setup steps"><p className="eyebrow">SET UP YOUR AUCTION</p><div className="setup-step-tabs">{(['entries', 'bidders', 'review'] as const).map((step, index) => <button key={step} type="button" className={setupStep === step ? 'active' : ''} aria-current={setupStep === step ? 'step' : undefined} onClick={() => goToStep(step)}><span>{index + 1}</span><strong>{step === 'review' ? 'Review & start' : step === 'entries' ? 'Entries' : 'Bidders'}</strong><small>{step === 'entries' ? `${event.entries.length} added` : step === 'bidders' ? `${event.participants.filter(person => person.status === 'APPROVED').length} ready` : readyToStart ? 'Ready' : 'Needs setup'}</small></button>)}</div><p>Add entries and bidders in either order. Review both before you start.</p></section> : <nav className="workspace-jumps" aria-label="Jump to event section">{event.mode === 'ONLINE' && <Link href={`/events/${event.id}/room`}>Bidding room ↗</Link>}{pending && event.status !== 'COMPLETED' && <a href="#round-mode">Round mode</a>}{event.status === 'COMPLETED' && <a href="#auction-summary-title">Results</a>}<button type="button" onClick={() => showSection('bidder-setup')}>Bidders</button>{entriesEditable && <button type="button" onClick={() => showSection('entry-editor')}>Entries</button>}</nav>}
    {draft && setupStep === 'review' && <section className="panel setup-review"><p className="eyebrow">FINAL CHECK</p><h2>Ready for the first round?</h2><div className="setup-review-grid"><button type="button" onClick={() => goToStep('entries')}><strong>{event.entries.length} entries</strong><span>{event.entries.length ? 'Review names and base prices' : 'Add at least one entry'}</span></button><button type="button" onClick={() => goToStep('bidders')}><strong>{event.participants.filter(person => person.status === 'APPROVED').length} bidders ready</strong><span>{event.mode === 'ONLINE' ? 'Invite and approve a bidder' : 'Add at least one bidder'}</span></button></div>{!readyToStart && <p role="status">Complete both steps before starting the auction.</p>}{event.mode === 'ONLINE' && readyToStart && <Link className="button-link" href={`/events/${event.id}/room`}>Open room to start →</Link>}</section>}
    {event.status === 'PAUSED' && <div className="workspace-guide"><span className="guide-mark">Ⅱ</span><div><strong>Auction paused</strong><p>You can manage entries and bidders now. Resume when the next round is ready.</p></div></div>}
    <div className="workspace-body"><div className="workspace-main">
    {showReview && ['DRAFT', 'LIVE', 'PAUSED'].includes(event.status) && pending && <details id="round-mode" className="round-mode-disclosure"><summary>Round mode: {event.roundMode} · Change</summary><RoundModePicker title={event.status === 'DRAFT' ? 'Choose the first round' : 'Choose this round’s mode'} mode={event.roundMode} duration={event.roundDurationSeconds ?? 30} disabled={busy || modeLocked} onChange={(mode: RoundMode) => { void command({ action: 'roundMode', mode }); }} onDurationChange={seconds => { void command({ action: 'roundDuration', seconds }); }} /></details>}
    {event.status === 'COMPLETED' && <AuctionSummary entries={event.entries} collectedCents={summarizeAuction(event.entries, event.bids).collectedCents} />}
    {showBidders && event.mode === 'ONLINE' && draft && !event.joinCode && <section className="panel room-promo"><div><p className="eyebrow">INVITE BIDDERS</p><h2>Open the bidding room</h2><p>Add all entries and base prices first. Then share the room code and approve bidders.</p></div><button disabled={busy || !event.entries.length} onClick={() => command({ action: 'openRoom' })}>{event.entries.length ? 'Open room for bidders →' : 'Add an entry first'}</button></section>}
    {showBidders && event.mode === 'ONLINE' && event.joinCode && <section className="panel room-promo"><div><p className="eyebrow">ONLINE ROOM</p><h2>Invite bidders to join</h2><p>Share the room code, approve requests, and return here when a bidder is ready.</p></div><Link className="button-link" href={`/events/${event.id}/room`}>Open bidding room →</Link></section>}
    {event.mode === 'LOCAL' && event.status === 'LIVE' && pending && (event.roundMode === 'SEALED' || event.roundMode === 'TIMED') && <LocalBidRound entry={pending} category={event.category} mode={event.roundMode} bidders={event.participants} bids={event.bids} timerEndsAt={event.timerEndsAt} busy={busy} command={command} error={bidError} />}
    {event.mode === 'LOCAL' && event.status === 'LIVE' && pending && (event.roundMode === 'NORMAL' || event.roundMode === 'REVERSE') && <section className="panel current"><p className="eyebrow">ON THE BLOCK · {event.roundMode}</p><div className="current-grid">{pending.imageUrl && <img src={pending.imageUrl} alt="" />}<div><h2>{pending.name}</h2><p>Base price: {formatPrice(pending.basePriceCents)}</p><EntryFacts entry={pending} category={event.category} />{event.roundMode === 'NORMAL' ? <><form className="bid-form" onSubmit={sell}><>{event.participants.length ? <StyledSelect label="Winner" value={winner} onChange={setWinner} options={[{ value: "", label: "Choose bidder" }, ...event.participants.map(person => ({ value: person.userId, label: person.name + " — " + formatPrice(bidderRemaining(event, person)) + " units left" }))]} /> : <label>Winner<input value={winner} onChange={e => setWinner(e.target.value)} maxLength={120} required /></label>}</><label>Winning bid<input type="number" min={pending.basePriceCents / 100} step="0.01" value={soldPrice} onChange={e => setSoldPrice(e.target.value)} placeholder={String(pending.basePriceCents / 100)} required /></label><button disabled={busy}>Mark sold</button></form>{bidError && <p role="alert" className="bid-inline-error">{bidError}</p>}</> : <><p>Lowest bidder receives this entry. Every bidder pays their own final bid.</p><form className="bid-form" onSubmit={recordReverseBid}><>{event.participants.length ? <StyledSelect label="Bidder" value={reverseBidder} onChange={setReverseBidder} options={[{ value: "", label: "Choose bidder" }, ...event.participants.map(person => ({ value: person.userId, label: person.name + " — " + formatPrice(bidderRemaining(event, person)) + " units left" }))]} /> : <label>Bidder<input value={reverseBidder} onChange={e => setReverseBidder(e.target.value)} maxLength={120} required /></label>}</><label>Bid<input type="number" min={pending.basePriceCents / 100} step="0.01" value={reverseAmount} onChange={e => setReverseAmount(e.target.value)} required /></label><button disabled={busy}>Record bid</button></form>{bidError && <p role="alert" className="bid-inline-error">{bidError}</p>}<div className="reverse-bids">{Object.values(currentBids).sort((a, b) => a.amountCents - b.amountCents).map(bid => <div key={bid.bidderId}>{bid.bidderName}: {formatPrice(bid.amountCents)}</div>)}</div><button disabled={busy || !Object.keys(currentBids).length} onClick={() => command({ action: 'reverseAward', entryId: pending.id })}>Award to lowest and charge all</button></>}<div className="button-row" style={{ marginTop: 18 }}><button className="secondary" disabled={busy} onClick={() => command({ action: 'skip', entryId: pending.id })}>Skip to end of queue</button><button className="text-button" disabled={busy} onClick={() => command({ action: 'unsold', entryId: pending.id })}>Mark permanently unsold</button></div></div></div></section>}
    {showBidders && <details id="bidder-setup" className="workspace-disclosure" open={draft || event.mode === 'LOCAL' && event.participants.length === 0}><summary><strong>Bidders</strong><span>{event.participants.length} on roster</span></summary><BidderSetup event={event} busy={busy} command={command} /></details>}
    {showEntries && event.mode === 'ONLINE' && event.participants.length > 0 && editable && <div className="workspace-guide"><span className="guide-mark">✓</span><div><strong>Entries are locked</strong><p>Bidders have joined this room. The entry list and base prices stay fixed for this auction.</p></div></div>}
    {showEntries && entriesEditable && <details id="entry-editor" className="workspace-disclosure entry-editor-disclosure" open={draft || !event.entries.length || !!editing}><summary><strong>{editing ? 'Edit entry' : 'Add entries'}</strong><span>{event.entries.length} in auction</span></summary><section className="panel entry-editor">
      <div className="entry-mode-tabs" role="tablist" aria-label="Ways to add entries">
        <button type="button" role="tab" aria-selected={editorMode === 'single'} className={editorMode === 'single' ? '' : 'secondary'} onClick={() => setEditorMode('single')}>One at a time</button>
        <button type="button" role="tab" aria-selected={editorMode === 'bulk'} className={editorMode === 'bulk' ? '' : 'secondary'} onClick={() => { setEditorMode('bulk'); setStaged([]); }}>Paste many</button>
        <button type="button" role="tab" aria-selected={editorMode === 'csv'} className={editorMode === 'csv' ? '' : 'secondary'} onClick={() => { setEditorMode('csv'); setStaged([]); }}>Import CSV file</button>
      </div>
      {editorMode === 'single' && <form className="stack entry-single-form" onSubmit={saveEntry}>
        <label>{sports ? 'Player / entry name' : 'Entry name'}<input value={name} onChange={e => setName(e.target.value)} maxLength={120} required /></label>
        <label>Base price<input type="number" min="0.01" max="10000000" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required /></label>
        {sports && <div className="entry-sports-fields">
          {event.category === 'Football' || event.category === 'Cricket' ? <StyledSelect label={primaryLabel} value={role} onChange={setRole} options={event.category === 'Football' ? [{ value: '', label: 'Not specified' }, { value: 'Forward', label: 'Forward' }, { value: 'Midfielder', label: 'Midfielder' }, { value: 'Defender', label: 'Defender' }, { value: 'Goalkeeper', label: 'Goalkeeper' }, { value: 'Other', label: 'Other' }] : [{ value: '', label: 'Not specified' }, { value: 'Batter', label: 'Batter' }, { value: 'Bowler', label: 'Bowler' }, { value: 'All-rounder', label: 'All-rounder' }, { value: 'Wicketkeeper', label: 'Wicketkeeper' }, { value: 'Other', label: 'Other' }]} /> : <label>{primaryLabel}<input value={role} onChange={e => setRole(e.target.value)} maxLength={80} placeholder="e.g. Player" /></label>}
          <label>{advancedLabel}<input value={specialty} onChange={e => setSpecialty(e.target.value)} maxLength={120} placeholder={event.category === 'Football' ? 'e.g. Right winger' : event.category === 'Cricket' ? 'e.g. Leg spinner' : 'e.g. Specific role'} /></label>
        </div>}
        <label>Description (optional)<textarea className="entry-description" value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} placeholder="A few details for bidders to know" /></label>
        <label>Image link (optional)<input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" /></label>
        <label className="file-label">Or upload an image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) upload(file); }} /></label>
        {imageUrl && <img className="entry-preview-image" src={imageUrl} alt="Entry preview" />}
        <div className="button-row"><button disabled={busy}>{editing ? 'Save entry' : 'Add entry'}</button>{editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setName(''); setPrice('1'); setImageUrl(''); setDescription(''); setRole(''); setSpecialty(''); }}>Cancel</button>}</div>
      </form>}
      {editorMode === 'bulk' && <div className="entry-bulk-form">
        <p>One entry per line: <code>name, base price, image URL, role, advanced role, description</code>. Everything after name is optional. Use quotes around values containing commas.</p>
        <textarea value={batchText} onChange={e => { setBatchText(e.target.value); setStaged([]); }} rows={9} placeholder={'Aarav,100,https://example.com/aarav.jpg\nPriya,75\nSameer'} />
        <button type="button" className="secondary" disabled={busy || !batchText.trim()} onClick={() => previewRows(batchText)}>Preview entries</button>
      </div>}
      {editorMode === 'csv' && <div className="entry-bulk-form">
        <p>Choose a .csv file with columns <code>name, base price, image URL, role, advanced role, description</code>. Extra columns are optional. Blank prices become 1 unit.</p>
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
          {sports && <><label>{primaryLabel}<input value={row.role} onChange={e => setStaged(current => current.map((item, i) => i === index ? { ...item, role: e.target.value } : item))} maxLength={80} /></label><label>{advancedLabel}<input value={row.specialty} onChange={e => setStaged(current => current.map((item, i) => i === index ? { ...item, specialty: e.target.value } : item))} maxLength={120} /></label></>}
          <label>Description<input value={row.description} onChange={e => setStaged(current => current.map((item, i) => i === index ? { ...item, description: e.target.value } : item))} maxLength={1000} /></label>
        </div>)}</div>
        <button type="button" disabled={busy} onClick={addStaged}>{busy ? 'Adding entries...' : `Add all ${staged.length} entries`}</button>
      </div>}
    </section></details>}
    {draft && setupStep !== 'review' && <div className="setup-step-actions"><button type="button" className="secondary" onClick={() => goToStep(setupStep === 'entries' ? 'bidders' : 'entries')}>{setupStep === 'entries' ? 'Choose bidders first' : '← Back to entries'}</button><button type="button" onClick={() => goToStep(setupStep === 'entries' ? 'bidders' : 'review')}>{setupStep === 'entries' ? 'Next: bidders →' : 'Next: review →'}</button></div>}
    </div><aside className="workspace-aside">
      {showReview && <AuctionProgress entries={event.entries.map(entry => ({ id: entry.id, name: entry.name, status: entry.status, winner: entry.winner, soldPriceCents: entry.soldPriceCents, saleMode: entry.saleMode }))} currentId={event.status === 'LIVE' || event.status === 'PAUSED' ? pending?.id : undefined} hidden={event.orderMode === 'HIDDEN' && event.status !== 'DRAFT' && event.status !== 'COMPLETED'} selectedId={selectedResult} onSelect={entryId => { setSelectedResult(entryId); setResultError(''); }} />}
      {selectedResult && event.entries.some(entry => entry.id === selectedResult && entry.status === 'SOLD') && <ResultEditor key={selectedResult} entry={event.entries.find(entry => entry.id === selectedResult)!} bidders={event.participants.filter(person => person.status === 'APPROVED')} busy={busy} error={resultError} onClose={() => { setSelectedResult(null); setResultError(''); }} onSave={async (winnerId, price) => { const ok = await command({ action: 'correctResult', entryId: selectedResult, winnerId, price }); if (ok) setSelectedResult(null); return ok; }} />}
      {showEntries && event.entries.length > 0 && <details className="entry-manage" open={draft}><summary>{entriesEditable ? 'Manage entry order and details' : 'Entries and base prices'}</summary><div className="entry-list">{event.entries.map((entry, index) => <div className="entry-row" key={entry.id}><span className="entry-number">{String(index + 1).padStart(2, '0')}</span>{entry.imageUrl && <img className="entry-row-image" src={entry.imageUrl} alt="" />}<div className="entry-details"><strong>{event.orderMode === 'HIDDEN' && event.status === 'PAUSED' && entry.id !== pending?.id ? 'Hidden entry' : entry.name}</strong><span>Base {formatPrice(entry.basePriceCents)} · {entry.status}</span><EntryFacts entry={entry} category={event.category} /></div>{entriesEditable && entry.status === 'PENDING' && <div className="entry-actions"><button className="text-button" aria-label={`Move entry ${index + 1} up`} disabled={busy || index === 0} onClick={() => { const ids = event.entries.map(e => e.id); [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; command({ action: 'reorder', ids }); }}>↑</button><button className="text-button" aria-label={`Move entry ${index + 1} down`} disabled={busy || index === event.entries.length - 1} onClick={() => { const ids = event.entries.map(e => e.id); [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]]; command({ action: 'reorder', ids }); }}>↓</button><button className="text-button" disabled={busy} onClick={() => editEntry(entry)}>Edit</button><button className="text-button danger" disabled={busy} onClick={() => { if (confirm(`Remove ${entry.name}?`)) command({ action: 'remove', entryId: entry.id }); }}>Remove</button></div>}</div>)}</div></details>}
    </aside></div>
    <footer className="workspace-footer"><button className="text-button danger" disabled={busy} onClick={() => { if (confirm(`Permanently delete ${event.name} and all entries?`)) command({ action: 'delete' }); }}>Delete event</button></footer>
  </main>;
}
