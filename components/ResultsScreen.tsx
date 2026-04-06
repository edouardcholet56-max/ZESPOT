'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { LatLng, Place } from '@/lib/types';
import SpotCard from './SpotCard';

// Dynamic import avoids SSR issues with Leaflet (window is undefined server-side)
const Map = dynamic(() => import('./Map'), { ssr: false });

interface Props {
  coords: (LatLng & { formatted: string })[];
  midpoint: LatLng;
  places: Place[];
  onBack: () => void;
}

export default function ResultsScreen({ coords, midpoint, places, onBack }: Props) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0A0A0A]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-[18px] border-b border-[#2A2A2A] flex-shrink-0">
        <div className="text-[22px] font-bold tracking-[-1px]">
          ZESP<span className="text-[#FF6B2C]">0</span>T
        </div>
        <button
          onClick={onBack}
          className="px-4 py-[7px] bg-transparent border border-[#2A2A2A] rounded-[8px] text-[#888] text-[12px] cursor-pointer transition-all hover:border-[#FF6B2C] hover:text-[#FF6B2C]"
        >
          ← Nouvelle recherche
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1">
          <Map
            coords={coords}
            midpoint={midpoint}
            places={places}
            selectedPlaceId={selectedPlaceId}
          />
        </div>

        {/* Results panel */}
        <div className="w-[360px] flex-shrink-0 overflow-y-auto border-l border-[#2A2A2A] p-5 bg-[#0A0A0A]">
          <h2 className="text-[18px] font-semibold mb-1">Le Spot 🎯</h2>
          <p className="text-[12px] text-[#888] mb-5">
            {places.length} bar{places.length !== 1 ? 's' : ''} trouvé
            {places.length !== 1 ? 's' : ''} autour du point central
          </p>

          <div className="flex flex-col gap-2.5">
            {places.length === 0 ? (
              <p className="text-[13px] text-[#555] text-center py-10 leading-loose">
                Aucun bar trouvé dans ce secteur.
                <br />
                Essaie des adresses plus proches les unes des autres.
              </p>
            ) : (
              places.map((p, i) => (
                <SpotCard
                  key={p.place_id}
                  place={p}
                  rank={i + 1}
                  onClick={() => setSelectedPlaceId(p.place_id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
