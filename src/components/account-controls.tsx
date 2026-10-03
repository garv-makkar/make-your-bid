'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export function SignOutButton({ callbackUrl = '/' }: { callbackUrl?: string }) {
  const [busy, setBusy] = useState(false);

  return <button className="text-button" disabled={busy} onClick={async () => {
    setBusy(true);
    await signOut({ callbackUrl });
  }}>{busy ? 'Signing out…' : 'Sign out'}</button>;
}

export function DeleteAccount({ eventCount }: { eventCount: number }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function removeAccount() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not delete your account data.');
      await signOut({ callbackUrl: '/' });
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
    }
  }

  if (!open) return <button className="text-button danger" onClick={() => setOpen(true)}>Delete account data</button>;

  return <div className="delete-account-confirmation">
    <div role="alert" className="delete-warning">
      <strong>This cannot be undone.</strong>
      <p>{eventCount ? `Your ${eventCount} owned ${eventCount === 1 ? 'event' : 'events'}, uploads, and account access will be permanently removed.` : 'Your uploads and account access will be permanently removed.'} Participation in other hosts’ auctions will be anonymized so their auction results remain accurate.</p>
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
