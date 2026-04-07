'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Phase = 'logo' | 'tracking' | 'location' | 'done';

export default function HomePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('logo');
  const [logoVisible, setLogoVisible] = useState(false);

  // Animate logo in
  useEffect(() => {
    const t = setTimeout(() => setLogoVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  const handleStart = () => setPhase('tracking');

  const handleTracking = (_allow: boolean) => setPhase('location');

  const handleLocation = (choice: 'deny' | 'allow') => {
    if (choice === 'allow' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `/api/reverse-geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
            );
            const data = await res.json();
            if (data.address) sessionStorage.setItem('myAddress', data.address);
          } catch { /* ignore */ }
        },
        () => { /* ignore */ }
      );
    }
    router.push('/soiree');
  };

  // ── Logo screen ──
  if (phase === 'logo') {
    return (
      <div
        className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6"
        style={{ backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,107,44,0.09) 0%, transparent 65%)' }}
      >
        <div
          className="text-center"
          style={{
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.2, 0.64, 1)',
          }}
        >
          <h1 className="text-[76px] font-bold tracking-[-5px] leading-none select-none">
            ZESP<span className="text-[#FF6B2C]">0</span>T
          </h1>
          <p className="text-[12px] tracking-[5px] uppercase text-[#444] mt-3 mb-20">
            L&apos;organisateur de soirées
          </p>

          <button
            onClick={handleStart}
            className="w-full max-w-[280px] py-4 bg-[#FF6B2C] text-white text-[16px] font-bold rounded-[16px] transition-all hover:bg-[#ff7d45] hover:-translate-y-[1px] hover:shadow-[0_12px_36px_rgba(255,107,44,0.35)] active:scale-[0.97]"
          >
            Commencer →
          </button>

          <p className="text-[11px] text-[#333] mt-5">
            On va juste avoir besoin de ta position 📍
          </p>
        </div>
      </div>
    );
  }

  // ── Tracking consent (ATT style) ──
  if (phase === 'tracking') {
    return (
      <div
        className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6"
        style={{ backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(255,107,44,0.04) 0%, transparent 65%)' }}
      >
        <div className="w-full max-w-[340px] bg-[#1C1C1E] rounded-[24px] p-6 shadow-2xl">
          <div className="relative w-16 h-16 mb-5">
            <div className="w-14 h-14 bg-[#FF6B2C] rounded-[16px] flex items-center justify-center text-[28px] shadow-[0_4px_20px_rgba(255,107,44,0.4)]">
              📍
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#0A84FF] rounded-full flex items-center justify-center border-2 border-[#1C1C1E]">
              <span className="text-[14px]">✋</span>
            </div>
          </div>

          <h2 className="text-white text-[17px] font-semibold leading-snug mb-3">
            Autoriser « ZESPOT » à suivre votre activité dans les apps et sur les sites web ?
          </h2>
          <p className="text-[#8E8E93] text-[13px] leading-relaxed mb-6">
            Ces données seront utilisées pour améliorer votre expérience et vous suggérer les meilleurs spots.
          </p>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => handleTracking(false)}
              className="w-full py-3.5 bg-[#2C2C2E] rounded-[14px] text-[#EBEBF5] text-[15px] transition-opacity hover:opacity-80"
            >
              Demander à l&apos;app de ne pas me suivre
            </button>
            <button
              onClick={() => handleTracking(true)}
              className="w-full py-3.5 bg-[#2C2C2E] rounded-[14px] text-white text-[15px] font-semibold transition-opacity hover:opacity-80"
            >
              Autoriser
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Location permission (iOS style) ──
  if (phase === 'location') {
    return (
      <div
        className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-end px-5 pb-14"
        style={{ backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(10,132,255,0.06) 0%, transparent 60%)' }}
      >
        <div className="mb-6 text-center">
          <p className="text-[13px] text-[#555] uppercase tracking-[1.5px]">Localisation</p>
        </div>

        <div className="w-full max-w-[390px] bg-[#1C1C1E] rounded-[20px] overflow-hidden">
          <div className="px-6 pt-7 pb-5 text-center">
            <div className="w-[60px] h-[60px] bg-[#FF6B2C] rounded-[16px] flex items-center justify-center text-[28px] mx-auto mb-4 shadow-[0_4px_20px_rgba(255,107,44,0.35)]">
              📍
            </div>
            <h2 className="text-white text-[17px] font-semibold mb-2 leading-snug">
              « ZESPOT » souhaite accéder à votre position
            </h2>
            <p className="text-[#8E8E93] text-[13px] leading-relaxed">
              Pour trouver le meilleur spot de rencontre entre vous et vos amis.
            </p>
          </div>

          <div className="h-px bg-[#3A3A3C]" />

          <button
            onClick={() => handleLocation('deny')}
            className="w-full py-4 text-[#FF453A] text-[17px] text-center border-b border-[#3A3A3C] transition-colors hover:bg-[#2C2C2E]"
          >
            Ne pas autoriser
          </button>
          <button
            onClick={() => handleLocation('allow')}
            className="w-full py-4 text-[#0A84FF] text-[17px] font-semibold text-center transition-colors hover:bg-[#2C2C2E]"
          >
            Autoriser lors de l&apos;utilisation
          </button>
        </div>
      </div>
    );
  }

  return null;
}
