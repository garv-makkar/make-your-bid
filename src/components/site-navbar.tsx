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
  const homeHref = mode === 'account' ? '/dashboard' : mode === 'local' ? '/local' : '/';
  const showBack = Boolean(backHref && backHref !== homeHref && backHref !== '/' && backLabel.toLowerCase() !== 'home');
  const links = mode === 'account'
    ? [{ href: '/dashboard/events', label: 'Your events' }, { href: '/settings', label: 'Settings' }]
    : mode === 'local'
      ? [{ href: '/settings', label: 'Settings' }]
      : [{ href: '/local', label: 'Local auctions' }];

  return <header className="topbar site-navbar">
    <div className="site-navbar-left">
      <Link href={homeHref} className="brand" aria-label="Make Your Bid home">make your bid<span>.</span></Link>
      {showBack && <Link className="site-navbar-back" href={backHref!} aria-label={backLabel}>← {backLabel}</Link>}
    </div>
    <nav className="site-navbar-links" aria-label="Main navigation">
      {contextHref && contextLabel && <Link className="site-navbar-context" href={contextHref}>{contextLabel}</Link>}
      {links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}>{link.label}</Link>)}
      {mode === 'account' ? <ProfileMenu name={name} email={email} /> : pathname !== '/signin' && <Link className="site-navbar-signin" href="/signin">Sign in</Link>}
    </nav>
  </header>;
}
