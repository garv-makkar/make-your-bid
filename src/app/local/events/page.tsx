import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { GuestEvents } from '@/components/guest-events';

export default async function LocalEventsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect('/dashboard/events');
  return <GuestEvents />;
}
