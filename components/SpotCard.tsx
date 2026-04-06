import { Place } from '@/lib/types';
import { formatDist } from '@/lib/utils';

interface Props {
  place: Place;
  rank: number;
  onClick: () => void;
}

const PRICE = ['', '€', '€€', '€€€', '€€€€'];

export default function SpotCard({ place, rank, onClick }: Props) {
  const isTop = rank === 1;

  const tags: string[] = [];
  if (place.open_now === true) tags.push('Ouvert');
  if (place.open_now === false) tags.push('Fermé');
  if (place.price_level != null) tags.push(PRICE[place.price_level] || '');

  const tagClass = isTop
    ? 'bg-[rgba(255,107,44,0.15)] text-[#FF6B2C]'
    : 'bg-[#1C1C1C] text-[#888]';

  return (
    <div
      onClick={onClick}
      className={`rounded-[14px] p-[14px_16px] cursor-pointer transition-all duration-[180ms] ${
        isTop
          ? 'bg-[rgba(255,107,44,0.06)] border border-[#FF6B2C]'
          : 'bg-[#141414] border border-[#2A2A2A] hover:border-[rgba(255,107,44,0.5)] hover:bg-[#1C1C1C]'
      }`}
    >
      {/* Top row: rank · name · distance */}
      <div className="flex items-start gap-2.5 mb-1.5">
        <div
          className={`w-[22px] h-[22px] min-w-[22px] rounded-full flex items-center justify-center text-[10px] font-bold ${
            isTop ? 'bg-[#FF6B2C] text-white' : 'bg-[#1C1C1C] text-[#888]'
          }`}
        >
          {rank}
        </div>
        <div className="flex-1 text-[14px] font-semibold leading-snug">{place.name}</div>
        <div className="text-[11px] text-[#FF6B2C] font-medium whitespace-nowrap pt-0.5">
          {formatDist(place.dist)}
        </div>
      </div>

      {/* Address */}
      {place.address && (
        <p className="text-[11px] text-[#555] leading-[1.4] pl-8">{place.address}</p>
      )}

      {/* Tags */}
      <div className="flex gap-1.5 flex-wrap mt-2 pl-8">
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
  );
}
