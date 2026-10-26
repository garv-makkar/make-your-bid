import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SiteNavbar } from '@/components/site-navbar';
export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect('/dashboard');
  return <main className="shell landing">
    <SiteNavbar mode="public" />
    <section className="landing-hero"><div className="landing-copy"><p className="eyebrow">BUILT FOR SPORTS AUCTIONS</p><h1>Every bid<br />has a <em>moment.</em></h1><p>Build your player list, invite bidders, and run every round from opening price to final result. Sports come first, with a simple option for any other auction.</p><div className="landing-actions"><Link className="button-link" href="/signin">Sign in with Google <span aria-hidden="true">↗</span></Link><Link className="button-link secondary" href="/local">Continue locally</Link></div><p className="landing-reassurance">Choose an account or run a local auction without signing in.</p></div><div className="landing-showcase" aria-label="Example auction results"><div className="showcase-top"><span className="showcase-live"><i /> LIVE AUCTION</span><span>ROUND 04 / 08</span></div><div className="showcase-center"><span className="showcase-number">04</span><p className="eyebrow">NOW ON THE BLOCK</p><h2>One great find.<br /><em>One winning bid.</em></h2><div className="showcase-offer"><span>LEADING OFFER</span><strong>128 <small>units</small></strong></div></div><div className="showcase-bottom"><span>01. Set up</span><span>02. Take bids</span><span>03. Celebrate</span></div></div></section>
    <section className="landing-choices" aria-label="Choose how to get started"><article className="panel"><span className="choice-icon">01</span><h2>Use your account</h2><p>Sign in with Google to save your events and host a live bidding room that others can join.</p><Link href="/signin">Sign in with Google <span aria-hidden="true">↗</span></Link></article><article className="panel"><span className="choice-icon">02</span><h2>Continue locally</h2><p>Run an auction on this device without signing in. Local auctions do not include live bidding rooms, and events stay in this browser until its data is cleared.</p><Link href="/local">Open local auctions <span aria-hidden="true">↗</span></Link></article></section>
    <p className="landing-footnote">Open, reverse, sealed, and timed rounds. Import entries from CSV, track winners, and finish with a clear summary.</p>
  </main>;
}
