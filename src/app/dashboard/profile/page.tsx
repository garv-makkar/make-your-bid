import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AccountProfile } from '@/components/account-profile';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/signin');
  return <AccountProfile name={session.user.name || session.user.email || 'Your account'} email={session.user.email || undefined} />;
}
