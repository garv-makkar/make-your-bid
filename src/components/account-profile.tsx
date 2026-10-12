'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DeleteAccount, SignOutButton } from './account-controls';
import { ProfileMenu } from './profile-menu';

export function AccountProfile({ name, email }: { name: string; email?: string }) {
  const [eventCount, setEventCount] = useState(0);
  useEffect(() => { fetch('/api/events').then((response) => response.json()).then((events) => setEventCount(Array.isArray(events) ? events.length : 0)).catch(() => {}); }, []);
  return <main className="shell profile-page">
    <header className="topbar"><Link href="/" className="brand">make your bid<span>.</span></Link><div className="button-row"><Link className="text-button" href="/dashboard">Dashboard</Link><ProfileMenu name={name} email={email} /></div></header>
    <div className="history-heading"><div><p className="eyebrow">YOUR ACCOUNT</p><h1>Profile &amp; privacy<span>.</span></h1></div></div>
    <section className="panel profile-card"><div className="profile-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</div><div><p className="eyebrow">SIGNED IN AS</p><h2>{name}</h2>{email && <p>{email}</p>}</div></section>
    <section className="panel profile-card"><div><p className="eyebrow">SIGN OUT</p><h2>Come back anytime</h2><p>Your saved events stay in your account when you sign out.</p></div><SignOutButton /></section>
    <section className="panel profile-card" id="delete-account"><div><p className="eyebrow">ACCOUNT &amp; PRIVACY</p><h2>Delete account data</h2><p>This permanently removes events you own and anonymizes your activity in other auctions.</p></div><DeleteAccount eventCount={eventCount} /></section>
  </main>;
}
