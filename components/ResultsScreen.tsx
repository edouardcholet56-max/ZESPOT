'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { LatLng, Place, TransportMode } from '@/lib/types';
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

function formatTime(seconds: number | null | undefined): string {
  if (seconds == null) return '?';
  return `${Math.round(seconds / 60)} min`;
}

// ── Spot detail bottom sheet ──────────────────────────────────────

function SpotDetailSheet({
  place, mode, rank, onClose,
}: {
  place: Place; mode: TransportMode; rank: number; onClose: () => void;
}) {
  const [activePhoto, setActivePhoto] = useState(0);
  const photos = place.photo_references?.length
    ? place.photo_references
    : place.photo_reference
    ? [place.photo_reference]
    : [];

  const [imgErrors, setImgErrors] = useState<boolean[]>([false, false, false]);
  const markError = (i: number) => setImgErrors((prev) => { const n = [...prev]; n[i] = true; return n; });

  const hasTravelTimes = place.travelTimes && place.travelTimes.length > 0;
  const maxTime = hasTravelTimes
    ? Math.max(...place.travelTimes!.filter((t): t is number => t !== null))
    : null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-[#0F0F0F] rounded-t-[24px] overflow-hidden"
        style={{ boxShadow: '0 -20px 60px rgba(0,0,0,0.8)', maxHeight: '90vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#333] rounded-full" />
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 20px)' }}>

          {/* Photos */}
          <div className="relative w-full h-[240px]">
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

            {/* Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent" />

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white text-[16px] backdrop-blur-sm"
            >
              ×
            </button>

            {/* Rank badge */}
            <div className={`absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shadow-lg ${rank === 1 ? 'bg-[#FF6B2C] text-white' : 'bg-black/60 text-white backdrop-blur-sm'}`}>
              {rank}
            </div>

            {/* Photo dots */}
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === activePhoto ? 'bg-white scale-125' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-5 pt-4 pb-8">
            {/* Name + status */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-[22px] font-bold tracking-[-0.5px] leading-tight flex-1">{place.name}</h2>
              {place.open_now != null && (
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full mt-1 flex-shrink-0 ${place.open_now ? 'bg-[rgba(46,213,115,0.15)] text-[#2ed573]' : 'bg-[rgba(255,69,58,0.15)] text-[#FF453A]'}`}>
                  {place.open_now ? 'Ouvert' : 'Fermé'}
                </span>
              )}
            </div>

            {/* Address */}
            <div className="flex items-start gap-2 mb-4">
              <span className="text-[14px] mt-0.5 flex-shrink-0">📍</span>
              <p className="text-[13px] text-[#888] leading-relaxed">{place.address}</p>
            </div>

            {/* Stats row */}
            <div className="flex gap-3 mb-5">
              {place.rating != null && (
                <div className="flex-1 bg-[#161616] border border-[#222] rounded-[12px] p-3 text-center">
                  <p className="text-[18px] font-bold text-[#FFD700]">★ {place.rating.toFixed(1)}</p>
                  <p className="text-[10px] text-[#444] mt-0.5">{place.user_ratings_total ? `${place.user_ratings_total} avis` : 'Note'}</p>
                </div>
              )}
              {place.price_level != null && (
                <div className="flex-1 bg-[#161616] border border-[#222] rounded-[12px] p-3 text-center">
                  <p className="text-[18px] font-bold text-[#FF6B2C]">{PRICE[place.price_level]}</p>
                  <p className="text-[10px] text-[#444] mt-0.5">Budget</p>
                </div>
              )}
              <div className="flex-1 bg-[#161616] border border-[#222] rounded-[12px] p-3 text-center">
                <p className="text-[18px] font-bold text-white">
                  {maxTime != null ? formatTime(maxTime) : `${Math.round(place.dist)}m`}
                </p>
                <p className="text-[10px] text-[#444] mt-0.5">{maxTime != null ? 'trajet max' : 'distance'}</p>
              </div>
            </div>

            {/* Travel times per person */}
            {hasTravelTimes && (
              <div className="mb-5">
                <p className="text-[11px] text-[#444] uppercase tracking-[1px] font-semibold mb-3">Temps de trajet</p>
                <div className="flex flex-col gap-2">
                  {place.travelTimes!.map((t, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[12px] font-bold text-[#888] flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 bg-[#161616] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: maxTime && t ? `${Math.round((t / maxTime) * 100)}%` : '0%',
                            background: t === maxTime ? '#FF6B2C' : '#333',
                          }}
                        />
                      </div>
                      <span className={`text-[12px] font-semibold min-w-[44px] text-right ${t === maxTime ? 'text-[#FF6B2C]' : 'text-[#666]'}`}>
                        {MODE_ICON[mode]} {formatTime(t)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA buttons */}
            <div
              className="flex gap-3"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
            >
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-[14px] text-[13px] font-semibold text-white text-center transition-all hover:border-[#444] active:scale-[0.98]"
              >
                🗺 Google Maps
              </a>
              <button
                onClick={onClose}
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
  // selectedCardId = highlighted card (from map click), without opening the sheet
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);

  const hasTravelTimes = places.some((p) => p.travelTimes && p.travelTimes.length > 0);

  // Called from map marker click → highlight card + scroll it to top of list
  const handlePlaceSelect = (place: Place) => {
    setSelectedCardId(place.place_id);
    setTimeout(() => {
      const el = cardRefs.current.get(place.place_id);
      const list = listRef.current;
      if (el && list) {
        const elTop = el.offsetTop - list.offsetTop;
        list.scrollTo({ top: elTop - 8, behavior: 'smooth' });
      }
    }, 50);
  };

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

      {/* Detail sheet */}
      {selectedPlace && (
        <SpotDetailSheet
          place={selectedPlace}
          mode={mode}
          rank={places.findIndex((p) => p.place_id === selectedPlace.place_id) + 1}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
}
