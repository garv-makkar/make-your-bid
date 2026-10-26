'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SiteBackButton() {
  const path = usePathname();
  if (!path || path === '/') return null;
  const fallback = path.startsWith('/local/') ? '/local'
    : path.startsWith('/events/') && path.endsWith('/room') ? path.slice(0, -5)
    : path.startsWith('/events/') ? '/dashboard/events'
    : path.startsWith('/dashboard/') ? '/dashboard'
    : path === '/settings' ? '/local'
    : '/';
  return <Link className="site-back-button" href={fallback} aria-label="Back to previous section">← Back</Link>;
}
