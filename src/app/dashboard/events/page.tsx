import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AccountEvents } from '@/components/account-events';

export default async function EventsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/signin');
  return <AccountEvents name={session.user.name || session.user.email || 'Your account'} email={session.user.email || undefined} />;
}
