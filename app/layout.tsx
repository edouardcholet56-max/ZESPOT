import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import BottomNav from '@/components/BottomNav';

const font = Space_Grotesk({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ZESP0T — Find the perfect spot',
  description: 'Trouve le meilleur bar au point central entre toi et tes amis',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0A0A0A" />
      </head>
      <body className={`${font.className} bg-black`}>
        {/* Centered phone-width container */}
        <div className="relative mx-auto w-full max-w-[430px] min-h-screen bg-[#0A0A0A] md:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_32px_80px_rgba(0,0,0,0.9)]">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
