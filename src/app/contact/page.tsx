import { SiteNavbar } from '@/components/site-navbar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function ContactPage() {
  const session = await getServerSession(authOptions);
  const signedIn = Boolean(session?.user?.id);
  return <main className="shell"><SiteNavbar mode={signedIn ? 'account' : 'public'} backHref={signedIn ? '/dashboard' : '/'} backLabel="Back" name={session?.user?.name || undefined} email={session?.user?.email || undefined} /><section className="panel state-page"><p className="eyebrow">CONTACT US</p><h1>Get in touch</h1><p>Email: <a href="mailto:garv.makkar03@gmail.com">garv.makkar03@gmail.com</a></p><p>LinkedIn: <a href="https://www.linkedin.com/in/garvmakkar/" target="_blank" rel="noopener noreferrer">garvmakkar</a></p><p>Instagram: <a href="https://www.instagram.com/gogarvgo/" target="_blank" rel="noopener noreferrer">gogarvgo</a></p></section></main>;
}
