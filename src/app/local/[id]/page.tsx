import { GuestEventPage } from '@/components/guest-event';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
export default async function LocalEventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect('/dashboard');
  const { id } = await params;
  return <GuestEventPage id={id} />;
}
