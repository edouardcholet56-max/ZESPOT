'use client';

import Link from 'next/link';

/**
 * Landing page — Helvetica Neue, black/white/grey.
 * Wordmark: lowercase "zespot" in Helvetica Neue Condensed Black.
 */
export default function BetaHomePage() {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col px-6">
      {/* Top bar */}
      <header className="pt-6 pb-4 flex items-center justify-between">
        <span className="text-[12px] uppercase tracking-[0.18em] text-black/50 hn-regular">
          Beta
        </span>
        <span className="text-[12px] uppercase tracking-[0.18em] text-black/50 hn-regular">
          V0. 1
        </span>
      </header>

      <hr />

      {/* Wordmark + tagline — centered vertically */}
      <main className="flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="hn-cond-black text-[56px] leading-[0.9] text-black">
          zespot
        </h1>
        <p className="hn-light text-[14px] tracking-[-0.01em] text-black/55 mt-3">
          simplifiez vos sorties.
        </p>
      </main>

      <hr />

      {/* CTA + footer */}
      <section className="py-8 space-y-5">
        <Link
          href="/beta/find"
          className="block w-full py-5 border border-black rounded-xl text-black text-[13px] uppercase tracking-[0.18em] text-center hn-bold active:bg-black active:text-white transition-colors"
        >
          Créez un spot
        </Link>
        <p className="text-[11px] uppercase tracking-[0.15em] text-black/40 text-center leading-[1.6] hn-regular">
          Thanks for testing zespot.<br />
          Your opinion matters.
        </p>
      </section>
    </div>
  );
}
