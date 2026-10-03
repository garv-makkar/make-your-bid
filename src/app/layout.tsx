import type { Metadata } from 'next';
import './globals.css';
import './room.css';
import './refinements.css';
import './design.css';
export const metadata: Metadata = { title: 'make-your-bid', description: 'Your events. Your auction.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
