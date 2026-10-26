import { SiteNavbar } from '@/components/site-navbar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function AboutPage() {
  const session = await getServerSession(authOptions);
  const signedIn = Boolean(session?.user?.id);
  return <main className="shell"><SiteNavbar mode={signedIn ? 'account' : 'public'} backHref={signedIn ? '/dashboard' : '/'} backLabel="Back" name={session?.user?.name || undefined} email={session?.user?.email || undefined} /><section className="panel state-page"><p className="eyebrow">ABOUT US</p><h1>About us</h1><p>Needs to be updated.</p></section></main>;
}
