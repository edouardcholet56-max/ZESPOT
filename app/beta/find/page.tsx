'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AddressItem, LatLng, Place, TransportMode } from '@/lib/types';
import { storage } from '@/lib/storage';
import { haversine, uid, sleep } from '@/lib/utils';

type Step = 'geoloc' | 'form' | 'loading' | 'result';
type SpotType = 'bar' | 'restaurant' | 'park' | 'museum';

const SPOT_TYPES: { key: SpotType; emoji: string; label: string; accent: 'rose' | 'green' }[] = [
  { key: 'bar',        emoji: '🍺', label: 'Bar',         accent: 'rose'  },
  { key: 'restaurant', emoji: '🍽', label: 'Restaurant',  accent: 'rose'  },
  { key: 'park',       emoji: '🌳', label: 'Espace vert', accent: 'green' },
  { key: 'museum',     emoji: '🏛', label: 'Musée',       accent: 'green' },
];

const MODES: { key: TransportMode; emoji: string; label: string }[] = [
  { key: 'walking',   emoji: '🚶', label: 'À pied'     },
  { key: 'bicycling', emoji: '🚲', label: 'Vélo'       },
  { key: 'transit',   emoji: '🚇', label: 'Transports' },
];

const LOADING_STEPS = [
  { emoji: '📍', label: 'Localisation des amis...' },
  { emoji: '🧭', label: 'Calcul du point équidistant...' },
  { emoji: '🔍', label: 'Recherche du lieu parfait...' },
  { emoji: '✨', label: 'Presque prêt...' },
];

