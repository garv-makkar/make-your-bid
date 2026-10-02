import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Dashboard } from '@/components/dashboard';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/signin');
  return <Dashboard user={session.user.name || session.user.email || 'Your dashboard'} />;
}
