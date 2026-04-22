'use client';

import Link from 'next/link';

/**
 * Landing page — editorial, minimal.
 * Tagline: "Meet better."
 */
export default function BetaHomePage() {
  return (
    <div className="min-h-screen bg-[#E8E4DB] text-black flex flex-col px-6">
      {/* Top bar */}
      <header className="pt-6 pb-4 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.2em] text-black/50">
          Beta
        </span>
        <span className="text-[11px] uppercase tracking-[0.2em] text-black/50">
          v0.1
        </span>
      </header>

      <hr />

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center py-12 text-center">
        <p className="text-[12px] uppercase tracking-[0.25em] text-black/50 mb-6">
          Meet better.
        </p>
        <h1 className="font-serif text-[84px] leading-[0.95] tracking-[-0.04em] mb-8">
          <span className="italic">Ze</span>Spot
        </h1>
        <p className="font-serif text-[22px] leading-[1.3] text-black/75 max-w-[320px] mx-auto">
          The perfect place to meet your friends, <span className="italic">at equal travel time.</span>
        </p>
      </main>

      <hr />

      {/* CTA */}
      <section className="py-8 space-y-4">
        <Link
          href="/beta/find"
          className="block w-full py-5 bg-[#D13631] text-white text-[14px] uppercase tracking-[0.18em] text-center active:bg-black transition-colors"
        >
          Find our spot
        </Link>
        <p className="text-[11px] uppercase tracking-[0.15em] text-black/40 text-center">
          Thanks for testing ZeSpot — your feedback matters.
        </p>
      </section>
    </div>
  );
}
