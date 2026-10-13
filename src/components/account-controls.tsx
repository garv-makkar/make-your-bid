'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { apiError, displayError } from '@/lib/client-errors';

export function SignOutButton({ callbackUrl = '/' }: { callbackUrl?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return <span className="signout-control"><button className="text-button" disabled={busy} onClick={async () => {
    setBusy(true); setError('');
    try { await signOut({ callbackUrl }); }
    catch { setError('Could not sign out. Check your connection and try again.'); setBusy(false); }
  }}>{busy ? 'Signing out…' : 'Sign out'}</button>{error && <small role="alert" className="error-message">{error}</small>}</span>;
}

export function DeleteAccount({ eventCount }: { eventCount: number | null }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleted, setDeleted] = useState(false);

  async function removeAccount() {
    setBusy(true);
    setError('');
    let accountDeleted = false;
    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });
      if (!response.ok) throw await apiError(response, 'Could not delete your account data.');
      accountDeleted = true;
      setDeleted(true);
      await signOut({ callbackUrl: '/' });
    } catch (caught) {
      setError(accountDeleted ? 'Account data was deleted, but sign-out did not finish. Sign out to complete the process.' : displayError(caught, 'Could not delete your account data.'));
      setBusy(false);
    }
  }

  if (deleted) return <div className="delete-account-confirmation"><p role="alert" className="error-message">{error || 'Account data was deleted. Signing out…'}</p>{error && <SignOutButton />}</div>;
  if (!open) return <button className="text-button danger" onClick={() => setOpen(true)}>Delete account data</button>;

  return <div className="delete-account-confirmation">
    <div role="alert" className="delete-warning">
      <strong>This cannot be undone.</strong>
      <p>{eventCount === null ? 'Your owned events, uploads, and account access will be permanently removed.' : eventCount ? `Your ${eventCount} owned ${eventCount === 1 ? 'event' : 'events'}, uploads, and account access will be permanently removed.` : 'Your uploads and account access will be permanently removed.'} Participation in other hosts’ auctions will be anonymized so their auction results remain accurate.</p>
    </div>
    <label>Type <strong>DELETE MY ACCOUNT</strong> to confirm
      <input autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} />
    </label>
    {error && <p role="alert" className="error-message">{error}</p>}
    <div className="button-row">
      <button className="danger-button" disabled={busy || confirmation !== 'DELETE MY ACCOUNT'} onClick={removeAccount}>{busy ? 'Deleting…' : 'Permanently delete'}</button>
      <button className="secondary" disabled={busy} onClick={() => { setOpen(false); setConfirmation(''); setError(''); }}>Cancel</button>
    </div>
  </div>;
}
