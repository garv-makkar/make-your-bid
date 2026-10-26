import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SiteNavbar } from '@/components/site-navbar';

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect('/dashboard');

  return <main className="shell landing landing-refresh">
    <SiteNavbar mode="public" />
    <section className="landing-intro">
      <div>
        <p className="eyebrow">THE AUCTION STUDIO FOR SPORT</p>
        <h1>Great teams start with a <em>great auction.</em></h1>
        <p>Set your player list, bring bidders together, and keep every round clear from first bid to final result.</p>
      </div>
      <ol className="landing-path" aria-label="How it works">
        <li><span>01</span><div><strong>Build your lineup</strong><small>Add entries, roles, images and base prices.</small></div></li>
        <li><span>02</span><div><strong>Bring in bidders</strong><small>Run it together in a room or from one device.</small></div></li>
        <li><span>03</span><div><strong>Make every bid count</strong><small>Track winners, balances and final results.</small></div></li>
      </ol>
    </section>
    <section className="landing-choice-grid" aria-label="Choose how to get started">
      <article className="landing-choice landing-choice-account">
        <div className="landing-choice-top"><span className="choice-icon" aria-hidden="true">↗</span><span className="choice-tag">LIVE ROOM · SAVED EVENTS</span></div>
        <div><h2>Host with an account</h2><p>Invite bidders with a room code, run the auction live, and return to your saved events later.</p></div>
        <Link className="button-link" href="/signin">Sign in with Google <span aria-hidden="true">→</span></Link>
      </article>
      <article className="landing-choice landing-choice-local">
        <div className="landing-choice-top"><span className="choice-icon" aria-hidden="true">○</span><span className="choice-tag">ONE DEVICE · WORKS OFFLINE</span></div>
        <div><h2>Run it locally</h2><p>Manage every bid on this device. No sign-in needed. Local auctions do not have a room for others to join.</p></div>
        <Link className="button-link secondary" href="/local">Continue locally <span aria-hidden="true">→</span></Link>
      </article>
    </section>
  </main>;
}
