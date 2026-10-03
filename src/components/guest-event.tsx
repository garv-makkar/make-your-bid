'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getGuestEvent, type GuestEvent } from '@/lib/local-events';
import { EventWorkspace } from './event-workspace';

export function GuestEventPage({ id }: { id: string }) {
  const [event, setEvent] = useState<GuestEvent | null | undefined>(undefined);
  useEffect(() => { setEvent(getGuestEvent(id)); }, [id]);
  if (event === undefined) return <main className="shell"><div className="empty">Loading local event…</div></main>;
  if (!event) return <main className="shell"><header className="topbar"><Link href="/" className="brand">make your bid<span>.</span></Link><Link href="/signin" className="button-link">Sign in</Link></header><div className="empty">This event is not saved in this browser. <Link href="/local">View local events</Link></div></main>;
  return <EventWorkspace initial={event} local />;
}
