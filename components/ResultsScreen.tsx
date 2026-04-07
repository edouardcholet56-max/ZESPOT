'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { LatLng, Place, TransportMode } from '@/lib/types';
import SpotCard from './SpotCard';

const Map = dynamic(() => import('./Map'), { ssr: false });

interface Props {
  coords: (LatLng & { formatted: string })[];
  midpoint: LatLng;
  places: Place[];
  mode: TransportMode;
  onBack: () => void;
}

export default function ResultsScreen({ coords, midpoint, places, mode, onBack }: Props) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const hasTravelTimes = places.some((p) => p.travelTimes && p.travelTimes.length > 0);

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

      {/* Map — top third */}
      <div className="h-[42vh] flex-shrink-0">
        <Map
          coords={coords}
          midpoint={midpoint}
          places={places}
          selectedPlaceId={selectedPlaceId}
        />
      </div>

      {/* Results — scrollable bottom */}
      <div className="flex-1 overflow-y-auto bg-[#0A0A0A]">
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
              Aucun bar trouvé dans ce secteur.
              <br />
              Essaie des adresses plus proches.
            </p>
          ) : (
            places.map((p, i) => (
              <SpotCard
                key={p.place_id}
                place={p}
                rank={i + 1}
                mode={mode}
                onClick={() => setSelectedPlaceId(p.place_id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
