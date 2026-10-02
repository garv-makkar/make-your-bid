import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
export default async function Home() {
  const session = await getServerSession(authOptions);
  return <main className="shell landing">
    <header className="topbar"><Link href="/" className="brand">make your bid<span>.</span></Link><nav className="button-row"><Link className="text-button" href="/local">Continue locally</Link><Link className="button-link" href={session?.user?.id ? '/dashboard' : '/signin'}>{session?.user?.id ? 'Your events' : 'Sign in'}</Link></nav></header>
    <section className="landing-hero"><p className="eyebrow">MAKE YOUR BID</p><h1>Bring your auction<br /><em>to life.</em></h1><p>Make an event, add your players or items, and run each bid your way. Start on this browser, or sign in with Google to keep events under your account on this app installation.</p><div className="landing-actions"><Link className="button-link" href={session?.user?.id ? '/dashboard' : '/signin'}>{session?.user?.id ? 'Open your events' : 'Sign in with Google'}</Link><Link className="button-link secondary" href="/local">Continue without signing in</Link></div></section>
    <section className="landing-choices"><article className="panel"><span className="choice-icon">↗</span><h2>Use your account</h2><p>Sign in with Google. Your events live in the app database and follow your account.</p><Link href={session?.user?.id ? '/dashboard' : '/signin'}>Go to sign in →</Link></article><article className="panel"><span className="choice-icon">⌂</span><h2>Stay on this browser</h2><p>No sign-in needed. Your events are saved in this browser’s local storage and can disappear if its data is cleared.</p><Link href="/local">Continue locally →</Link></article></section>
    <p className="landing-footnote">Both paths let you add entries, import CSV, shuffle the order, skip entries, and run reverse rounds. Online rooms need Google sign-in.</p>
  </main>;
}
