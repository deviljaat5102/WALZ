import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'WALZ', description: 'One platform. Connected experiences.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
