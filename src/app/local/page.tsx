import { GuestDashboard } from '@/components/guest-dashboard';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function LocalPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect('/dashboard');
  return <GuestDashboard />;
}
