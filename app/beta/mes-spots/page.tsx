'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { storage } from '@/lib/storage';

interface BetaSpot {
  code: string;
  place_id: string;
  name: string;
  address?: string;
  rating?: number | null;
  photo_reference?: string | null;
  type: 'bar' | 'restaurant' | 'park' | 'museum';
  createdAt: number;
}

const TYPE_META: Record<BetaSpot['type'], { emoji: string; label: string; accent: 'rose' | 'green' }> = {
  bar:        { emoji: '🍺', label: 'Bar',         accent: 'rose'  },
  restaurant: { emoji: '🍽', label: 'Restaurant',  accent: 'rose'  },
  park:       { emoji: '🌳', label: 'Espace vert', accent: 'green' },
  museum:     { emoji: '🏛', label: 'Musée',       accent: 'green' },
};

export default function BetaMesSpotsPage() {
  const [spots, setSpots] = useState<BetaSpot[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSpots((storage.betaSpots as BetaSpot[]) || []);
    setLoaded(true);
  }, []);

  const remove = (code: string) => {
    if (!confirm('Retirer ce spot de ta liste ?')) return;
    storage.removeBetaSpot(code);
    setSpots((prev) => prev.filter((s) => s.code !== code));
  };

  return (
    <div className="min-h-screen bg-[#FFF5F7] text-[#1F1B2E]">
      <header className="sticky top-0 z-20 bg-[#FFF5F7]/90 backdrop-blur-md border-b border-[#F0E5EA]">
        <div className="max-w-[520px] mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/beta" className="text-[14px] text-[#9A8FA3] font-medium hover:text-[#1F1B2E] transition-colors">
            ← Retour
          </Link>
          <h1 className="text-[15px] font-bold tracking-[-0.3px]">Mes spots</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-[520px] mx-auto px-5 pt-6 pb-12">
        {!loaded ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-[#FFE4EC] border-t-[#FF4D8F] animate-spin" />
          </div>
        ) : spots.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFE4EC] to-[#D6F9EC] flex items-center justify-center mx-auto mb-5">
              <span className="text-[36px]">✨</span>
            </div>
            <h2 className="text-[18px] font-bold tracking-[-0.3px] mb-2">Aucun spot encore</h2>
            <p className="text-[13px] text-[#9A8FA3] mb-8 leading-relaxed">
              Crée ton premier Zespot pour retrouver tes amis.
            </p>
            <Link
              href="/beta/find"
              className="inline-block px-6 py-3.5 bg-[#FF4D8F] hover:bg-[#ff6aa3] active:scale-[0.98] text-white text-[14px] font-bold rounded-[14px] transition-all shadow-[0_6px_18px_rgba(255,77,143,0.3)]"
            >
              ✨ Créer mon premier Zespot
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-[#6B6275] uppercase tracking-[2px] mb-2 px-1">
              {spots.length} {spots.length > 1 ? 'spots créés' : 'spot créé'}
            </p>
            {spots.map((spot) => (
              <SpotCard key={spot.code} spot={spot} onRemove={() => remove(spot.code)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SpotCard({ spot, onRemove }: { spot: BetaSpot; onRemove: () => void }) {
  const meta = TYPE_META[spot.type] || TYPE_META.bar;
  const accentColor = meta.accent === 'rose' ? '#FF4D8F' : '#10D29B';
  const accentBg = meta.accent === 'rose' ? '#FFE4EC' : '#D6F9EC';

  return (
    <Link
      href={`/beta/spot/${spot.code}`}
      className="block bg-white border border-[#F0E5EA] rounded-[18px] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all active:scale-[0.99] group"
    >
      <div className="flex items-center gap-3">
        {spot.photo_reference ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photo?ref=${encodeURIComponent(spot.photo_reference)}&w=200`}
            alt={spot.name}
            className="w-16 h-16 rounded-[12px] object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-[12px] flex items-center justify-center flex-shrink-0 text-[28px]"
            style={{ background: accentBg }}
          >
            {meta.emoji}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="text-[10px] font-bold uppercase tracking-[1.5px] px-1.5 py-0.5 rounded"
              style={{ color: accentColor, background: accentBg }}
            >
              {meta.label}
            </span>
            {spot.rating != null && (
              <span className="text-[10px] font-bold text-[#1F1B2E]">★ {spot.rating.toFixed(1)}</span>
            )}
          </div>
          <h3 className="text-[15px] font-bold tracking-[-0.2px] truncate">{spot.name}</h3>
          {spot.address && (
            <p className="text-[11px] text-[#9A8FA3] truncate">📍 {spot.address}</p>
          )}
          <p className="text-[10px] text-[#B8A9B3] mt-0.5 font-mono tracking-[1px]">
            {spot.code}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="p-2 text-[#B8A9B3] hover:text-[#FF4D8F] transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
          aria-label="Retirer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
        </button>
      </div>
    </Link>
  );
}
