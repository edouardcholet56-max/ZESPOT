'use client';

import Link from 'next/link';

export default function BetaHomePage() {
  return (
    <div className="min-h-screen bg-[#FFF5F7] text-[#1F1B2E] flex flex-col items-center justify-between px-6 py-12 overflow-hidden relative">
      {/* Soft decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 w-[320px] h-[320px] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, #10D29B55 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-20 w-[360px] h-[360px] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, #FF4D8F55 0%, transparent 70%)' }}
      />

      {/* Top badge */}
      <div className="relative z-10 w-full max-w-[430px] flex justify-center pt-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/70 backdrop-blur rounded-full text-[11px] font-semibold tracking-[2px] uppercase text-[#10D29B] border border-[#10D29B]/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10D29B] animate-pulse" />
          Beta testing
        </span>
      </div>

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative">
          {/* Pulsing halo */}
          <div className="zespot-halo absolute inset-0 rounded-full" />
          <h1 className="relative text-[64px] sm:text-[72px] font-black tracking-[-3px] leading-none select-none">
            ZESP<span className="text-[#FF4D8F] zespot-zero">0</span>T
          </h1>
        </div>
        <p className="mt-5 text-[15px] text-[#6B6275] text-center max-w-[300px] leading-relaxed">
          Le lieu parfait pour retrouver tes amis,<br />à temps de trajet égal.
        </p>
      </div>

      {/* CTAs */}
      <div className="relative z-10 w-full max-w-[430px] flex flex-col gap-3 pb-6">
        <Link
          href="/beta/find"
          className="w-full py-4 bg-[#FF4D8F] hover:bg-[#ff6aa3] active:scale-[0.98] text-white text-[16px] font-bold rounded-[18px] text-center transition-all shadow-[0_8px_24px_rgba(255,77,143,0.35)]"
        >
          ✨ Créer mon Zespot
        </Link>

        <p className="text-center text-[11px] text-[#9A8FA3] mt-3 tracking-[0.5px]">
          Merci de tester Zespot 💚 ton feedback compte.
        </p>
      </div>

      <style jsx>{`
        @keyframes zespotHalo {
          0%, 100% {
            box-shadow:
              0 0 0 0 rgba(16, 210, 155, 0),
              0 0 40px 10px rgba(16, 210, 155, 0.25),
              0 0 80px 30px rgba(255, 77, 143, 0.12);
          }
          50% {
            box-shadow:
              0 0 0 0 rgba(16, 210, 155, 0),
              0 0 60px 20px rgba(16, 210, 155, 0.45),
              0 0 100px 40px rgba(255, 77, 143, 0.2);
          }
        }
        @keyframes zespotZero {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .zespot-halo {
          animation: zespotHalo 2.8s ease-in-out infinite;
          border-radius: 50%;
        }
        .zespot-zero {
          display: inline-block;
          animation: zespotZero 2.8s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>
    </div>
  );
}
