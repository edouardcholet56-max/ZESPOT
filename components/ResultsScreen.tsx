'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { LatLng, Place, TransportMode } from '@/lib/types';
import { storage } from '@/lib/storage';
import SpotCard from './SpotCard';

const MapView = dynamic(() => import('./Map'), { ssr: false });

interface Props {
  coords: (LatLng & { formatted: string })[];
  midpoint: LatLng;
  places: Place[];
  mode: TransportMode;
  onBack: () => void;
}

const PRICE = ['', '€', '€€', '€€€', '€€€€'];
const MODE_ICON: Record<TransportMode, string> = {
  walking: '🚶', bicycling: '🚲', transit: '🚇',
};
const MODE_LABEL: Record<TransportMode, string> = {
  walking: 'À pied', bicycling: 'Vélo', transit: 'Transit',
};

function formatTime(seconds: number | null | undefined): string {
  if (seconds == null) return '?';
  return `${Math.round(seconds / 60)} min`;
}

// ── Confetti ──────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#FF6B2C', '#FFD700', '#FF453A', '#30D158', '#0A84FF', '#BF5AF2', '#FF375F', '#fff'];

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: {
      x: number; y: number; vx: number; vy: number;
      color: string; size: number; rot: number; rotV: number; life: number;
    }[] = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 14,
        vy: -(Math.random() * 12 + 4),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: Math.random() * 7 + 4,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.3,
        life: 1,
      });
    }

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.rot += p.rotV; p.life -= 0.012;
        if (p.life <= 0) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        ctx.restore();
      }
      if (alive) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10000 }}
    />
  );
}

// ── Success overlay ───────────────────────────────────────────────

