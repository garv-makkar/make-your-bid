import type { Metadata } from 'next';
import { PwaRegister } from '@/components/pwa-register';
import { SiteBackButton } from '@/components/site-back-button';
import './globals.css';
import './room.css';
import './refinements.css';
import './design.css';
import './mobile.css';
import './styled-select.css';
import './online-flow.css';
import './error-ux.css';
import './setup-flow.css';
export const metadata: Metadata = { title: 'make your bid', description: 'Your events. Your auction.', applicationName: 'make your bid', appleWebApp: { capable: true, title: 'make your bid', statusBarStyle: 'default' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<SiteBackButton /><PwaRegister /></body></html>;
}
