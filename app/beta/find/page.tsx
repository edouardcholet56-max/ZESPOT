'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AddressItem, LatLng, Place, TransportMode } from '@/lib/types';
import { storage } from '@/lib/storage';
import { haversine, uid, sleep } from '@/lib/utils';

const BetaMap = dynamic(() => import('@/components/BetaMap'), { ssr: false });

type Step = 'geoloc' | 'form' | 'loading' | 'choose' | 'result';
type SpotType = 'bar' | 'restaurant' | 'park' | 'museum';

const MAX_ADDRESSES = 6;
const MIN_ADDRESSES = 2;

const SPOT_TYPES: { key: SpotType; label: string }[] = [
  { key: 'bar',        label: 'Bar'        },
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'park',       label: 'Park'       },
  { key: 'museum',     label: 'Museum'     },
];

const MODES: { key: TransportMode; label: string }[] = [
  { key: 'walking',   label: 'Walk'    },
  { key: 'bicycling', label: 'Bike'    },
  { key: 'transit',   label: 'Transit' },
  { key: 'driving',   label: 'Drive'   },
];

const LOADING_STEPS = [
  'Pinning friends',
  'Computing equal-time midpoint',
  'Scouting venues',
  'Almost there',
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
        updated[0] = { ...updated[0], value: saved, label: 'Me' };
        return updated;
      });
      setStep('form');
    }
    const lastMode = storage.lastMode as TransportMode;
    if (lastMode === 'walking' || lastMode === 'bicycling' || lastMode === 'transit' || lastMode === 'driving') {
      setMode(lastMode);
    }
  }, []);

  // ── Geoloc ──────────────────────────────────────────────────────────
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
              updated[0] = { ...updated[0], value: data.address, label: 'Me' };
              return updated;
            });
          }
        } catch { /* silent */ }
        finally { setStep('form'); }
      },
      () => setStep('form'),
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
      setError('We need at least 2 addresses (you + 1 friend).');
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
        if (!res.ok) throw new Error(data.error || 'Address not found');
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
      if (raw.length === 0) throw new Error(`No ${spotTypeLabel(spotType).toLowerCase()} found nearby.`);

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
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStep('form');
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

  if (step === 'geoloc') return <GeolocStep onAccept={requestGeolocation} onSkip={() => setStep('form')} />;
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
        onBack={() => setStep('form')}
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
          setStep('form');
        }}
      />
    );
  }

  return (
    <FormStep
      addresses={addresses}
      updateAddress={updateAddress}
      addAddress={addAddress}
      removeAddress={removeAddress}
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
    <div className="min-h-screen bg-[#F5F2EE] text-black flex flex-col px-6">
      <header className="pt-6 pb-4 flex items-center justify-between">
        <Link href="/beta" className="text-[11px] uppercase tracking-[0.2em] text-black/50 hover:text-black transition-colors">
          ← Back
        </Link>
        <span className="text-[11px] uppercase tracking-[0.2em] text-black/50">Step 1 / 3</span>
      </header>

      <hr />

      <main className="flex-1 flex flex-col justify-center py-16 max-w-[380px] w-full mx-auto">
        <p className="text-[11px] uppercase tracking-[0.25em] text-black/50 mb-5">Location</p>
        <h1 className="font-serif text-[52px] leading-[1] tracking-[-0.03em] mb-6">
          Where <span className="italic">are</span> you?
        </h1>
        <p className="font-serif text-[19px] leading-[1.4] text-black/70 mb-12">
          Share your location — we&apos;ll pre-fill your address so you can <span className="italic">skip the typing.</span>
        </p>
      </main>

      <hr />

      <section className="py-8 space-y-3">
        <button
          onClick={onAccept}
          className="block w-full py-5 bg-[#D13631] text-white text-[13px] uppercase tracking-[0.18em] text-center active:bg-black transition-colors"
        >
          Share my location
        </button>
        <button
          onClick={onSkip}
          className="block w-full py-3 text-[12px] uppercase tracking-[0.15em] text-black/50 hover:text-black transition-colors"
        >
          Later
        </button>
      </section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// FORM STEP
// ═════════════════════════════════════════════════════════════════════

function FormStep({
  addresses,
  updateAddress,
  addAddress,
  removeAddress,
  spotType,
  setSpotType,
  mode,
  setMode,
  error,
  onSubmit,
}: {
  addresses: AddressItem[];
  updateAddress: (id: string, value: string) => void;
  addAddress: () => void;
  removeAddress: (id: string) => void;
  spotType: SpotType;
  setSpotType: (t: SpotType) => void;
  mode: TransportMode;
  setMode: (m: TransportMode) => void;
  error: string;
  onSubmit: () => void;
}) {
  const canAdd = addresses.length < MAX_ADDRESSES;

  return (
    <div className="min-h-screen bg-[#F5F2EE] text-black pb-28">
      <header className="sticky top-0 z-20 bg-[#F5F2EE]">
        <div className="max-w-[520px] mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
          <Link href="/beta" className="text-[11px] uppercase tracking-[0.2em] text-black/50 hover:text-black transition-colors">
            ← Back
          </Link>
          <h1 className="font-serif text-[18px] tracking-[-0.01em]">
            <span className="italic">Ze</span>Spot
          </h1>
          <span className="text-[11px] uppercase tracking-[0.2em] text-black/50">2 / 3</span>
        </div>
        <hr />
      </header>

      <main className="max-w-[520px] mx-auto px-6 pt-10 space-y-14">
        {/* Hero title */}
        <section>
          <p className="text-[11px] uppercase tracking-[0.25em] text-black/50 mb-4">Your meetup</p>
          <h2 className="font-serif text-[44px] leading-[1] tracking-[-0.03em]">
            Who&apos;s <span className="italic">coming?</span>
          </h2>
        </section>

        {/* Addresses */}
        <section>
          <SectionLabel index="01" title="Addresses" meta={`${addresses.length} / ${MAX_ADDRESSES}`} />
          <div className="divide-y divide-black/10 border-y border-black/10">
            {addresses.map((addr, i) => (
              <AddressInput
                key={addr.id}
                value={addr.value}
                placeholder={i === 0 ? 'Your address' : `Friend ${i}`}
                prefix={i === 0 ? 'You' : `F${i}`}
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
              className="mt-4 text-[11px] uppercase tracking-[0.18em] text-black/60 hover:text-[#D13631] transition-colors"
            >
              + Add address
            </button>
          )}
        </section>

        {/* Spot type */}
        <section>
          <SectionLabel index="02" title="Where to" />
          <div className="border-y border-black/10 divide-y divide-black/10">
            {SPOT_TYPES.map((t) => {
              const active = spotType === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setSpotType(t.key)}
                  className="w-full flex items-center justify-between py-4 text-left transition-colors hover:bg-black/[0.02]"
                >
                  <span
                    className={`font-serif text-[22px] tracking-[-0.01em] ${active ? 'text-[#D13631]' : 'text-black'}`}
                  >
                    {active ? <span className="italic">{t.label}</span> : t.label}
                  </span>
                  <span
                    className={`w-3 h-3 border transition-all ${
                      active ? 'bg-[#D13631] border-[#D13631]' : 'border-black/30'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* Mode */}
        <section>
          <SectionLabel index="03" title="How you travel" />
          <div className="grid grid-cols-4 border-y border-black/10">
            {MODES.map((m, i) => {
              const active = mode === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`py-5 text-[11px] uppercase tracking-[0.15em] transition-colors ${
                    i > 0 ? 'border-l border-black/10' : ''
                  } ${active ? 'bg-black text-white' : 'text-black/70 hover:text-black'}`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </section>

        {error && (
          <div className="border-l-2 border-[#D13631] pl-4 py-2 text-[13px] text-[#D13631]">
            {error}
          </div>
        )}
      </main>

      {/* CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#F5F2EE] z-30">
        <hr />
        <div className="px-6 py-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 20px)' }}>
          <button
            onClick={onSubmit}
            className="w-full py-5 bg-[#D13631] text-white text-[13px] uppercase tracking-[0.18em] active:bg-black transition-colors"
          >
            Find our spot
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ index, title, meta }: { index: string; title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <div className="flex items-baseline gap-3">
        <span className="font-serif italic text-[13px] text-black/40">{index}</span>
        <span className="text-[11px] uppercase tracking-[0.2em] text-black/60">{title}</span>
      </div>
      {meta && <span className="text-[11px] uppercase tracking-[0.15em] text-black/40">{meta}</span>}
    </div>
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
        <span className="font-serif italic text-[12px] text-black/40 w-7 flex-shrink-0">{prefix}</span>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          className="flex-1 bg-transparent text-[15px] text-black placeholder:text-black/30 focus:outline-none min-w-0 py-1"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setPredictions([]); }}
            className="text-black/30 hover:text-black text-[18px] font-light px-1"
            aria-label="Clear"
          >
            ×
          </button>
        )}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] uppercase tracking-[0.15em] text-black/40 hover:text-[#D13631] transition-colors"
            aria-label="Remove"
          >
            Remove
          </button>
        )}
      </div>

      {focused && predictions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-black/10 z-30">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => {
                onChange(p.description);
                setPredictions([]);
                setFocused(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-[#F5F2EE] border-b border-black/5 last:border-b-0 transition-colors"
            >
              <div className="text-[13px] text-black">{p.main}</div>
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
    <div className="min-h-screen bg-[#F5F2EE] text-black flex flex-col px-6">
      <header className="pt-6 pb-4 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.2em] text-black/50">Finding</span>
        <span className="text-[11px] uppercase tracking-[0.2em] text-black/50">—</span>
      </header>
      <hr />

      <main className="flex-1 flex flex-col justify-center max-w-[380px] w-full mx-auto">
        <p className="text-[11px] uppercase tracking-[0.25em] text-black/50 mb-5">Working</p>
        <h2 className="font-serif text-[42px] leading-[1] tracking-[-0.03em] mb-12">
          Finding your <span className="italic">spot</span>.
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
                <span className="font-serif italic text-[13px] text-black/40 w-6">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={`text-[14px] ${active ? 'text-black' : 'text-black/70'}`}>
                  {label}
                </span>
                <span className="ml-auto">
                  {done ? (
                    <span className="text-[11px] uppercase tracking-[0.15em] text-black/50">Done</span>
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

  return (
    <div className="bg-[#F5F2EE] text-black flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      <header className="flex-shrink-0 bg-[#F5F2EE]">
        <div className="max-w-[520px] mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="text-[11px] uppercase tracking-[0.2em] text-black/50 hover:text-black transition-colors">
            ← Edit
          </button>
          <h1 className="font-serif text-[16px] tracking-[-0.01em]">
            Pick your <span className="italic">spot</span>
          </h1>
          <span className="text-[11px] uppercase tracking-[0.2em] text-black/50">3 / 3</span>
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

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="max-w-[520px] mx-auto px-6 pt-5 pb-4">
          <div className="flex items-baseline justify-between mb-4">
            <div className="flex items-baseline gap-3">
              <span className="font-serif italic text-[13px] text-black/40">
                {String(places.length).padStart(2, '0')}
              </span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-black/60">
                {spotTypeLabel(spotType)}s nearby
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
        className="flex-shrink-0 px-6 py-4 bg-[#F5F2EE]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 16px)' }}
      >
        <div className="max-w-[520px] mx-auto">
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            className="w-full py-5 bg-[#D13631] disabled:bg-black/20 text-white text-[13px] uppercase tracking-[0.18em] active:bg-black transition-colors disabled:cursor-not-allowed"
          >
            {selected ? <>Choose {truncate(selected.name, 22)}</> : 'Select a spot'}
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
      onClick={onClick}
      className={`w-full text-left py-4 transition-colors ${
        selected ? 'bg-white' : 'hover:bg-black/[0.02]'
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="font-serif italic text-[13px] text-black/40 w-6 flex-shrink-0 mt-1">
          {String(rank + 1).padStart(2, '0')}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className={`font-serif text-[20px] leading-[1.15] tracking-[-0.01em] truncate ${selected ? 'text-[#D13631]' : ''}`}>
              {selected ? <span className="italic">{place.name}</span> : place.name}
            </h3>
            {isTop && (
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#D13631] flex-shrink-0">
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
            selected ? 'bg-[#D13631] border-[#D13631]' : 'border-black/30'
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
  const [timeValue, setTimeValue] = useState<string>(''); // datetime-local
  const [timeSaved, setTimeSaved] = useState(false);
  const [timeSaving, setTimeSaving] = useState(false);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;
  const shareUrl = shareCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/beta/spot/${shareCode}`
    : '';

  // Save time to the share record (debounced on user confirm)
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
      ? `Let's meet at ${place.name}, ${formattedTime}. Spot found with ZeSpot.`
      : `Let's meet at ${place.name}. Spot found with ZeSpot.`;
    const shareData = { title: `ZeSpot — ${place.name}`, text: shareText, url: shareUrl };
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
    <div className="min-h-screen bg-[#F5F2EE] text-black pb-20">
      <header className="pt-6 pb-4 px-6 flex items-center justify-between max-w-[520px] mx-auto">
        <button onClick={onHome} className="text-[11px] uppercase tracking-[0.2em] text-black/50 hover:text-black transition-colors">
          ← Home
        </button>
        <span className="text-[11px] uppercase tracking-[0.2em] text-black/50">Done</span>
      </header>
      <hr />

      <main className="max-w-[520px] mx-auto px-6 pt-10 space-y-12">
        <section>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#D13631] mb-4">
            Your ZeSpot
          </p>
          <h1 className="font-serif text-[42px] leading-[1.02] tracking-[-0.03em]">
            Meet at <span className="italic">{place.name}.</span>
          </h1>
          <p className="text-[13px] text-black/60 mt-3 leading-relaxed">{place.address}</p>
        </section>

        {/* Photo */}
        {place.photo_reference ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photo?ref=${encodeURIComponent(place.photo_reference)}&w=800`}
            alt={place.name}
            className="w-full h-[200px] object-cover"
          />
        ) : (
          <div className="w-full h-[160px] border border-black/10 flex items-center justify-center">
            <span className="font-serif italic text-[24px] text-black/30">ZeSpot</span>
          </div>
        )}

        {/* Rating */}
        {place.rating != null && (
          <div className="flex items-center gap-4 text-[11px] uppercase tracking-[0.15em] text-black/60">
            <span>★ {place.rating.toFixed(1)}</span>
            {place.user_ratings_total != null && <span>{place.user_ratings_total} reviews</span>}
          </div>
        )}

        <hr />

        {/* Share code */}
        <section>
          <p className="text-[11px] uppercase tracking-[0.2em] text-black/60 mb-4">
            01 · Share code
          </p>
          {shareLoading ? (
            <div className="h-12 flex items-center">
              <span className="inline-block w-4 h-4 border-t border-black animate-spin rounded-full" />
            </div>
          ) : shareCode ? (
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-serif text-[44px] tracking-[0.1em] leading-none">
                {shareCode}
              </span>
              <button
                onClick={handleShare}
                className="text-[11px] uppercase tracking-[0.18em] text-[#D13631] hover:text-black transition-colors"
              >
                {copied ? 'Copied ✓' : 'Share →'}
              </button>
            </div>
          ) : (
            <p className="text-[13px] text-black/50">Code unavailable.</p>
          )}
        </section>

        <hr />

        {/* Time picker (optional) */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-black/60">
              02 · Meeting time <span className="text-black/40 normal-case tracking-normal">(optional)</span>
            </p>
            {timeSaving && <span className="text-[10px] uppercase tracking-[0.15em] text-black/40">Saving…</span>}
            {!timeSaving && timeSaved && <span className="text-[10px] uppercase tracking-[0.15em] text-[#D13631]">Saved ✓</span>}
          </div>

          <label className="block">
            <input
              type="datetime-local"
              value={timeValue}
              onChange={(e) => {
                setTimeValue(e.target.value);
                if (e.target.value) saveTime(e.target.value);
              }}
              className="w-full bg-transparent border-0 border-b border-black/20 py-3 font-serif text-[20px] tracking-[-0.01em] text-black focus:outline-none focus:border-[#D13631] transition-colors"
              style={{ fontFamily: 'var(--font-serif)' }}
            />
          </label>
          {timeValue && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-[12px] text-black/60 italic font-serif">
                {formatDateTime(timeValue)}
              </p>
              <button
                onClick={() => { setTimeValue(''); saveTime(''); }}
                className="text-[10px] uppercase tracking-[0.15em] text-black/40 hover:text-[#D13631] transition-colors"
              >
                Clear
              </button>
            </div>
          )}
          {!timeValue && (
            <p className="text-[11px] text-black/40 mt-3 italic font-serif">
              Pick a date & time — we&apos;ll include it in the invite.
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
            className="block w-full py-5 bg-[#D13631] text-white text-[13px] uppercase tracking-[0.18em] text-center active:bg-black transition-colors"
          >
            Open in Google Maps
          </a>
          <button
            onClick={onNew}
            className="block w-full py-4 border border-black/20 text-black text-[12px] uppercase tracking-[0.18em] hover:border-black transition-colors"
          >
            Create another
          </button>
          <Link
            href="/beta/mes-spots"
            className="block w-full py-3 text-[11px] uppercase tracking-[0.15em] text-black/50 hover:text-black text-center transition-colors"
          >
            All my spots →
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
  return { bar: 'Bar', restaurant: 'Restaurant', park: 'Park', museum: 'Museum' }[t];
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
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}
