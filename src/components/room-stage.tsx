import Link from 'next/link';

type Props = {
  eventId: string;
  status: string;
  role: string;
  mode: string;
  offerCount: number;
  busy: boolean;
  approvedCount: number;
  pendingCount: number;
  entryCount: number;
  joinCode: string | null;
  onCopyCode: () => void;
  codeCopied: boolean;
  onStart: () => void;
  onResume: () => void;
  onReviewClose: () => void;
};

export function RoomStage({ eventId, status, role, mode, offerCount, busy, approvedCount, pendingCount, entryCount, joinCode, onCopyCode, codeCopied, onStart, onResume, onReviewClose }: Props) {
  const step = status === 'COMPLETED' ? 3 : status === 'LIVE' || status === 'PAUSED' ? 2 : 1;
  let title = 'Waiting for bidders';
  let detail = 'Share the room link or code, then approve at least one bidder to start.';
  if (status === 'COMPLETED') {
    title = 'Auction complete';
    detail = 'Every entry has been processed. See the results and winners below.';
  } else if (role === 'PENDING') {
    title = 'Waiting for host approval';
    detail = 'Your request has been sent. This page updates when the host responds.';
  } else if (status === 'DRAFT' && role === 'APPROVED') {
    title = 'You’re in. Waiting for the host.';
    detail = 'The host will start the auction when everyone is ready.';
  } else if (status === 'DRAFT' && role === 'HOST' && approvedCount > 0 && entryCount === 0) {
    title = 'Add an entry to begin';
    detail = 'A bidder is approved. Add the first entry, then start the auction.';
  } else if (status === 'DRAFT' && role === 'HOST' && approvedCount > 0) {
    title = 'Ready to start';
    detail = `${approvedCount} ${approvedCount === 1 ? 'bidder is' : 'bidders are'} approved. Choose the round mode and start when ready.`;
  } else if (status === 'LIVE') {
    title = 'Bidding is live';
    detail = role === 'HOST' ? 'Watch the offers and close this round when you are ready.' : 'Place your offer before the round closes.';
  } else if (status === 'PAUSED') {
    title = 'Auction paused';
    detail = role === 'HOST' ? 'Make any changes, then resume the next round.' : 'The host will resume bidding shortly.';
  }

  return <section className={`room-stage room-stage-${step}`} aria-label="Auction stage">
    <ol className="room-stage-steps"><li className={step >= 1 ? 'active' : ''}><span>1</span> Waiting room</li><li className={step >= 2 ? 'active' : ''}><span>2</span> Live bidding</li><li className={step >= 3 ? 'active' : ''}><span>3</span> Results</li></ol>
    <div className="room-stage-body"><div><p className="eyebrow">{status === 'DRAFT' ? 'BEFORE THE FIRST BID' : status === 'COMPLETED' ? 'FINAL RESULTS' : 'CURRENT STAGE'}</p><h2>{title}</h2><p>{detail}</p>{role === 'HOST' && status === 'DRAFT' && <small>{entryCount} {entryCount === 1 ? 'entry' : 'entries'} added · {approvedCount} approved · {pendingCount} waiting for approval</small>}</div>
      {role === 'HOST' && status !== 'COMPLETED' && joinCode && <div className="room-invite-code"><span>ROOM CODE</span><strong>{joinCode.slice(0, 6)}-{joinCode.slice(6)}</strong><button type="button" className="secondary" onClick={onCopyCode}>{codeCopied ? 'Copied!' : 'Copy code'}</button></div>}
    </div>
    {role === 'HOST' && <div className="room-stage-action">
      {status === 'DRAFT' && entryCount === 0 ? <Link className="button-link" href={`/events/${eventId}`}>Add the first entry →</Link>
        : status === 'DRAFT' && approvedCount === 0 && pendingCount > 0 ? <button type="button" onClick={() => document.querySelector('.participants')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Review join requests →</button>
        : status === 'DRAFT' && approvedCount === 0 ? <button type="button" disabled={!joinCode} onClick={onCopyCode}>{codeCopied ? 'Code copied!' : 'Copy code to invite bidders'}</button>
        : status === 'DRAFT' ? <button type="button" disabled={busy} onClick={onStart}>Start auction →</button>
        : status === 'PAUSED' ? <button type="button" disabled={busy} onClick={onResume}>Resume bidding →</button>
        : status === 'LIVE' && mode !== 'TIMED' ? <button type="button" disabled={busy} onClick={onReviewClose}>{offerCount ? 'Review and close round →' : 'Close round without bids →'}</button>
        : status === 'COMPLETED' ? <a className="button-link" href="#auction-summary-title">View results ↓</a>
        : null}
    </div>}
  </section>;
}
