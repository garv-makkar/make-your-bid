'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProfileMenu } from './profile-menu';

type Mode = 'public' | 'local' | 'account';
type Props = {
  mode: Mode;
  backHref?: string;
  backLabel?: string;
  contextHref?: string;
  contextLabel?: string;
  name?: string;
  email?: string;
};

export function SiteNavbar({ mode, backHref, backLabel = 'Back', contextHref, contextLabel, name, email }: Props) {
  const pathname = usePathname();
  const links = mode === 'account'
    ? [{ href: '/dashboard', label: 'Dashboard' }, { href: '/dashboard/events', label: 'Your events' }, { href: '/settings', label: 'Settings' }]
    : mode === 'local'
      ? [{ href: '/local', label: 'Local events' }, { href: '/settings', label: 'Settings' }]
      : [{ href: '/local', label: 'Local auctions' }];

  return <header className="topbar site-navbar">
    <div className="site-navbar-left">
      <Link href={mode === 'account' ? '/dashboard' : mode === 'local' ? '/local' : '/'} className="brand">make your bid<span>.</span></Link>
      {backHref && <Link className="site-navbar-back" href={backHref} aria-label={backLabel}>← {backLabel}</Link>}
    </div>
    <nav className="site-navbar-links" aria-label="Main navigation">
      {contextHref && contextLabel && <Link className="site-navbar-context" href={contextHref}>{contextLabel}</Link>}
      {links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}>{link.label}</Link>)}
      {mode === 'account' ? <ProfileMenu name={name} email={email} /> : <Link className="site-navbar-signin" href="/signin" aria-current={pathname === '/signin' ? 'page' : undefined}>Sign in</Link>}
    </nav>
  </header>;
}
