'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'tracking' | 'splash' | 'launch' | 'auth' | 'location';

// ── Icons ──────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

// ── Step 1: ATT tracking consent ──────────────────────────────────

function TrackingScreen({ onChoice }: { onChoice: (allow: boolean) => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6"
      style={{ backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(255,107,44,0.06) 0%, transparent 70%)' }}
    >
      <div
        className="w-full max-w-[340px] bg-[#1C1C1E] rounded-[24px] p-6 shadow-2xl"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.95)',
          transition: 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.34, 1.2, 0.64, 1)',
        }}
      >
        <div className="relative w-16 h-16 mb-5">
          <div className="w-14 h-14 bg-[#FF6B2C] rounded-[16px] flex items-center justify-center text-[28px] shadow-[0_4px_20px_rgba(255,107,44,0.4)]">
            🍺
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#0A84FF] rounded-full flex items-center justify-center border-2 border-[#1C1C1E]">
            <span className="text-[13px]">✋</span>
          </div>
        </div>

        <h2 className="text-white text-[17px] font-semibold leading-snug mb-3">
          Autoriser « ZESPOT » à suivre votre activité dans les apps et sur les sites web ?
        </h2>
        <p className="text-[#8E8E93] text-[13px] leading-relaxed mb-6">
          Cet identifiant sera utilisé pour améliorer votre expérience ZESPOT et vous proposer des suggestions de spots personnalisées.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => onChoice(false)}
            className="w-full py-3.5 bg-[#2C2C2E] rounded-[14px] text-[#EBEBF5] text-[15px] transition-opacity hover:opacity-80 active:opacity-60"
          >
            Demander à l&apos;app de ne pas me suivre
          </button>
          <button
            onClick={() => onChoice(true)}
            className="w-full py-3.5 bg-[#2C2C2E] rounded-[14px] text-white text-[15px] font-semibold transition-opacity hover:opacity-80 active:opacity-60"
          >
            Autoriser
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Splash (logo motion) ──────────────────────────────────

