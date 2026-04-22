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

const TYPE_LABEL: Record<BetaSpot['type'], string> = {
  bar: 'Bar',
  restaurant: 'Restaurant',
  park: 'Park',
  museum: 'Museum',
};

export default function BetaMesSpotsPage() {
  const [spots, setSpots] = useState<BetaSpot[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSpots((storage.betaSpots as BetaSpot[]) || []);
    setLoaded(true);
  }, []);

  const remove = (code: string) => {
    if (!confirm('Remove this spot from your list?')) return;
    storage.removeBetaSpot(code);
    setSpots((prev) => prev.filter((s) => s.code !== code));
  };

  return (
    <div className="min-h-screen bg-[#E8E4DB] text-black">
      <header className="sticky top-0 z-20 bg-[#E8E4DB]">
        <div className="max-w-[520px] mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
          <Link href="/beta" className="text-[11px] uppercase tracking-[0.2em] text-black/50 hover:text-black transition-colors">
            ← Back
          </Link>
          <h1 className="font-serif text-[18px] tracking-[-0.01em]">
            My <span className="italic">spots</span>
          </h1>
          <span className="text-[11px] uppercase tracking-[0.2em] text-black/50">
            {loaded ? spots.length : '—'}
          </span>
        </div>
        <hr />
      </header>

      <main className="max-w-[520px] mx-auto px-6 pt-10 pb-16">
        {!loaded ? (
          <div className="flex justify-center py-20">
            <span className="inline-block w-4 h-4 border-t border-black animate-spin rounded-full" />
          </div>
        ) : spots.length === 0 ? (
          <div className="py-12">
            <p className="text-[11px] uppercase tracking-[0.25em] text-black/50 mb-5">Empty</p>
            <h2 className="font-serif text-[40px] leading-[1] tracking-[-0.03em] mb-5">
              No spot <span className="italic">yet.</span>
            </h2>
            <p className="font-serif text-[17px] leading-[1.4] text-black/60 mb-10 max-w-[320px]">
              Drop a mood — create your first ZeSpot to meet friends <span className="italic">at equal travel time.</span>
            </p>
            <Link
              href="/beta/find"
              className="inline-block py-4 px-8 bg-[#D13631] text-white text-[12px] uppercase tracking-[0.18em] active:bg-black transition-colors"
            >
              Find our spot
            </Link>
          </div>
        ) : (
          <div className="border-y border-black/10 divide-y divide-black/10">
            {spots.map((spot) => (
              <SpotRow key={spot.code} spot={spot} onRemove={() => remove(spot.code)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SpotRow({ spot, onRemove }: { spot: BetaSpot; onRemove: () => void }) {
  const label = TYPE_LABEL[spot.type] || 'Spot';

  return (
    <div className="py-5 group">
      <Link href={`/beta/spot/${spot.code}`} className="block">
        <div className="flex items-start gap-4">
          {spot.photo_reference ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/photo?ref=${encodeURIComponent(spot.photo_reference)}&w=200`}
              alt={spot.name}
              className="w-16 h-16 object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 border border-black/10 flex items-center justify-center flex-shrink-0">
              <span className="font-serif italic text-[12px] text-black/30">Ze</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-black/50 mb-1">
              <span>{label}</span>
              {spot.rating != null && <span>★ {spot.rating.toFixed(1)}</span>}
              <span className="font-serif italic text-black/70 normal-case tracking-[0.08em]">
                {spot.code}
              </span>
            </div>
            <h3 className="font-serif text-[22px] leading-[1.15] tracking-[-0.01em] truncate">
              {spot.name}
            </h3>
            {spot.address && (
              <p className="text-[11px] text-black/50 truncate mt-1.5">{spot.address}</p>
            )}
          </div>
        </div>
      </Link>

      <button
        onClick={onRemove}
        className="mt-3 ml-20 text-[10px] uppercase tracking-[0.15em] text-black/40 hover:text-[#D13631] transition-colors"
      >
        Remove
      </button>
    </div>
  );
}
