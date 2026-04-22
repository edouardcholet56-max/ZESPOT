'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AddressItem, LatLng, Place, TransportMode } from '@/lib/types';
import { storage } from '@/lib/storage';
import { haversine, uid, sleep } from '@/lib/utils';

const BetaMap = dynamic(() => import('@/components/BetaMap'), { ssr: false });

type Step = 'geoloc' | 'form-1' | 'form-2' | 'form-3' | 'loading' | 'choose' | 'result';
type SpotType = 'bar' | 'restaurant' | 'park' | 'museum';

const MAX_ADDRESSES = 6;
const MIN_ADDRESSES = 2;

const SPOT_TYPES: { key: SpotType; label: string }[] = [
  { key: 'bar',        label: 'Bar'        },
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'park',       label: 'Parc'       },
  { key: 'museum',     label: 'Musée'      },
];

const MODES: { key: TransportMode; label: string }[] = [
  { key: 'walking',   label: 'À pied'      },
  { key: 'bicycling', label: 'Vélo'        },
  { key: 'transit',   label: 'Transports'  },
  { key: 'driving',   label: 'Voiture'     },
];

const LOADING_STEPS = [
  'Localisation des amis',
  'Point d\u2019équi-temps',
  'Repérage des lieux',
  'Presque là',
];