function SplashScreen() {
  const [phase, setPhase] = useState<'hidden' | 'in' | 'hold' | 'out'>('hidden');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('in'), 80);
    const t2 = setTimeout(() => setPhase('hold'), 700);
    const t3 = setTimeout(() => setPhase('out'), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"
      style={{
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'out' ? 'opacity 0.5s ease' : 'none',
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          style={{
            opacity: phase === 'hidden' ? 0 : 1,
            transform: phase === 'hidden' ? 'scale(0.6) translateY(20px)' : 'scale(1) translateY(0)',
            transition: 'opacity 0.55s ease, transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <h1 className="text-[80px] font-bold tracking-[-6px] leading-none select-none">
            ZESP<span className="text-[#FF6B2C]">0</span>T
          </h1>
        </div>
        <div
          style={{
            opacity: phase === 'hidden' || phase === 'in' ? 0 : 1,
            transform: phase === 'hidden' || phase === 'in' ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 0.4s ease 0.2s, transform 0.4s ease 0.2s',
          }}
        >
          <p className="text-[11px] tracking-[5px] uppercase text-[#444]">L&apos;organisateur de soirées</p>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Launch screen with rotating slogans ───────────────────

const SLOGANS = [
  'Trouvez le spot parfait pour tout le groupe.',
  'Plus de galère pour choisir où se voir.',
  'Le bar idéal, au point de rencontre idéal.',
  'Chaque soirée commence ici.',
  'Réunissez vos amis autour d\'un verre.',
];

function LaunchScreen({ onContinue }: { onContinue: () => void }) {
  const [sloganIdx, setSloganIdx] = useState(0);
  const [sloganVisible, setSloganVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setSloganVisible(false);
      setTimeout(() => {
        setSloganIdx((i) => (i + 1) % SLOGANS.length);
        setSloganVisible(true);
      }, 350);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] flex flex-col overflow-hidden"
      style={{ backgroundImage: 'radial-gradient(ellipse 100% 55% at 50% 15%, rgba(255,107,44,0.12) 0%, transparent 65%)' }}
    >
      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center px-6 pt-10">
        <div className="relative w-[280px] h-[280px]">
          {/* Central icon */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[88px] h-[88px] bg-[#FF6B2C] rounded-[26px] flex items-center justify-center text-[44px] z-10 shadow-[0_0_60px_rgba(255,107,44,0.5)]">
            🍺
          </div>
          {/* Friend avatars */}
          {[
            { emoji: '😊', x: '6%', y: '14%' },
            { emoji: '🙂', x: '70%', y: '8%' },
            { emoji: '😄', x: '76%', y: '66%' },
            { emoji: '😁', x: '4%', y: '70%' },
          ].map((f, i) => (
            <div
              key={i}
              className="absolute w-12 h-12 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full flex items-center justify-center text-[22px]"
              style={{ left: f.x, top: f.y }}
            >
              {f.emoji}
            </div>
          ))}
          {/* Dashed lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 280 280" style={{ opacity: 0.25 }}>
            {[[30, 60], [210, 44], [228, 214], [26, 224]].map(([x, y], i) => (
              <line key={i} x1="140" y1="140" x2={x} y2={y} stroke="#FF6B2C" strokeWidth="1.5" strokeDasharray="5 6" />
            ))}
          </svg>
          {/* Rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130px] h-[130px] rounded-full border border-[rgba(255,107,44,0.12)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[210px] h-[210px] rounded-full border border-[rgba(255,107,44,0.06)]" />
        </div>
      </div>

      {/* Text + CTA */}
      <div className="px-7 pb-14">
        <h1 className="text-[36px] font-bold tracking-[-1.5px] leading-[1.12] mb-5 text-center">
          Lancez-vous
        </h1>

        {/* Rotating slogan */}
        <div className="h-[44px] flex items-center justify-center mb-8 overflow-hidden">
          <p
            className="text-[14px] text-[#666] text-center leading-relaxed px-4"
            style={{
              opacity: sloganVisible ? 1 : 0,
              transform: sloganVisible ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
            }}
          >
            {SLOGANS[sloganIdx]}
          </p>
        </div>

        <button
          onClick={onContinue}
          className="w-full py-4 bg-white text-[#0A0A0A] text-[16px] font-bold rounded-[16px] transition-all hover:bg-gray-100 active:scale-[0.98]"
        >
          Créer mon compte →
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Auth ──────────────────────────────────────────────────

function AuthScreen({
  name, setName, email, setEmail, onContinue,
}: {
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  onContinue: () => void;
}) {
  const isValid = name.trim().length > 0 && email.includes('@');

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-6 py-10 flex flex-col">
      <div className="flex justify-end mb-10">
        <button
          onClick={onContinue}
          className="px-4 py-1.5 bg-[#1A1A1A] rounded-full text-[13px] text-[#666] border border-[#2A2A2A] transition-colors hover:border-[#444]"
        >
          Ignorer
        </button>
      </div>

      <div className="w-[52px] h-[52px] bg-[#FF6B2C] rounded-[14px] flex items-center justify-center text-[26px] mb-6 shadow-[0_4px_24px_rgba(255,107,44,0.35)]">
        🍺
      </div>

      <h1 className="text-[30px] font-bold tracking-[-1.2px] leading-tight mb-2">
        Bienvenue sur<br />
        ZESP<span className="text-[#FF6B2C]">0</span>T
      </h1>
      <p className="text-[14px] text-[#555] mb-8">Crée ton compte pour commencer.</p>

      <div className="flex flex-col gap-3 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ton prénom"
          className="w-full bg-[#141414] border border-[#2A2A2A] rounded-[14px] px-4 py-4 text-[15px] text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B2C] transition-colors"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="w-full bg-[#141414] border border-[#2A2A2A] rounded-[14px] px-4 py-4 text-[15px] text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B2C] transition-colors"
        />
        <button
          onClick={isValid ? onContinue : undefined}
          className={`w-full py-4 rounded-[14px] text-[15px] font-semibold transition-all ${
            isValid
              ? 'bg-[#FF6B2C] text-white hover:bg-[#ff7d45] hover:-translate-y-[1px] hover:shadow-[0_10px_32px_rgba(255,107,44,0.28)]'
              : 'bg-[#1C1C1C] text-[#333] cursor-not-allowed'
          }`}
        >
          Continuer
        </button>
      </div>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[#1E1E1E]" />
        <span className="text-[12px] text-[#444]">ou</span>
        <div className="flex-1 h-px bg-[#1E1E1E]" />
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onContinue}
          className="w-full py-4 bg-[#1877F2] rounded-[14px] flex items-center justify-center gap-3 text-white text-[15px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <FacebookIcon />
          Continuer avec Facebook
        </button>
        <button
          onClick={onContinue}
          className="w-full py-4 bg-white rounded-[14px] flex items-center justify-center gap-3 text-[#1A1A1A] text-[15px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <GoogleIcon />
          Continuer avec Google
        </button>
        <button
          onClick={onContinue}
          className="w-full py-4 bg-[#1A1A1A] border border-[#333] rounded-[14px] flex items-center justify-center gap-3 text-white text-[15px] font-semibold transition-all hover:border-[#555] active:scale-[0.98]"
        >
          <AppleIcon />
          Continuer avec Apple
        </button>
      </div>

      <p className="text-[11px] text-[#333] text-center mt-8 leading-relaxed">
        En continuant, vous acceptez notre{' '}
        <span className="text-[#555] underline cursor-pointer">Politique de confidentialité</span>
      </p>
    </div>
  );
}

// ── Step 5: Location permission ───────────────────────────────────

function LocationScreen({ onChoice }: { onChoice: (allow: boolean) => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6"
      style={{ backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(10,132,255,0.06) 0%, transparent 60%)' }}
    >
      {/* Page label */}
      <p className="text-[12px] text-[#444] uppercase tracking-[1.5px] mb-8">Autorisation</p>

      {/* iOS-style popup */}
      <div
        className="w-full max-w-[310px] bg-[#1C1C1E] rounded-[20px] overflow-hidden shadow-2xl"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(20px)',
          transition: 'opacity 0.4s ease, transform 0.45s cubic-bezier(0.34, 1.2, 0.64, 1)',
        }}
      >
        <div className="px-5 pt-6 pb-5 text-center">
          <div className="w-[52px] h-[52px] bg-[#FF6B2C] rounded-[14px] flex items-center justify-center text-[26px] mx-auto mb-4 shadow-[0_4px_16px_rgba(255,107,44,0.35)]">
            📍
          </div>
          <h2 className="text-white text-[17px] font-semibold mb-2 leading-snug">
            Autoriser « ZESPOT » à utiliser votre position ?
          </h2>
          <p className="text-[#8E8E93] text-[13px] leading-relaxed">
            Votre position permet de calculer le point de rencontre idéal entre vous et vos amis.
          </p>
        </div>

        <div className="h-px bg-[#3A3A3C]" />

        <button
          onClick={() => onChoice(false)}
          className="w-full py-[14px] text-[#FF453A] text-[17px] text-center border-b border-[#3A3A3C] transition-colors hover:bg-[#2C2C2E] active:bg-[#3A3A3C]"
        >
          Ne pas autoriser
        </button>
        <button
          onClick={() => onChoice(true)}
          className="w-full py-[14px] text-[#0A84FF] text-[17px] font-semibold text-center transition-colors hover:bg-[#2C2C2E] active:bg-[#3A3A3C]"
        >
          Autoriser lors de l&apos;utilisation
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('tracking');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Auto-advance splash after animation
  useEffect(() => {
    if (step !== 'splash') return;
    const t = setTimeout(() => setStep('launch'), 2800);
    return () => clearTimeout(t);
  }, [step]);

  const handleTracking = (_allow: boolean) => setStep('splash');

  const handleAuth = () => {
    if (name.trim()) sessionStorage.setItem('userName', name.trim());
    if (email.trim()) sessionStorage.setItem('userEmail', email.trim());
    setStep('location');
  };

  const handleLocation = (allow: boolean) => {
    if (allow && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(`/api/reverse-geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
            const data = await res.json();
            if (data.address) sessionStorage.setItem('myAddress', data.address);
          } catch { /* ignore */ }
        },
        () => { /* denied */ }
      );
    }
    router.push('/soiree');
  };

  if (step === 'tracking') return <TrackingScreen onChoice={handleTracking} />;
  if (step === 'splash') return <SplashScreen />;
  if (step === 'launch') return <LaunchScreen onContinue={() => setStep('auth')} />;
  if (step === 'auth') return (
    <AuthScreen name={name} setName={setName} email={email} setEmail={setEmail} onContinue={handleAuth} />
  );
  if (step === 'location') return <LocationScreen onChoice={handleLocation} />;

  return null;
}