export default function BetaFindPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('geoloc');
  const [loadingStep, setLoadingStep] = useState(0);

  // Form state
  const [addresses, setAddresses] = useState<AddressItem[]>([
    { id: uid(), value: '' },
    { id: uid(), value: '' },
    { id: uid(), value: '' },
  ]);
  const [spotType, setSpotType] = useState<SpotType>('bar');
  const [mode, setMode] = useState<TransportMode>('transit');
  const [error, setError] = useState('');

  // Result state
  const [result, setResult] = useState<Place | null>(null);
  const [shareCode, setShareCode] = useState<string>('');
  const [shareLoading, setShareLoading] = useState(false);

  // On mount: if we already have a saved address, skip geoloc screen
  useEffect(() => {
    const saved = storage.myAddress;
    if (saved) {
      setAddresses((prev) => {
        const updated = [...prev];
        updated[0] = { ...updated[0], value: saved, label: 'Moi' };
        return updated;
      });
      setStep('form');
    }
    const lastMode = storage.lastMode as TransportMode;
    if (lastMode === 'walking' || lastMode === 'bicycling' || lastMode === 'transit') {
      setMode(lastMode);
    }
  }, []);

  // ── Geolocation step ───────────────────────────────────────────────
  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setStep('form');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/reverse-geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          );
          const data = await res.json();
          if (data.address) {
            storage.myAddress = data.address;
            setAddresses((prev) => {
              const updated = [...prev];
              updated[0] = { ...updated[0], value: data.address, label: 'Moi' };
              return updated;
            });
          }
        } catch {
          // Silent fail — user can type manually
        } finally {
          setStep('form');
        }
      },
      () => setStep('form'),
      { timeout: 8000 }
    );
  };

  const skipGeolocation = () => setStep('form');

  // ── Form helpers ────────────────────────────────────────────────────
  const updateAddress = (id: string, value: string) => {
    setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, value } : a)));
  };

  // ── Find the spot ───────────────────────────────────────────────────
  const findSpot = async () => {
    const filled = addresses.filter((a) => a.value.trim().length > 0);
    if (filled.length < 2) {
      setError('Il faut au moins 2 adresses (toi + 1 ami)');
      return;
    }
    setError('');
    setStep('loading');
    setLoadingStep(0);
    storage.lastMode = mode;

    try {
      // 1. Geocode all addresses
      setLoadingStep(0);
      const geocoded: LatLng[] = [];
      for (const addr of filled) {
        const res = await fetch(`/api/geocode?address=${encodeURIComponent(addr.value)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Adresse introuvable');
        geocoded.push({ lat: data.lat, lng: data.lng });
      }

      // 2. Compute travel-time equidistant midpoint
      setLoadingStep(1);
      const originsStr = geocoded.map((c) => `${c.lat},${c.lng}`).join('|');
      let mid: LatLng;
      try {
        const eqRes = await fetch(
          `/api/equidistant?origins=${encodeURIComponent(originsStr)}&mode=${mode}`
        );
        const eqData = await eqRes.json();
        mid = eqRes.ok && eqData.lat ? { lat: eqData.lat, lng: eqData.lng } : {
          lat: geocoded.reduce((s, c) => s + c.lat, 0) / geocoded.length,
          lng: geocoded.reduce((s, c) => s + c.lng, 0) / geocoded.length,
        };
      } catch {
        mid = {
          lat: geocoded.reduce((s, c) => s + c.lat, 0) / geocoded.length,
          lng: geocoded.reduce((s, c) => s + c.lng, 0) / geocoded.length,
        };
      }

      // 3. Search places by type. Expand radius if too few results.
      setLoadingStep(2);
      let placesRes = await fetch(
        `/api/places?lat=${mid.lat}&lng=${mid.lng}&radius=800&type=${spotType}`
      );
      let placesData = await placesRes.json();
      let raw: Omit<Place, 'dist'>[] = placesData.places || [];
      if (raw.length < 3) {
        placesRes = await fetch(
          `/api/places?lat=${mid.lat}&lng=${mid.lng}&radius=2000&type=${spotType}`
        );
        placesData = await placesRes.json();
        raw = placesData.places || [];
      }
      if (raw.length < 1) {
        placesRes = await fetch(
          `/api/places?lat=${mid.lat}&lng=${mid.lng}&radius=5000&type=${spotType}`
        );
        placesData = await placesRes.json();
        raw = placesData.places || [];
      }

      if (raw.length === 0) {
        throw new Error(`Aucun ${spotTypeLabel(spotType)} trouvé dans la zone.`);
      }

      // Add geographic distance, take top 8 for travel-time re-ranking
      let candidates: Place[] = raw
        .map((p) => ({ ...p, dist: haversine(mid.lat, mid.lng, p.lat, p.lng) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 8);

      // 4. Re-rank by real travel times (minimise max travel time)
      setLoadingStep(3);
      try {
        const destinations = candidates.map((p) => `${p.lat},${p.lng}`).join('|');
        const ttRes = await fetch(
          `/api/travel-times?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destinations)}&mode=${mode}`
        );
        const ttData = await ttRes.json();
        if (ttData.matrix) {
          candidates = candidates.map((p, j) => ({
            ...p,
            travelTimes: ttData.matrix.map((row: (number | null)[]) => row[j]),
          }));
          candidates.sort((a, b) => {
            const va = (a.travelTimes || []).filter((t): t is number => t !== null);
            const vb = (b.travelTimes || []).filter((t): t is number => t !== null);
            const ma = va.length ? Math.max(...va) : Infinity;
            const mb = vb.length ? Math.max(...vb) : Infinity;
            return ma - mb;
          });
        }
      } catch {
        // keep geographic order
      }

      await sleep(300);
      const best = candidates[0];
      setResult(best);

      // Generate share code + save locally
      void generateShareAndSave(best);

      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setStep('form');
    }
  };

  const generateShareAndSave = async (place: Place) => {
    setShareLoading(true);
    try {
      const res = await fetch('/api/spot-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spot: place }),
      });
      const data = await res.json();
      if (data.code) {
        setShareCode(data.code);
        storage.addBetaSpot({
          code: data.code,
          place_id: place.place_id,
          name: place.name,
          address: place.address,
          rating: place.rating,
          photo_reference: place.photo_reference,
          type: spotType,
          createdAt: Date.now(),
        });
      }
    } catch {
      // non-blocking
    } finally {
      setShareLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────
  if (step === 'geoloc') {
    return <GeolocStep onAccept={requestGeolocation} onSkip={skipGeolocation} />;
  }
  if (step === 'loading') {
    return <LoadingStep step={loadingStep} />;
  }
  if (step === 'result' && result) {
    return (
      <ResultStep
        place={result}
        spotType={spotType}
        shareCode={shareCode}
        shareLoading={shareLoading}
        onReset={() => router.push('/beta')}
        onNew={() => {
          setResult(null);
          setShareCode('');
          setStep('form');
        }}
      />
    );
  }

  // Form step
  return (
    <FormStep
      addresses={addresses}
      updateAddress={updateAddress}
      spotType={spotType}
      setSpotType={setSpotType}
      mode={mode}
      setMode={setMode}
      error={error}
      onSubmit={findSpot}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════
// GEOLOC STEP
// ═════════════════════════════════════════════════════════════════════

function GeolocStep({ onAccept, onSkip }: { onAccept: () => void; onSkip: () => void }) {
  return (
    <div className="min-h-screen bg-[#FFF5F7] flex flex-col items-center justify-center px-6 py-12 text-[#1F1B2E] relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #10D29B66 0%, transparent 70%)' }}
      />
      <div className="relative z-10 max-w-[380px] w-full flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#10D29B] to-[#0EB588] flex items-center justify-center mb-6 shadow-[0_8px_30px_rgba(16,210,155,0.4)]">
          <span className="text-[40px]">📍</span>
        </div>
        <h1 className="text-[28px] font-bold tracking-[-0.8px] mb-3">Où es-tu ?</h1>
        <p className="text-[15px] text-[#6B6275] leading-relaxed mb-10">
          Partage ta localisation pour qu&apos;on pré-remplisse ton adresse. Ça te fera gagner du temps.
        </p>
        <button
          onClick={onAccept}
          className="w-full py-4 bg-[#10D29B] hover:bg-[#0EB588] active:scale-[0.98] text-white text-[15px] font-bold rounded-[18px] transition-all shadow-[0_8px_24px_rgba(16,210,155,0.35)] mb-3"
        >
          Partager ma position
        </button>
        <button
          onClick={onSkip}
          className="w-full py-3 text-[#9A8FA3] text-[14px] font-semibold hover:text-[#6B6275] transition-colors"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// FORM STEP
// ═════════════════════════════════════════════════════════════════════

function FormStep({
  addresses,
  updateAddress,
  spotType,
  setSpotType,
  mode,
  setMode,
  error,
  onSubmit,
}: {
  addresses: AddressItem[];
  updateAddress: (id: string, value: string) => void;
  spotType: SpotType;
  setSpotType: (t: SpotType) => void;
  mode: TransportMode;
  setMode: (m: TransportMode) => void;
  error: string;
  onSubmit: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#FFF5F7] text-[#1F1B2E] pb-10">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#FFF5F7]/90 backdrop-blur-md border-b border-[#F0E5EA]">
        <div className="max-w-[520px] mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/beta" className="text-[14px] text-[#9A8FA3] font-medium hover:text-[#1F1B2E] transition-colors">
            ← Retour
          </Link>
          <h1 className="text-[15px] font-bold tracking-[-0.3px]">
            ZESP<span className="text-[#FF4D8F]">0</span>T
          </h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-[520px] mx-auto px-5 pt-6 space-y-7">
        {/* Addresses */}
        <section>
          <h2 className="text-[13px] font-bold text-[#6B6275] uppercase tracking-[2px] mb-3">
            Les adresses
          </h2>
          <div className="space-y-2.5">
            {addresses.map((addr, i) => (
              <AddressInput
                key={addr.id}
                value={addr.value}
                placeholder={i === 0 ? 'Ton adresse' : `Adresse ami ${i}`}
                emoji={i === 0 ? '🏠' : '👋'}
                onChange={(v) => updateAddress(addr.id, v)}
              />
            ))}
          </div>
        </section>

        {/* Spot type */}
        <section>
          <h2 className="text-[13px] font-bold text-[#6B6275] uppercase tracking-[2px] mb-3">
            Vous voulez aller où ?
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {SPOT_TYPES.map((t) => {
              const active = spotType === t.key;
              const accentColor = t.accent === 'rose' ? '#FF4D8F' : '#10D29B';
              const accentBg = t.accent === 'rose' ? '#FFE4EC' : '#D6F9EC';
              return (
                <button
                  key={t.key}
                  onClick={() => setSpotType(t.key)}
                  className={`p-4 rounded-[16px] border-2 transition-all active:scale-[0.97] text-left ${
                    active
                      ? 'border-transparent shadow-[0_6px_20px_rgba(0,0,0,0.06)]'
                      : 'border-[#F0E5EA] bg-white hover:border-[#E5D5DD]'
                  }`}
                  style={active ? { background: accentBg, borderColor: accentColor } : undefined}
                >
                  <div className="text-[28px] mb-1.5">{t.emoji}</div>
                  <div
                    className={`text-[14px] font-bold tracking-[-0.2px] ${active ? '' : 'text-[#1F1B2E]'}`}
                    style={active ? { color: accentColor } : undefined}
                  >
                    {t.label}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Transport mode */}
        <section>
          <h2 className="text-[13px] font-bold text-[#6B6275] uppercase tracking-[2px] mb-3">
            On se déplace comment ?
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => {
              const active = mode === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`py-3 px-2 rounded-[14px] border-2 transition-all active:scale-[0.97] ${
                    active
                      ? 'border-[#10D29B] bg-[#D6F9EC] text-[#0EB588]'
                      : 'border-[#F0E5EA] bg-white text-[#6B6275] hover:border-[#E5D5DD]'
                  }`}
                >
                  <div className="text-[22px] mb-0.5">{m.emoji}</div>
                  <div className="text-[11px] font-bold">{m.label}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-[#FFE4EC] border border-[#FF4D8F]/30 rounded-[12px] text-[13px] text-[#D13A72] font-medium">
            {error}
          </div>
        )}
      </main>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[#FFF5F7] via-[#FFF5F7] to-transparent pt-6 pb-5 px-5 mt-8">
        <div className="max-w-[520px] mx-auto">
          <button
            onClick={onSubmit}
            className="w-full py-4 bg-[#FF4D8F] hover:bg-[#ff6aa3] active:scale-[0.98] text-white text-[16px] font-bold rounded-[18px] transition-all shadow-[0_8px_24px_rgba(255,77,143,0.35)]"
          >
            ✨ Trouver mon Zespot
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ADDRESS INPUT WITH AUTOCOMPLETE
// ═════════════════════════════════════════════════════════════════════

interface Prediction { place_id: string; description: string; main: string; secondary: string }

function AddressInput({
  value,
  placeholder,
  emoji,
  onChange,
}: {
  value: string;
  placeholder: string;
  emoji: string;
  onChange: (v: string) => void;
}) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [focused, setFocused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (v.trim().length < 2) {
      setPredictions([]);
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?input=${encodeURIComponent(v)}`);
        const data = await res.json();
        setPredictions(data.predictions || []);
      } catch {
        setPredictions([]);
      }
    }, 200);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-2 bg-white border-2 border-[#F0E5EA] rounded-[14px] px-3.5 focus-within:border-[#FF4D8F] transition-colors">
        <span className="text-[18px]">{emoji}</span>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          className="flex-1 py-3.5 bg-transparent text-[14px] text-[#1F1B2E] placeholder:text-[#B8A9B3] focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setPredictions([]); }}
            className="text-[#B8A9B3] hover:text-[#6B6275] text-[16px] font-light"
            aria-label="Clear"
          >
            ×
          </button>
        )}
      </div>

      {focused && predictions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#F0E5EA] rounded-[14px] shadow-[0_12px_32px_rgba(0,0,0,0.08)] overflow-hidden z-30">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => {
                onChange(p.description);
                setPredictions([]);
                setFocused(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-[#FFF5F7] border-b border-[#F5EEF2] last:border-b-0 transition-colors"
            >
              <div className="text-[13px] font-semibold text-[#1F1B2E]">{p.main}</div>
              {p.secondary && (
                <div className="text-[11px] text-[#9A8FA3] mt-0.5 truncate">{p.secondary}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// LOADING STEP
// ═════════════════════════════════════════════════════════════════════

function LoadingStep({ step }: { step: number }) {
  return (
    <div className="min-h-screen bg-[#FFF5F7] flex flex-col items-center justify-center px-6 text-[#1F1B2E] relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 40%, #FF4D8F22 0%, transparent 60%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center max-w-[320px] w-full">
        <div className="relative mb-10">
          <div className="w-20 h-20 rounded-full border-4 border-[#FFE4EC] border-t-[#FF4D8F] animate-spin" />
          <div
            className="absolute inset-2 rounded-full border-4 border-transparent border-t-[#10D29B] animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '1.4s' }}
          />
        </div>

        <h2 className="text-[20px] font-bold tracking-[-0.5px] mb-6">Recherche en cours...</h2>

        <div className="w-full space-y-2">
          {LOADING_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-[12px] transition-all ${
                  active ? 'bg-white shadow-sm' : done ? 'opacity-50' : 'opacity-30'
                }`}
              >
                <span className="text-[18px]">{done ? '✅' : s.emoji}</span>
                <span
                  className={`text-[13px] ${active ? 'font-bold text-[#1F1B2E]' : 'text-[#6B6275]'}`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// RESULT STEP
// ═════════════════════════════════════════════════════════════════════

function ResultStep({
  place,
  spotType,
  shareCode,
  shareLoading,
  onReset,
  onNew,
}: {
  place: Place;
  spotType: SpotType;
  shareCode: string;
  shareLoading: boolean;
  onReset: () => void;
  onNew: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;
  const shareUrl = shareCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/beta/spot/${shareCode}`
    : '';

  const handleShare = async () => {
    if (!shareUrl) return;
    const shareData = {
      title: `Zespot : ${place.name}`,
      text: `On se retrouve à ${place.name} ! Spot trouvé avec Zespot.`,
      url: shareUrl,
    };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* user cancelled — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5F7] text-[#1F1B2E] pb-20">
      {/* Celebration header */}
      <div className="relative overflow-hidden pt-12 pb-8 px-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #10D29B77 0%, transparent 70%)' }}
        />
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#10D29B] to-[#0EB588] mb-4 shadow-[0_8px_24px_rgba(16,210,155,0.4)] animate-[pop_0.5s_ease-out]">
            <span className="text-[32px]">🎉</span>
          </div>
          <h1 className="text-[24px] font-bold tracking-[-0.8px] mb-1">
            Félicitations !
          </h1>
          <p className="text-[14px] text-[#6B6275] leading-relaxed">
            Tu viens de créer un Zespot.<br />Partage-le avec tes amis.
          </p>
        </div>
      </div>

      <div className="max-w-[520px] mx-auto px-5 space-y-4">
        {/* Spot card */}
        <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#F0E5EA]">
          {place.photo_reference ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/photo?ref=${encodeURIComponent(place.photo_reference)}&w=800`}
              alt={place.name}
              className="w-full h-[180px] object-cover"
            />
          ) : (
            <div
              className="w-full h-[140px] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FFE4EC 0%, #D6F9EC 100%)' }}
            >
              <span className="text-[60px] opacity-50">{emojiFor(spotType)}</span>
            </div>
          )}
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-[20px] font-bold tracking-[-0.4px] leading-tight">{place.name}</h2>
              {place.rating != null && (
                <span className="flex items-center gap-1 text-[13px] font-bold text-[#1F1B2E] bg-[#FFF5E0] px-2.5 py-1 rounded-full flex-shrink-0">
                  ★ {place.rating.toFixed(1)}
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#6B6275] leading-relaxed">📍 {place.address}</p>
          </div>
        </div>

        {/* Share code */}
        <div className="bg-white rounded-[20px] p-5 border border-[#F0E5EA]">
          <p className="text-[11px] font-bold text-[#10D29B] uppercase tracking-[2px] mb-2">
            Code Zespot
          </p>
          {shareLoading ? (
            <div className="h-8 flex items-center">
              <div className="w-4 h-4 rounded-full border-2 border-[#FFE4EC] border-t-[#FF4D8F] animate-spin" />
            </div>
          ) : shareCode ? (
            <div className="flex items-center justify-between">
              <span className="font-mono font-black text-[28px] tracking-[6px] text-[#1F1B2E]">
                {shareCode}
              </span>
              <button
                onClick={handleShare}
                className="px-4 py-2 bg-[#10D29B] hover:bg-[#0EB588] active:scale-[0.97] text-white text-[13px] font-bold rounded-[12px] transition-all"
              >
                {copied ? '✓ Copié' : 'Partager'}
              </button>
            </div>
          ) : (
            <p className="text-[13px] text-[#9A8FA3]">Code indisponible.</p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-[#FF4D8F] hover:bg-[#ff6aa3] active:scale-[0.98] text-white text-[15px] font-bold rounded-[18px] text-center transition-all shadow-[0_8px_24px_rgba(255,77,143,0.3)] block"
          >
            🗺 Ouvrir dans Google Maps
          </a>
          <button
            onClick={onNew}
            className="w-full py-3.5 bg-white border-2 border-[#F0E5EA] hover:border-[#10D29B] text-[#1F1B2E] text-[14px] font-semibold rounded-[18px] transition-all active:scale-[0.98]"
          >
            Créer un autre Zespot
          </button>
          <button
            onClick={onReset}
            className="w-full py-3 text-[#9A8FA3] text-[13px] font-semibold hover:text-[#6B6275] transition-colors"
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes pop {
          0%   { transform: scale(0.3); opacity: 0; }
          60%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════

function spotTypeLabel(t: SpotType): string {
  return { bar: 'bar', restaurant: 'restaurant', park: 'espace vert', museum: 'musée' }[t];
}

function emojiFor(t: SpotType): string {
  return { bar: '🍺', restaurant: '🍽', park: '🌳', museum: '🏛' }[t];
}
