import type { Metadata } from 'next';
import { Instrument_Serif } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

// Geist provides its own variable — override our --font-geist to point at it.
const geist = GeistSans;

export const metadata: Metadata = {
  title: 'ZeSpot — Meet better.',
  description: 'Meet better. Find the perfect spot between friends.',
};

export default function BetaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${instrumentSerif.variable} ${geist.variable} ${geist.className} beta-root bg-[#F5F2EE] text-black min-h-screen`}
    >
      {children}
    </div>
  );
}