function SuccessOverlay({ place, onDone }: { place: Place; onDone: () => void }) {
  const router = useRouter();
  const [checkVisible, setCheckVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [time, setTime] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;

  // Persist time changes live as the user types
  const saveTime = useCallback((t: string) => {
    const existing = storage.chosenZespots as { id: string; meetingTime?: string }[];
    const updated = existing.map((z) =>
      z.id === place.place_id ? { ...z, meetingTime: t || undefined } : z
    );
    storage.setChosenZespots(updated);
  }, [place.place_id]);

  const handleTimeChange = (t: string) => {
    setTime(t);
    saveTime(t);
  };

  useEffect(() => {
    const zespot = {
      id: place.place_id,
      name: place.name,
      address: place.address,
      rating: place.rating,
      photo_reference: place.photo_reference || place.photo_references?.[0],
      chosenAt: new Date().toISOString(),
      meetingTime: undefined as string | undefined,
    };
    const existing = storage.chosenZespots as typeof zespot[];
    const filtered = existing.filter((z) => z.id !== zespot.id);
    storage.setChosenZespots([zespot, ...filtered].slice(0, 20));

    fetch('/api/spot-share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spot: place }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.code) setCode(d.code); })
      .catch(() => {});

    const t1 = setTimeout(() => setCheckVisible(true), 100);
    const t2 = setTimeout(() => setContentVisible(true), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [place]);

  const handleShare = async () => {
    const timeStr = time ? ` · ${time}` : '';
    const shareUrl = code ? `${window.location.origin}/spot/${code}` : mapsUrl;
    const text = `On se retrouve au ${place.name}${timeStr} 🍺\n📍 ${place.address}`;
    if (canShare) {
      try { await navigator.share({ title: `ZESP0T — ${place.name}`, text, url: shareUrl }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(`${text}\n🔗 ${shareUrl}`); } catch { /* fallback */ }
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); } catch { /* fallback */ }
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-[#0A0A0A]" />
      <ConfettiCanvas />

      <div className="relative z-10 flex flex-col items-center w-full max-w-[430px] px-7 mx-auto">
        {/* Checkmark */}
        <div
          style={{
            opacity: checkVisible ? 1 : 0,
            transform: checkVisible ? 'scale(1)' : 'scale(0.3)',
            transition: 'opacity 0.5s cubic-bezier(0.34,1.56,0.64,1), transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}
          className="w-[90px] h-[90px] rounded-full bg-[#FF6B2C] flex items-center justify-center shadow-[0_0_60px_rgba(255,107,44,0.5)] mb-5"
        >
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
            <path d="M10 24l10 10L38 14" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="50"
              strokeDashoffset={checkVisible ? 0 : 50}
              style={{ transition: 'stroke-dashoffset 0.5s ease 0.3s' }}
            />
          </svg>
        </div>

        <div
          className="text-center w-full"
          style={{
            opacity: contentVisible ? 1 : 0,
            transform: contentVisible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
          }}
        >
          <p className="text-[11px] text-[#FF6B2C] font-semibold tracking-[2.5px] uppercase mb-2">Zespot choisi !</p>
          <h2 className="text-[22px] font-bold tracking-[-0.5px] leading-tight mb-1">{place.name}</h2>
          <p className="text-[11px] text-[#555] mb-5">{place.address}</p>

          {/* Time picker */}
          <div className="flex items-center gap-3 bg-[#141414] border border-[#222] rounded-[14px] px-4 py-3 mb-4 text-left">
            <span className="text-[18px] flex-shrink-0">🕐</span>
            <div className="flex-1">
              <p className="text-[10px] text-[#444] uppercase tracking-[1px] mb-0.5">Heure du RDV</p>
              <input
                type="time"
                value={time}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="bg-transparent text-white text-[14px] font-semibold outline-none w-full"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            {time && (
              <button onClick={() => handleTimeChange('')} className="text-[#444] text-[18px] flex-shrink-0 hover:text-[#888]">×</button>
            )}
          </div>

          {/* Share code */}
          {code && (
            <button
              onClick={copyCode}
              className="w-full flex items-center gap-3 bg-[rgba(255,107,44,0.08)] border border-[rgba(255,107,44,0.2)] rounded-[14px] px-4 py-3.5 mb-4 transition-all hover:border-[rgba(255,107,44,0.4)] active:scale-[0.98]"
            >
              <div className="flex-1 text-left">
                <p className="text-[10px] text-[#FF6B2C] uppercase tracking-[1px] mb-0.5">Code à partager</p>
                <p className="text-[22px] font-bold tracking-[6px] text-white font-mono">{code}</p>
              </div>
              <span className="text-[12px] text-[#FF6B2C] font-medium flex-shrink-0">
                {codeCopied ? '✓ Copié' : 'Copier'}
              </span>
            </button>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2.5 w-full">
            <button
              onClick={handleShare}
              className="w-full py-4 bg-[#FF6B2C] text-white text-[14px] font-semibold rounded-[14px] transition-all hover:bg-[#ff7d45] active:scale-[0.98]"
            >
              {linkCopied ? '✓ Copié !' : canShare ? '↗ Partager avec des amis' : '📋 Copier'}
            </button>
            <div className="flex gap-2.5">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 bg-[#141414] border border-[#222] text-white text-[13px] font-semibold rounded-[14px] text-center transition-all hover:border-[#3A3A3A] active:scale-[0.98]"
              >
                🗺 Maps
              </a>
              <button
                onClick={() => router.push('/evenements?view=create')}
                className="flex-1 py-3.5 bg-[#141414] border border-[#222] text-white text-[13px] font-semibold rounded-[14px] transition-all hover:border-[#3A3A3A] active:scale-[0.98]"
              >
                🎉 Événement
              </button>
            </div>
            <button
              onClick={onDone}
              className="w-full py-2 text-[#444] text-[12px] transition-all hover:text-[#666]"
            >
              Retour à la liste
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Spot detail bottom sheet ──────────────────────────────────────

const ALL_MODES: TransportMode[] = ['walking', 'bicycling', 'transit'];

function SpotDetailSheet({
  place, mode, rank, coords, onClose, onChoose,
}: {
  place: Place; mode: TransportMode; rank: number;
  coords: (LatLng & { formatted: string })[];
  onClose: () => void; onChoose: () => void;
}) {
  const [activePhoto, setActivePhoto] = useState(0);
  const [activeMode, setActiveMode] = useState<TransportMode>(mode);
  const [allModeTimes, setAllModeTimes] = useState<Partial<Record<TransportMode, (number | null)[]>>>({});
  const [loadingModes, setLoadingModes] = useState(false);

  const photos = place.photo_references?.length
    ? place.photo_references
    : place.photo_reference
    ? [place.photo_reference]
    : [];

  const [imgErrors, setImgErrors] = useState<boolean[]>([false, false, false]);
  const markError = (i: number) => setImgErrors((prev) => { const n = [...prev]; n[i] = true; return n; });

  // Seed with the already-fetched times for the current mode
  useEffect(() => {
    if (place.travelTimes && place.travelTimes.length > 0) {
      setAllModeTimes({ [mode]: place.travelTimes });
    }
  }, [place, mode]);

  // Fetch travel times for all 3 modes in parallel
  useEffect(() => {
    if (coords.length === 0) return;
    setLoadingModes(true);
    const origins = coords.map((c) => `${c.lat},${c.lng}`).join('|');
    const dest = `${place.lat},${place.lng}`;

    Promise.all(
      ALL_MODES.map(async (m) => {
        try {
          const res = await fetch(
            `/api/travel-times?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(dest)}&mode=${m}`
          );
          const data = await res.json();
          if (data.matrix) {
            const times = data.matrix.map((row: (number | null)[]) => row[0]);
            return [m, times] as [TransportMode, (number | null)[]];
          }
        } catch { /* ignore */ }
        return null;
      })
    ).then((results) => {
      const merged: Partial<Record<TransportMode, (number | null)[]>> = {};
      for (const r of results) {
        if (r) merged[r[0]] = r[1];
      }
      setAllModeTimes(merged);
      setLoadingModes(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.place_id]);

  const currentTimes = allModeTimes[activeMode] ?? place.travelTimes ?? [];
  const hasTimes = currentTimes.length > 0;
  const maxTime = hasTimes
    ? Math.max(...currentTimes.filter((t): t is number => t !== null))
    : null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination_place_id=${place.place_id}&travelmode=${activeMode === 'bicycling' ? 'bicycling' : activeMode === 'walking' ? 'walking' : 'transit'}`;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-[#0F0F0F] rounded-t-[24px] overflow-hidden"
        style={{ boxShadow: '0 -20px 60px rgba(0,0,0,0.8)', maxHeight: '92vh' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#333] rounded-full" />
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 20px)' }}>
          {/* Photos */}
          <div className="relative w-full h-[220px]">
            {photos.length > 0 && !imgErrors[activePhoto] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={activePhoto}
                src={`/api/photo?ref=${encodeURIComponent(photos[activePhoto])}&w=800`}
                alt={place.name}
                className="w-full h-full object-cover"
                loading="eager"
                onError={() => markError(activePhoto)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1C1C1C] to-[#0F0F0F] flex items-center justify-center">
                <span className="text-[60px] opacity-20">🍺</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white text-[16px] backdrop-blur-sm"
            >×</button>
            <div className={`absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shadow-lg ${rank === 1 ? 'bg-[#FF6B2C] text-white' : 'bg-black/60 text-white backdrop-blur-sm'}`}>
              {rank}
            </div>
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => (
                  <button key={i} onClick={() => setActivePhoto(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === activePhoto ? 'bg-white scale-125' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="px-5 pt-4 pb-6">
            {/* Name + status */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-[22px] font-bold tracking-[-0.5px] leading-tight flex-1">{place.name}</h2>
              {place.open_now != null && (
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full mt-1 flex-shrink-0 ${place.open_now ? 'bg-[rgba(46,213,115,0.15)] text-[#2ed573]' : 'bg-[rgba(255,69,58,0.15)] text-[#FF453A]'}`}>
                  {place.open_now ? 'Ouvert' : 'Fermé'}
                </span>
              )}
            </div>

            {/* Address + Maps link */}
            <div className="flex items-start gap-2 mb-4">
              <span className="text-[14px] mt-0.5 flex-shrink-0">📍</span>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="text-[13px] text-[#888] leading-relaxed hover:text-[#FF6B2C] transition-colors flex-1">
                {place.address}
              </a>
            </div>

            {/* Stats */}
            <div className="flex gap-2.5 mb-5">
              {place.rating != null && (
                <div className="flex-1 bg-[#161616] border border-[#222] rounded-[12px] p-3 text-center">
                  <p className="text-[17px] font-bold text-[#FFD700]">★ {place.rating.toFixed(1)}</p>
                  <p className="text-[10px] text-[#444] mt-0.5">{place.user_ratings_total ? `${place.user_ratings_total} avis` : 'Note'}</p>
                </div>
              )}
              {place.price_level != null && (
                <div className="flex-1 bg-[#161616] border border-[#222] rounded-[12px] p-3 text-center">
                  <p className="text-[17px] font-bold text-[#FF6B2C]">{PRICE[place.price_level]}</p>
                  <p className="text-[10px] text-[#444] mt-0.5">Budget</p>
                </div>
              )}
              <div className="flex-1 bg-[#161616] border border-[#222] rounded-[12px] p-3 text-center">
                <p className="text-[17px] font-bold text-white">
                  {maxTime != null ? formatTime(maxTime) : `${Math.round(place.dist)}m`}
                </p>
                <p className="text-[10px] text-[#444] mt-0.5">{maxTime != null ? 'trajet max' : 'distance'}</p>
              </div>
            </div>

            {/* Transport mode tabs */}
            <div className="flex gap-1.5 mb-3">
              {ALL_MODES.map((m) => (
                <button key={m} onClick={() => setActiveMode(m)}
                  className={`flex-1 py-2 rounded-[10px] text-[12px] font-semibold border transition-all ${
                    activeMode === m
                      ? 'bg-[rgba(255,107,44,0.15)] border-[#FF6B2C] text-[#FF6B2C]'
                      : 'bg-[#161616] border-[#222] text-[#555] hover:border-[#3A3A3A] hover:text-[#888]'
                  }`}
                >
                  {MODE_ICON[m]} {MODE_LABEL[m]}
                </button>
              ))}
            </div>

            {/* Travel times for active mode */}
            <div className="mb-5 min-h-[70px]">
              {loadingModes && !allModeTimes[activeMode] ? (
                <div className="flex items-center justify-center h-[70px]">
                  <div className="w-5 h-5 rounded-full border-2 border-[#FF6B2C] border-t-transparent animate-spin" />
                </div>
              ) : hasTimes ? (
                <div className="flex flex-col gap-2">
                  {currentTimes.map((t, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[11px] font-bold text-[#888] flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 bg-[#161616] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: maxTime && t ? `${Math.round((t / maxTime) * 100)}%` : '0%',
                            background: t === maxTime ? '#FF6B2C' : '#2A2A2A',
                          }}
                        />
                      </div>
                      <span className={`text-[12px] font-semibold min-w-[50px] text-right ${t === maxTime ? 'text-[#FF6B2C]' : 'text-[#555]'}`}>
                        {MODE_ICON[activeMode]} {formatTime(t)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-[#444] text-center py-4">Temps non disponibles</p>
              )}
            </div>

            {/* CTA */}
            <div className="flex gap-2.5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-[14px] text-[13px] font-semibold text-white text-center transition-all hover:border-[#444] active:scale-[0.98]"
              >
                🗺 Itinéraire
              </a>
              <button
                onClick={onChoose}
                className="flex-1 py-3.5 bg-[#FF6B2C] rounded-[14px] text-[13px] font-semibold text-white transition-all hover:bg-[#ff7d45] active:scale-[0.98]"
              >
                ✓ Choisir ce spot
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Results Screen ───────────────────────────────────────────

export default function ResultsScreen({ coords, midpoint, places, mode, onBack }: Props) {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [chosenPlace, setChosenPlace] = useState<Place | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);

  const hasTravelTimes = places.some((p) => p.travelTimes && p.travelTimes.length > 0);

  const handlePlaceSelect = useCallback((place: Place) => {
    setSelectedCardId(place.place_id);
    setTimeout(() => {
      const el = cardRefs.current.get(place.place_id);
      const list = listRef.current;
      if (el && list) {
        const elTop = el.offsetTop - list.offsetTop;
        list.scrollTo({ top: elTop - 8, behavior: 'smooth' });
      }
    }, 50);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E1E] flex-shrink-0">
        <div className="text-[20px] font-bold tracking-[-1px]">
          ZESP<span className="text-[#FF6B2C]">0</span>T
        </div>
        <button
          onClick={onBack}
          className="px-3 py-1.5 bg-transparent border border-[#2A2A2A] rounded-[8px] text-[#888] text-[12px] transition-all hover:border-[#FF6B2C] hover:text-[#FF6B2C]"
        >
          ← Retour
        </button>
      </div>

      {/* Map */}
      <div className="h-[42vh] flex-shrink-0">
        <MapView
          coords={coords}
          midpoint={midpoint}
          places={places}
          selectedPlaceId={selectedPlace?.place_id ?? selectedCardId}
          onPlaceSelect={handlePlaceSelect}
        />
      </div>

      {/* Results */}
      <div ref={listRef} className="flex-1 overflow-y-auto bg-[#0A0A0A]">
        <div className="px-4 pt-4 pb-1 flex items-baseline gap-2">
          <h2 className="text-[16px] font-semibold">Le Spot 🎯</h2>
          <p className="text-[11px] text-[#555]">
            {places.length} bar{places.length !== 1 ? 's' : ''}
            {hasTravelTimes ? ' · par trajet max' : ''}
          </p>
        </div>

        <div className="flex flex-col gap-2 px-4 pb-24">
          {places.length === 0 ? (
            <p className="text-[13px] text-[#555] text-center py-10 leading-loose">
              Aucun bar trouvé dans ce secteur.<br />Essaie des adresses plus proches.
            </p>
          ) : (
            places.map((p, i) => {
              const isSelected = selectedCardId === p.place_id;
              return (
                <div
                  key={p.place_id}
                  ref={(el) => { if (el) cardRefs.current.set(p.place_id, el); }}
                >
                  <SpotCard
                    place={p}
                    rank={i + 1}
                    mode={mode}
                    isSelected={isSelected}
                    onClick={() => { setSelectedPlace(p); setSelectedCardId(p.place_id); }}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedPlace && (
        <SpotDetailSheet
          place={selectedPlace}
          mode={mode}
          rank={places.findIndex((p) => p.place_id === selectedPlace.place_id) + 1}
          coords={coords}
          onClose={() => setSelectedPlace(null)}
          onChoose={() => { setChosenPlace(selectedPlace); setSelectedPlace(null); }}
        />
      )}

      {chosenPlace && (
        <SuccessOverlay
          place={chosenPlace}
          onDone={() => setChosenPlace(null)}
        />
      )}
    </div>
  );
}
