import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { InstallAppSetting } from '@/components/install-app-setting';
import { SiteNavbar } from '@/components/site-navbar';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const signedIn = Boolean(session?.user?.id);
  return <main className="shell settings-page">
    <SiteNavbar mode={signedIn ? 'account' : 'local'} backHref={signedIn ? '/dashboard' : '/local'} backLabel={signedIn ? 'Dashboard' : 'Local events'} name={session?.user?.name || session?.user?.email || undefined} email={session?.user?.email || undefined} />
    <div className="history-heading"><div><p className="eyebrow">PREFERENCES</p><h1>Settings<span>.</span></h1><p>Choose how you use make your bid on this device.</p></div></div>
    <InstallAppSetting />
    {signedIn ? <section className="panel settings-secondary"><div><p className="eyebrow">ACCOUNT</p><h2>Profile &amp; privacy</h2><p>View your account details or delete account data.</p></div><Link className="button-link secondary" href="/dashboard/profile">Open account settings →</Link></section> : <section className="panel settings-secondary"><div><p className="eyebrow">LOCAL DATA</p><h2>Saved in this browser</h2><p>Local auctions remain on this device until the browser or app data is cleared. Sign in to host online rooms.</p></div></section>}
  </main>;
}
