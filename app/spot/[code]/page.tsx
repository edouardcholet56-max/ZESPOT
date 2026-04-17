'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Place } from '@/lib/types';

export default function SpotSharePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [place, setPlace] = useState<Place | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    fetch(`/api/spot-share?code=${encodeURIComponent(code.toUpperCase())}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        setPlace(data.spot as Place);
        if (data.time) setTime(data.time);
        setLoading(false);
      })
      .catch(() => { setError('Erreur réseau.'); setLoading(false); });
  }, [code]);

  const mapsUrl = place
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`
    : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#FF6B2C] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-8 text-center">
        <div className="text-[48px] mb-4">😕</div>
        <h1 className="text-[20px] font-bold mb-2">Code introuvable</h1>
        <p className="text-[13px] text-[#555] mb-8">Ce lien a peut-être expiré (7 jours) ou le code est invalide.</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-[#FF6B2C] text-white rounded-[12px] text-[14px] font-semibold"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6 py-16"
      style={{ backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,107,44,0.08) 0%, transparent 70%)' }}
    >
      <div className="w-full max-w-[430px]">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[11px] tracking-[3px] uppercase text-[#555] mb-1">Zespot partagé</p>
          <h1 className="text-[32px] font-bold tracking-[-1.5px]">
            ZESP<span className="text-[#FF6B2C]">0</span>T
          </h1>
        </div>

        {/* Spot card */}
        <div className="bg-[#111] border border-[#1E1E1E] rounded-[20px] overflow-hidden mb-5">
          {/* Photo placeholder / emoji header */}
          <div className="w-full h-[140px] bg-gradient-to-br from-[rgba(255,107,44,0.12)] to-[#0A0A0A] flex items-center justify-center border-b border-[#1E1E1E]">
            {place.photo_reference ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/photo?ref=${encodeURIComponent(place.photo_reference)}&w=800`}
                alt={place.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[64px] opacity-30">🍺</span>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-[20px] font-bold tracking-[-0.5px] leading-tight">{place.name}</h2>
              {place.rating != null && (
                <span className="text-[13px] text-[#FFD700] font-semibold flex-shrink-0 mt-0.5">
                  ★ {place.rating.toFixed(1)}
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#555] leading-relaxed mb-4">📍 {place.address}</p>

            {time && (
              <div className="flex items-center gap-2 bg-[rgba(255,107,44,0.08)] border border-[rgba(255,107,44,0.2)] rounded-[10px] px-3 py-2.5 mb-4">
                <span className="text-[16px]">🕐</span>
                <div>
                  <p className="text-[10px] text-[#FF6B2C] uppercase tracking-[1px]">Heure du rendez-vous</p>
                  <p className="text-[16px] font-bold text-white">{time}</p>
                </div>
              </div>
            )}

            {/* Code badge */}
            <div className="flex items-center gap-2 text-[#333] mb-1">
              <span className="text-[11px] uppercase tracking-[1px]">Code</span>
              <span className="font-mono font-bold text-[14px] tracking-[3px] text-[#444]">{code.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-[#FF6B2C] text-white text-[15px] font-semibold rounded-[14px] text-center transition-all hover:bg-[#ff7d45] active:scale-[0.98]"
          >
            🗺 Ouvrir dans Google Maps
          </a>
          <button
            onClick={() => router.push('/find')}
            className="w-full py-3.5 bg-[#141414] border border-[#2A2A2A] text-[#888] text-[14px] font-semibold rounded-[14px] transition-all hover:border-[#3A3A3A] hover:text-white active:scale-[0.98]"
          >
            Trouver mon propre spot →
          </button>
        </div>
      </div>
    </div>
  );
}
