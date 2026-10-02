import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { EventWorkspace } from '@/components/event-workspace';
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/signin');
  const { id } = await params;
  const event = await db.event.findFirst({ where: { id, ownerId: session.user.id }, include: { entries: { orderBy: { position: 'asc' } }, bids: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }, participants: { orderBy: { createdAt: 'asc' } } } });
  if (!event) notFound();
  return <EventWorkspace initial={JSON.parse(JSON.stringify(event))} />;
}
