'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SignOutButton } from './account-controls';

export function ProfileMenu({ name, email }: { name?: string; email?: string }) {
  const [identity, setIdentity] = useState({ name: name || '', email: email || '' });

  useEffect(() => {
    if (name || email) return;
    fetch('/api/auth/session')
      .then((response) => response.json())
      .then((session) => setIdentity({ name: session?.user?.name || '', email: session?.user?.email || '' }))
      .catch(() => {});
  }, [name, email]);

  return (
    <details className="profile-menu">
      <summary aria-label="Open profile menu" title="Profile">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.3-3.6 2.8-5.5 6.5-5.5s6.2 1.9 6.5 5.5"/></svg>
      </summary>
      <div className="profile-popover">
        <strong>{identity.name || 'Your account'}</strong>
        {identity.email && <small>{identity.email}</small>}
        <div className="profile-menu-divider" />
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/dashboard/events">Your events</Link>
        <Link href="/settings">Settings</Link>
        <Link href="/dashboard/profile">Profile &amp; privacy</Link>
        <div className="profile-menu-divider" />
        <SignOutButton />
        <Link className="profile-delete-link" href="/dashboard/profile#delete-account">Delete account data</Link>
      </div>
    </details>
  );
}
