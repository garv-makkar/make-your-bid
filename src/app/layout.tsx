import type { Metadata } from 'next';
import { PwaRegister } from '@/components/pwa-register';
import './globals.css';
import './room.css';
import './refinements.css';
import './design.css';
import './mobile.css';
import './styled-select.css';
import './online-flow.css';
import './error-ux.css';
import './setup-flow.css';
import './site-navbar.css';
import './sports-auctions.css';
import './dashboard-layout.css';
import './design-refresh.css';
import './compact-auction.css';
export const metadata: Metadata = { title: 'make your bid', description: 'Your events. Your auction.', applicationName: 'make your bid', appleWebApp: { capable: true, title: 'make your bid', statusBarStyle: 'default' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<footer className="site-footer"><span>make your bid<span className="site-footer-dot">.</span></span><nav aria-label="Footer navigation"><a href="/about">About us</a><a href="/contact">Contact us</a></nav></footer><PwaRegister /></body></html>;
}
