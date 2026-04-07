import { useState } from 'react';
import { Place, TransportMode } from '@/lib/types';
import { formatDist } from '@/lib/utils';

interface Props {
  place: Place;
  rank: number;
  mode: TransportMode;
  onClick: () => void;
}

const PRICE = ['', '€', '€€', '€€€', '€€€€'];

const MODE_ICON: Record<TransportMode, string> = {
  walking: '🚶',
  bicycling: '🚲',
  transit: '🚇',
};

function formatTime(seconds: number | null | undefined): string {
  if (seconds == null) return '?';
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

export default function SpotCard({ place, rank, mode, onClick }: Props) {
  const [imgError, setImgError] = useState(false);
  const isTop = rank === 1;

  const tags: string[] = [];
  if (place.open_now === true) tags.push('Ouvert');
  if (place.open_now === false) tags.push('Fermé');
  if (place.price_level != null) tags.push(PRICE[place.price_level] || '');

  const tagClass = isTop
    ? 'bg-[rgba(255,107,44,0.15)] text-[#FF6B2C]'
    : 'bg-[#1C1C1C] text-[#888]';

  const hasTravelTimes = place.travelTimes && place.travelTimes.length > 0;
  const maxTime = hasTravelTimes
    ? Math.max(...place.travelTimes!.filter((t): t is number => t !== null))
    : null;

  const photoSrc = place.photo_reference && !imgError
    ? `/api/photo?ref=${encodeURIComponent(place.photo_reference)}&w=400`
    : null;

  return (
    <div
      onClick={onClick}
      className={`rounded-[14px] overflow-hidden cursor-pointer transition-all duration-[180ms] ${
        isTop
          ? 'bg-[rgba(255,107,44,0.06)] border border-[#FF6B2C]'
          : 'bg-[#141414] border border-[#2A2A2A] hover:border-[rgba(255,107,44,0.5)] hover:bg-[#1C1C1C]'
      }`}
    >
      {/* ── Photo ── */}
      <div className="relative w-full h-[130px]">
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt={place.name}
            className="w-full h-full object-cover"
            loading="eager"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1C1C1C] to-[#0F0F0F] flex items-center justify-center">
            <span className="text-[36px] opacity-40">🍺</span>
          </div>
        )}

        {/* Gradient overlay bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Rank badge */}
        <div
          className={`absolute top-2.5 left-2.5 w-[24px] h-[24px] rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg ${
            isTop ? 'bg-[#FF6B2C] text-white' : 'bg-black/60 text-white backdrop-blur-sm'
          }`}
        >
          {rank}
        </div>

        {/* Max travel time or distance — bottom right of photo */}
        <div className="absolute bottom-2.5 right-2.5 text-[11px] font-semibold text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
          {maxTime != null ? `max ${formatTime(maxTime)}` : formatDist(place.dist)}
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="p-[12px_14px]">
        {/* Name */}
        <p className="text-[14px] font-semibold leading-snug mb-1">{place.name}</p>

        {/* Address */}
        {place.address && (
          <p className="text-[11px] text-[#555] leading-[1.4] mb-2">{place.address}</p>
        )}

        {/* Travel times per person */}
        {hasTravelTimes && (
          <div className="flex gap-1.5 flex-wrap mb-1.5">
            {place.travelTimes!.map((t, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  t === maxTime ? 'bg-[rgba(255,107,44,0.15)] text-[#FF6B2C]' : tagClass
                }`}
              >
                {MODE_ICON[mode]} {formatTime(t)}
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        <div className="flex gap-1.5 flex-wrap">
          {place.rating != null && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${tagClass}`}>
              ★ {place.rating.toFixed(1)}
              {place.user_ratings_total ? ` (${place.user_ratings_total})` : ''}
            </span>
          )}
          {tags.filter(Boolean).map((t) => (
            <span key={t} className={`px-2 py-0.5 rounded-full text-[10px] ${tagClass}`}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