export default function BetaFindPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('geoloc');
  const [loadingStep, setLoadingStep] = useState(0);

  const [addresses, setAddresses] = useState<AddressItem[]>([
    { id: uid(), value: '' },
    { id: uid(), value: '' },
  ]);
  const [spotType, setSpotType] = useState<SpotType>('bar');
  const [mode, setMode] = useState<TransportMode>('transit');
  const [error, setError] = useState('');

  const [coords, setCoords] = useState<LatLng[]>([]);
  const [midpoint, setMidpoint] = useState<LatLng | null>(null);
  const [candidates, setCandidates] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [result, setResult] = useState<Place | null>(null);
  const [shareCode, setShareCode] = useState<string>('');
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    const saved = storage.myAddress;
    if (saved) {
      setAddresses((prev) => {
        const updated = [...prev];
        updated[0] = { ...updated[0], value: saved, label: 'Moi' };
        return updated;
      });
      setStep('form-1');
    }
    const lastMode = storage.lastMode as TransportMode;
    if (lastMode === 'walking' || lastMode === 'bicycling' || lastMode === 'transit' || lastMode === 'driving') {
      setMode(lastMode);
    }
  }, []);

  // ── Geoloc ──────────────────────────────────────────────────────────
  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setStep('form-1');
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
        } catch { /* silent */ }
        finally { setStep('form-1'); }
      },
      () => setStep('form-1'),
      { timeout: 8000 }
    );
  };

  const updateAddress = (id: string, value: string) => {
    setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, value } : a)));
  };
  const addAddress = () => {
    if (addresses.length >= MAX_ADDRESSES) return;
    setAddresses((prev) => [...prev, { id: uid(), value: '' }]);
  };
  const removeAddress = (id: string) => {
    setAddresses((prev) => (prev.length <= MIN_ADDRESSES ? prev : prev.filter((a) => a.id !== id)));
  };

  const findSpot = async () => {
    const filled = addresses.filter((a) => a.value.trim().length > 0);
    if (filled.length < 2) {
      setError('Il nous faut au moins 2 adresses (toi + 1 ami).');
      return;
    }
    setError('');
    setStep('loading');
    setLoadingStep(0);
    storage.lastMode = mode;

    try {
      const geocoded: LatLng[] = [];
      for (const addr of filled) {
        const res = await fetch(`/api/geocode?address=${encodeURIComponent(addr.value)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Adresse introuvable');
        geocoded.push({ lat: data.lat, lng: data.lng });
      }
      setCoords(geocoded);

      setLoadingStep(1);
      const originsStr = geocoded.map((c) => `${c.lat},${c.lng}`).join('|');
      let mid: LatLng;
      try {
        const eqRes = await fetch(`/api/equidistant?origins=${encodeURIComponent(originsStr)}&mode=${mode}`);
        const eqData = await eqRes.json();
        mid = eqRes.ok && eqData.lat ? { lat: eqData.lat, lng: eqData.lng } : geographicMid(geocoded);
      } catch {
        mid = geographicMid(geocoded);
      }
      setMidpoint(mid);

      setLoadingStep(2);
      let placesRes = await fetch(`/api/places?lat=${mid.lat}&lng=${mid.lng}&radius=800&type=${spotType}`);
      let placesData = await placesRes.json();
      let raw: Omit<Place, 'dist'>[] = placesData.places || [];
      if (raw.length < 4) {
        placesRes = await fetch(`/api/places?lat=${mid.lat}&lng=${mid.lng}&radius=2000&type=${spotType}`);
        placesData = await placesRes.json();
        raw = placesData.places || [];
      }
      if (raw.length < 1) {
        placesRes = await fetch(`/api/places?lat=${mid.lat}&lng=${mid.lng}&radius=5000&type=${spotType}`);
        placesData = await placesRes.json();
        raw = placesData.places || [];
      }
      if (raw.length === 0) throw new Error(`Aucun ${spotTypeLabel(spotType).toLowerCase()} trouvé près du point.`);

      let list: Place[] = raw
        .map((p) => ({ ...p, dist: haversine(mid.lat, mid.lng, p.lat, p.lng) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 10);

      setLoadingStep(3);
      try {
        const destinations = list.map((p) => `${p.lat},${p.lng}`).join('|');
        const ttRes = await fetch(
          `/api/travel-times?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destinations)}&mode=${mode}`
        );
        const ttData = await ttRes.json();
        if (ttData.matrix) {
          list = list.map((p, j) => ({
            ...p,
            travelTimes: ttData.matrix.map((row: (number | null)[]) => row[j]),
          }));
          list.sort((a, b) => {
            const va = (a.travelTimes || []).filter((t): t is number => t !== null);
            const vb = (b.travelTimes || []).filter((t): t is number => t !== null);
            const ma = va.length ? Math.max(...va) : Infinity;
            const mb = vb.length ? Math.max(...vb) : Infinity;
            return ma - mb;
          });
        }
      } catch { /* keep geographic */ }

      await sleep(250);
      setCandidates(list);
      setSelectedId(list[0]?.place_id || null);
      setStep('choose');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setStep('form-1');
    }
  };

  const confirmSpot = async (place: Place) => {
    setResult(place);
    setStep('result');
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
    } catch { /* ignore */ }
    finally { setShareLoading(false); }
  };

  if (step === 'geoloc') return <GeolocStep onAccept={requestGeolocation} onSkip={() => setStep('form-1')} />;
  if (step === 'loading') return <LoadingStep step={loadingStep} />;
  if (step === 'choose' && midpoint) {
    return (
      <ChooseStep
        coords={coords}
        midpoint={midpoint}
        places={candidates}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        spotType={spotType}
        onConfirm={confirmSpot}
        onBack={() => setStep('form-1')}
        mode={mode}
      />
    );
  }
  if (step === 'result' && result) {
    return (
      <ResultStep
        place={result}
        shareCode={shareCode}
        shareLoading={shareLoading}
        onHome={() => router.push('/beta')}
        onNew={() => {
          setResult(null);
          setShareCode('');
          setCandidates([]);
          setCoords([]);
          setMidpoint(null);
          setStep('form-1');
        }}
      />
    );
  }

  if (step === 'form-2') {
    return (
      <FormStepType
        spotType={spotType}
        setSpotType={setSpotType}
        onBack={() => setStep('form-1')}
        onNext={() => setStep('form-3')}
      />
    );
  }

  if (step === 'form-3') {
    return (
      <FormStepMode
        mode={mode}
        setMode={setMode}
        error={error}
        onBack={() => setStep('form-2')}
        onSubmit={findSpot}
      />
    );
  }

  return (
    <FormStepAddresses
      addresses={addresses}
      updateAddress={updateAddress}
      addAddress={addAddress}
      removeAddress={removeAddress}
      error={error}
      onBack={() => router.push('/beta')}
      onNext={() => {
        const filled = addresses.filter((a) => a.value.trim().length > 0);
        if (filled.length < 2) return;
        setStep('form-2');
      }}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════
// GEOLOC STEP
// ═════════════════════════════════════════════════════════════════════

function GeolocStep({ onAccept, onSkip }: { onAccept: () => void; onSkip: () => void }) {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col px-6">
      <header className="pt-6 pb-4 flex items-center justify-between">
        <Link href="/beta" className="text-[12px] uppercase tracking-[0.18em] text-black/50 hover:text-black transition-colors">
          ← Retour
        </Link>
        <span className="text-[12px] uppercase tracking-[0.18em] text-black/50">01 / 03</span>
      </header>

      <hr />

      <main className="flex-1 flex flex-col justify-center py-16 max-w-[380px] w-full mx-auto">
        <p className="text-[11px] uppercase tracking-[0.22em] text-black/40 mb-6 hn-regular">
          Localisation
        </p>
        <h1 className="hn-light text-[46px] leading-[1.05] tracking-[-0.02em] text-black mb-5">
          Où es-tu ?
        </h1>
        <p className="hn-light text-[17px] leading-[1.5] text-black/60">
          Partage ta position — on pré-remplit ton adresse pour t&apos;éviter la saisie.
        </p>
      </main>

      <hr />

      <section className="py-8 space-y-3">
        <button
          onClick={onAccept}
          className="block w-full py-5 bg-black text-white text-[13px] uppercase tracking-[0.18em] rounded-xl hn-bold active:bg-black/80 transition-colors"
        >
          Partager ma position
        </button>
        <button
          onClick={onSkip}
          className="block w-full py-3 text-[12px] uppercase tracking-[0.15em] text-black/50 hover:text-black transition-colors"
        >
          Plus tard
        </button>
      </section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// STEP SHELL — reusable chrome for the three form pages
// ═════════════════════════════════════════════════════════════════════

function StepShell({
  stepNumber,
  onBack,
  children,
  cta,
}: {
  stepNumber: number;
  onBack: () => void;
  children: React.ReactNode;
  cta: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-black pb-28 flex flex-col">
      <header className="sticky top-0 z-20 bg-white">
        <div className="max-w-[520px] mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-[12px] uppercase tracking-[0.18em] text-black/50 hover:text-black transition-colors"
          >
            ← Retour
          </button>
          <h1 className="hn-cond-black text-[20px] leading-none">zespot</h1>
          <span className="text-[12px] uppercase tracking-[0.18em] text-black/50">
            {String(stepNumber).padStart(2, '0')} / 03
          </span>
        </div>
        <hr />
      </header>

      <main className="flex-1 max-w-[520px] mx-auto w-full px-6 pt-10 pb-8 space-y-12">
        {children}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white">
        <hr />
        <div
          className="max-w-[520px] mx-auto px-6 py-5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 20px)' }}
        >
          {cta}
        </div>
      </div>
    </div>
  );
}

function StepHero({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <section>
      <p className="text-[11px] uppercase tracking-[0.22em] text-black/40 mb-4 hn-regular">
        {eyebrow}
      </p>
      <h2 className="hn-light text-[44px] leading-[1.05] tracking-[-0.02em] text-black">
        {title}
      </h2>
    </section>
  );
}

function SectionLabel({ index, title, meta }: { index: string; title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <div className="flex items-baseline gap-3">
        <span className="hn-regular text-[12px] text-black/40">{index}</span>
        <span className="text-[11px] uppercase tracking-[0.18em] text-black/60 hn-regular">{title}</span>
      </div>
      {meta && <span className="text-[11px] uppercase tracking-[0.15em] text-black/40">{meta}</span>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// FORM STEP 1 — ADDRESSES
// ═════════════════════════════════════════════════════════════════════

function FormStepAddresses({
  addresses,
  updateAddress,
  addAddress,
  removeAddress,
  error,
  onBack,
  onNext,
}: {
  addresses: AddressItem[];
  updateAddress: (id: string, value: string) => void;
  addAddress: () => void;
  removeAddress: (id: string) => void;
  error: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const canAdd = addresses.length < MAX_ADDRESSES;
  const filledCount = addresses.filter((a) => a.value.trim().length > 0).length;
  const canAdvance = filledCount >= MIN_ADDRESSES;

  return (
    <StepShell
      stepNumber={1}
      onBack={onBack}
      cta={
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className="w-full py-5 bg-black disabled:bg-black/15 text-white text-[13px] uppercase tracking-[0.18em] rounded-xl hn-bold active:bg-black/80 transition-colors disabled:cursor-not-allowed"
        >
          {canAdvance ? 'Suivant →' : `Ajoute ${MIN_ADDRESSES - filledCount} adresse${MIN_ADDRESSES - filledCount > 1 ? 's' : ''}`}
        </button>
      }
    >
      <StepHero eyebrow="Étape 01" title="Qui vient ?" />

      <section>
        <SectionLabel
          index="01"
          title="Adresses"
          meta={`${addresses.length} / ${MAX_ADDRESSES}`}
        />
        <div className="divide-y divide-black/10 border-y border-black/10">
          {addresses.map((addr, i) => (
            <AddressInput
              key={addr.id}
              value={addr.value}
              placeholder={i === 0 ? 'Ton adresse' : `Ami ${i}`}
              prefix={i === 0 ? 'Toi' : `A${i}`}
              removable={i >= MIN_ADDRESSES}
              onChange={(v) => updateAddress(addr.id, v)}
              onRemove={() => removeAddress(addr.id)}
            />
          ))}
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={addAddress}
            className="mt-4 text-[11px] uppercase tracking-[0.18em] text-black/60 hover:text-black transition-colors"
          >
            + Ajouter une adresse
          </button>
        )}
      </section>

      {error && (
        <div className="border-l-2 border-black pl-4 py-2 text-[13px] text-black/80">
          {error}
        </div>
      )}
    </StepShell>
  );
}

// ═════════════════════════════════════════════════════════════════════
// FORM STEP 2 — SPOT TYPE
// ═════════════════════════════════════════════════════════════════════

function FormStepType({
  spotType,
  setSpotType,
  onBack,
  onNext,
}: {
  spotType: SpotType;
  setSpotType: (t: SpotType) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <StepShell
      stepNumber={2}
      onBack={onBack}
      cta={
        <button
          onClick={onNext}
          className="w-full py-5 bg-black text-white text-[13px] uppercase tracking-[0.18em] rounded-xl hn-bold active:bg-black/80 transition-colors"
        >
          Suivant →
        </button>
      }
    >
      <StepHero eyebrow="Étape 02" title="On va où ?" />

      <section>
        <SectionLabel index="02" title="Ambiance" />
        <div className="border-y border-black/10 divide-y divide-black/10">
          {SPOT_TYPES.map((t) => {
            const active = spotType === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setSpotType(t.key)}
                className="w-full flex items-center justify-between py-4 text-left transition-colors hover:bg-black/[0.02]"
              >
                <span className={`hn-light text-[22px] tracking-[-0.01em] ${active ? 'text-black hn-regular' : 'text-black/70'}`}>
                  {t.label}
                </span>
                <span
                  className={`w-3 h-3 border transition-all ${
                    active ? 'bg-black border-black' : 'border-black/30'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </section>
    </StepShell>
  );
}

// ═════════════════════════════════════════════════════════════════════
// FORM STEP 3 — MODE
// ═════════════════════════════════════════════════════════════════════

function FormStepMode({
  mode,
  setMode,
  error,
  onBack,
  onSubmit,
}: {
  mode: TransportMode;
  setMode: (m: TransportMode) => void;
  error: string;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <StepShell
      stepNumber={3}
      onBack={onBack}
      cta={
        <button
          onClick={onSubmit}
          className="w-full py-5 bg-black text-white text-[13px] uppercase tracking-[0.18em] rounded-xl hn-bold active:bg-black/80 transition-colors"
        >
          Trouver notre spot
        </button>
      }
    >
      <StepHero eyebrow="Étape 03" title="Comment vous venez ?" />

      <section>
        <SectionLabel index="03" title="Transport" />
        <div className="grid grid-cols-2 border-y border-black/10">
          {MODES.map((m, i) => {
            const active = mode === m.key;
            const rightCol = i % 2 === 1;
            const bottomRow = i >= 2;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`py-8 text-[13px] uppercase tracking-[0.15em] transition-colors hn-regular ${
                  rightCol ? 'border-l border-black/10' : ''
                } ${bottomRow ? 'border-t border-black/10' : ''} ${
                  active ? 'bg-black text-white hn-bold' : 'text-black/70 hover:text-black'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="border-l-2 border-black pl-4 py-2 text-[13px] text-black/80">
          {error}
        </div>
      )}
    </StepShell>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ADDRESS INPUT
// ═════════════════════════════════════════════════════════════════════

interface Prediction { place_id: string; description: string; main: string; secondary: string }

function AddressInput({
  value,
  placeholder,
  prefix,
  removable,
  onChange,
  onRemove,
}: {
  value: string;
  placeholder: string;
  prefix: string;
  removable: boolean;
  onChange: (v: string) => void;
  onRemove: () => void;
}) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [focused, setFocused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false);
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
      <div className="flex items-center gap-3 py-3">
        <span className="hn-regular text-[11px] uppercase tracking-[0.14em] text-black/40 w-8 flex-shrink-0">
          {prefix}
        </span>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          className="flex-1 bg-transparent text-[15px] text-black placeholder:text-black/30 focus:outline-none min-w-0 py-1 hn-regular"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setPredictions([]); }}
            className="text-black/30 hover:text-black text-[18px] hn-light px-1"
            aria-label="Effacer"
          >
            ×
          </button>
        )}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] uppercase tracking-[0.15em] text-black/40 hover:text-black transition-colors"
            aria-label="Retirer"
          >
            Retirer
          </button>
        )}
      </div>

      {focused && predictions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-black/10 z-30 shadow-sm">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => {
                onChange(p.description);
                setPredictions([]);
                setFocused(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-black/[0.03] border-b border-black/5 last:border-b-0 transition-colors"
            >
              <div className="text-[13px] text-black hn-regular">{p.main}</div>
              {p.secondary && (
                <div className="text-[11px] text-black/50 mt-0.5 truncate">{p.secondary}</div>
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
    <div className="min-h-screen bg-white text-black flex flex-col px-6">
      <header className="pt-6 pb-4 flex items-center justify-between">
        <span className="text-[12px] uppercase tracking-[0.18em] text-black/50">Recherche</span>
        <span className="text-[12px] uppercase tracking-[0.18em] text-black/50">—</span>
      </header>
      <hr />

      <main className="flex-1 flex flex-col justify-center max-w-[380px] w-full mx-auto">
        <p className="text-[11px] uppercase tracking-[0.22em] text-black/40 mb-5 hn-regular">
          En cours
        </p>
        <h2 className="hn-light text-[44px] leading-[1.05] tracking-[-0.02em] mb-12">
          On trouve ton spot.
        </h2>

        <div className="space-y-0 border-y border-black/10">
          {LOADING_STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div
                key={i}
                className={`flex items-center gap-4 py-4 border-b border-black/10 last:border-b-0 ${
                  active ? '' : done ? 'opacity-60' : 'opacity-30'
                }`}
              >
                <span className="hn-regular text-[12px] text-black/40 w-6">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={`text-[14px] hn-regular ${active ? 'text-black' : 'text-black/70'}`}>
                  {label}
                </span>
                <span className="ml-auto">
                  {done ? (
                    <span className="text-[11px] uppercase tracking-[0.15em] text-black/50">Fait</span>
                  ) : active ? (
                    <span className="inline-block w-3 h-3 border-t border-black animate-spin rounded-full" />
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// CHOOSE STEP
// ═════════════════════════════════════════════════════════════════════

function ChooseStep({
  coords,
  midpoint,
  places,
  selectedId,
  setSelectedId,
  spotType,
  onConfirm,
  onBack,
  mode,
}: {
  coords: LatLng[];
  midpoint: LatLng;
  places: Place[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  spotType: SpotType;
  onConfirm: (p: Place) => void;
  onBack: () => void;
  mode: TransportMode;
}) {
  const selected = places.find((p) => p.place_id === selectedId) || null;
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedId || !listContainerRef.current) return;
    const row = listContainerRef.current.querySelector<HTMLElement>(
      `[data-place-id="${CSS.escape(selectedId)}"]`
    );
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedId]);

  return (
    <div className="bg-white text-black flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      <header className="flex-shrink-0 bg-white">
        <div className="max-w-[520px] mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="text-[12px] uppercase tracking-[0.18em] text-black/50 hover:text-black transition-colors">
            ← Modifier
          </button>
          <h1 className="hn-cond-black text-[18px] leading-none">zespot</h1>
          <span className="text-[12px] uppercase tracking-[0.18em] text-black/50">03 / 03</span>
        </div>
        <hr />
      </header>

      <div className="flex-shrink-0 relative w-full" style={{ height: '32vh', minHeight: 220 }}>
        <BetaMap
          coords={coords}
          midpoint={midpoint}
          places={places}
          selectedPlaceId={selectedId}
          onPlaceSelect={(p) => setSelectedId(p.place_id)}
        />
      </div>

      <hr />

      <div ref={listContainerRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="max-w-[520px] mx-auto px-6 pt-5 pb-4">
          <div className="flex items-baseline justify-between mb-4">
            <div className="flex items-baseline gap-3">
              <span className="hn-regular text-[12px] text-black/40">
                {String(places.length).padStart(2, '0')}
              </span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-black/60 hn-regular">
                {spotTypeLabel(spotType)}s à proximité
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.15em] text-black/40">4+ ★ = top</span>
          </div>

          <div className="border-y border-black/10 divide-y divide-black/10">
            {places.map((p, i) => (
              <SpotListRow
                key={p.place_id}
                place={p}
                rank={i}
                selected={p.place_id === selectedId}
                onClick={() => setSelectedId(p.place_id)}
                mode={mode}
              />
            ))}
          </div>
        </div>
      </div>

      <hr />
      <div
        className="flex-shrink-0 px-6 py-4 bg-white"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 16px)' }}
      >
        <div className="max-w-[520px] mx-auto">
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            className="w-full py-5 bg-black disabled:bg-black/15 text-white text-[13px] uppercase tracking-[0.18em] rounded-xl hn-bold active:bg-black/80 transition-colors disabled:cursor-not-allowed"
          >
            {selected ? <>Choisir {truncate(selected.name, 22)}</> : 'Sélectionne un spot'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SpotListRow({
  place,
  rank,
  selected,
  onClick,
  mode,
}: {
  place: Place;
  rank: number;
  selected: boolean;
  onClick: () => void;
  mode: TransportMode;
}) {
  const isTop = (place.rating ?? 0) >= 4;
  const maxTravel = (place.travelTimes || []).filter((t): t is number => t != null);
  const maxMin = maxTravel.length ? Math.ceil(Math.max(...maxTravel) / 60) : null;
  const modeLabel = MODES.find((m) => m.key === mode)?.label || '';

  return (
    <button
      type="button"
      data-place-id={place.place_id}
      onClick={onClick}
      className={`w-full text-left py-4 transition-colors ${
        selected ? 'bg-black/[0.03]' : 'hover:bg-black/[0.02]'
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="hn-regular text-[12px] text-black/40 w-6 flex-shrink-0 mt-1">
          {String(rank + 1).padStart(2, '0')}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className={`text-[18px] leading-[1.2] tracking-[-0.01em] truncate ${selected ? 'hn-bold' : 'hn-regular'}`}>
              {place.name}
            </h3>
            {isTop && (
              <span className="text-[10px] uppercase tracking-[0.15em] text-black/70 flex-shrink-0 hn-bold">
                Top
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] uppercase tracking-[0.12em] text-black/50">
            {place.rating != null && <span>★ {place.rating.toFixed(1)}</span>}
            {place.user_ratings_total != null && <span>({place.user_ratings_total})</span>}
            {maxMin !== null && <span>· {maxMin} min {modeLabel}</span>}
          </div>
          <p className="text-[11px] text-black/50 mt-2 truncate">{place.address}</p>
        </div>

        <span
          className={`w-3 h-3 flex-shrink-0 mt-1.5 border transition-all ${
            selected ? 'bg-black border-black' : 'border-black/30'
          }`}
        />
      </div>
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════
// RESULT STEP
// ═════════════════════════════════════════════════════════════════════

function ResultStep({
  place,
  shareCode,
  shareLoading,
  onHome,
  onNew,
}: {
  place: Place;
  shareCode: string;
  shareLoading: boolean;
  onHome: () => void;
  onNew: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [timeValue, setTimeValue] = useState<string>('');
  const [timeSaved, setTimeSaved] = useState(false);
  const [timeSaving, setTimeSaving] = useState(false);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;
  const shareUrl = shareCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/beta/spot/${shareCode}`
    : '';

  const saveTime = async (value: string) => {
    if (!shareCode) return;
    setTimeSaving(true);
    setTimeSaved(false);
    try {
      await fetch('/api/spot-share', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: shareCode, time: value || null }),
      });
      setTimeSaved(true);
      setTimeout(() => setTimeSaved(false), 1800);
    } catch { /* ignore */ }
    finally { setTimeSaving(false); }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    const formattedTime = timeValue ? formatDateTime(timeValue) : null;
    const shareText = formattedTime
      ? `RDV à ${place.name}, ${formattedTime}. Spot trouvé avec zespot.`
      : `RDV à ${place.name}. Spot trouvé avec zespot.`;
    const shareData = { title: `zespot — ${place.name}`, text: shareText, url: shareUrl };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share(shareData); return; } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-white text-black pb-20">
      <header className="pt-6 pb-4 px-6 flex items-center justify-between max-w-[520px] mx-auto">
        <button onClick={onHome} className="text-[12px] uppercase tracking-[0.18em] text-black/50 hover:text-black transition-colors">
          ← Accueil
        </button>
        <span className="text-[12px] uppercase tracking-[0.18em] text-black/50">Terminé</span>
      </header>
      <hr />

      <main className="max-w-[520px] mx-auto px-6 pt-10 space-y-12">
        <section>
          <p className="text-[11px] uppercase tracking-[0.22em] text-black/40 mb-4 hn-regular">
            Votre zespot
          </p>
          <h1 className="hn-light text-[42px] leading-[1.05] tracking-[-0.02em]">
            RDV à <span className="hn-regular">{place.name}.</span>
          </h1>
          <p className="text-[13px] text-black/60 mt-3 leading-relaxed hn-regular">{place.address}</p>
        </section>

        {place.photo_reference ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photo?ref=${encodeURIComponent(place.photo_reference)}&w=800`}
            alt={place.name}
            className="w-full h-[200px] object-cover"
          />
        ) : (
          <div className="w-full h-[160px] border border-black/10 flex items-center justify-center">
            <span className="hn-cond-black text-[24px] text-black/30">zespot</span>
          </div>
        )}

        {place.rating != null && (
          <div className="flex items-center gap-4 text-[11px] uppercase tracking-[0.15em] text-black/60">
            <span>★ {place.rating.toFixed(1)}</span>
            {place.user_ratings_total != null && <span>{place.user_ratings_total} avis</span>}
          </div>
        )}

        <hr />

        {/* Share code */}
        <section>
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/60 mb-4 hn-regular">
            01 · Code de partage
          </p>
          {shareLoading ? (
            <div className="h-12 flex items-center">
              <span className="inline-block w-4 h-4 border-t border-black animate-spin rounded-full" />
            </div>
          ) : shareCode ? (
            <div className="flex items-baseline justify-between gap-4">
              <span className="hn-bold text-[44px] tracking-[0.08em] leading-none">
                {shareCode}
              </span>
              <button
                onClick={handleShare}
                className="text-[11px] uppercase tracking-[0.18em] text-black hover:text-black/60 transition-colors hn-bold"
              >
                {copied ? 'Copié ✓' : 'Partager →'}
              </button>
            </div>
          ) : (
            <p className="text-[13px] text-black/50">Code indisponible.</p>
          )}
        </section>

        <hr />

        {/* Time picker */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/60 hn-regular">
              02 · Heure du RDV <span className="text-black/40 normal-case tracking-normal">(optionnel)</span>
            </p>
            {timeSaving && <span className="text-[10px] uppercase tracking-[0.15em] text-black/40">Enreg.</span>}
            {!timeSaving && timeSaved && <span className="text-[10px] uppercase tracking-[0.15em] text-black">Enregistré ✓</span>}
          </div>

          <label className="block">
            <input
              type="datetime-local"
              value={timeValue}
              onChange={(e) => {
                setTimeValue(e.target.value);
                if (e.target.value) saveTime(e.target.value);
              }}
              className="w-full bg-transparent border-0 border-b border-black/20 py-3 text-[20px] tracking-[-0.01em] text-black focus:outline-none focus:border-black transition-colors hn-light"
            />
          </label>
          {timeValue && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-[12px] text-black/60 hn-regular">
                {formatDateTime(timeValue)}
              </p>
              <button
                onClick={() => { setTimeValue(''); saveTime(''); }}
                className="text-[10px] uppercase tracking-[0.15em] text-black/40 hover:text-black transition-colors"
              >
                Effacer
              </button>
            </div>
          )}
          {!timeValue && (
            <p className="text-[11px] text-black/40 mt-3 hn-light">
              Choisis une date — on l&apos;ajoute à l&apos;invitation.
            </p>
          )}
        </section>

        <hr />

        {/* Actions */}
        <section className="space-y-3">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-5 bg-black text-white text-[13px] uppercase tracking-[0.18em] text-center rounded-xl hn-bold active:bg-black/80 transition-colors"
          >
            Ouvrir dans Google Maps
          </a>
          <button
            onClick={onNew}
            className="block w-full py-4 border border-black rounded-xl text-black text-[12px] uppercase tracking-[0.18em] hover:bg-black hover:text-white transition-colors hn-bold"
          >
            Créer un autre spot
          </button>
          <Link
            href="/beta/mes-spots"
            className="block w-full py-3 text-[11px] uppercase tracking-[0.15em] text-black/50 hover:text-black text-center transition-colors"
          >
            Tous mes spots →
          </Link>
        </section>
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════

function spotTypeLabel(t: SpotType): string {
  return { bar: 'Bar', restaurant: 'Restaurant', park: 'Parc', museum: 'Musée' }[t];
}
function geographicMid(coords: LatLng[]): LatLng {
  return {
    lat: coords.reduce((s, c) => s + c.lat, 0) / coords.length,
    lng: coords.reduce((s, c) => s + c.lng, 0) / coords.length,
  };
}
function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
function formatDateTime(value: string): string {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('fr-FR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}
