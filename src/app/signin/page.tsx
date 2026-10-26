import { SiteNavbar } from '@/components/site-navbar';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions, googleEnabled } from '@/lib/auth';
import { GoogleSignIn } from '@/components/google-signin';

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect('/dashboard');
  const { error } = await searchParams;
  return <main className="shell"><SiteNavbar mode="public" backHref="/" backLabel="Home" /><section className="panel auth-card"><p className="eyebrow">YOUR ACCOUNT</p><h1>Sign in to save your events</h1><p>Use your Google account to create events you can return to when you sign in again.</p>{error && <div role="alert" className="error-message">{error === 'OAuthCallback' ? 'Google sign-in did not finish. Please try again from this page.' : 'Sign-in did not finish. Please try again.'}</div>}<GoogleSignIn enabled={googleEnabled} /><div className="auth-divider">or</div><Link className="button-link secondary" href="/local">Continue without signing in</Link><small>Local events stay in this browser and do not have live bidding rooms. Clearing browser data can remove them.</small></section></main>;
}
