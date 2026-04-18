'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Place } from '@/lib/types';

export default function BetaSharedSpotPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    fetch(`/api/spot-share?code=${encodeURIComponent(code.toUpperCase())}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }
        setPlace(data.spot as Place);
        setLoading(false);
      })
      .catch(() => {
        setError('Erreur réseau.');
        setLoading(false);
      });
  }, [code]);

  const mapsUrl = place
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`
    : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF5F7] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#FFE4EC] border-t-[#FF4D8F] animate-spin" />
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="min-h-screen bg-[#FFF5F7] flex flex-col items-center justify-center px-6 text-center text-[#1F1B2E]">
        <div className="w-20 h-20 rounded-full bg-[#FFE4EC] flex items-center justify-center mb-5">
          <span className="text-[40px]">😕</span>
        </div>
        <h1 className="text-[22px] font-bold tracking-[-0.5px] mb-2">Code introuvable</h1>
        <p className="text-[13px] text-[#9A8FA3] mb-8 max-w-[280px] leading-relaxed">
          Ce lien a peut-être expiré (7 jours) ou le code est invalide.
        </p>
        <button
          onClick={() => router.push('/beta')}
          className="px-6 py-3.5 bg-[#FF4D8F] hover:bg-[#ff6aa3] active:scale-[0.98] text-white text-[14px] font-bold rounded-[14px] transition-all shadow-[0_6px_18px_rgba(255,77,143,0.3)]"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F7] text-[#1F1B2E] pb-10 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #10D29B66 0%, transparent 70%)' }}
      />

      {/* Header */}
      <header className="relative z-10 pt-10 pb-6 text-center px-6">
        <p className="text-[11px] font-bold text-[#10D29B] uppercase tracking-[3px] mb-1">
          Zespot partagé
        </p>
        <h1 className="text-[32px] font-black tracking-[-1.5px]">
          ZESP<span className="text-[#FF4D8F]">0</span>T
        </h1>
      </header>

      <div className="relative z-10 max-w-[480px] mx-auto px-5">
        <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#F0E5EA] mb-4">
          {place.photo_reference ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/photo?ref=${encodeURIComponent(place.photo_reference)}&w=800`}
              alt={place.name}
              className="w-full h-[180px] object-cover"
            />
          ) : (
            <div
              className="w-full h-[140px] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FFE4EC 0%, #D6F9EC 100%)' }}
            >
              <span className="text-[60px] opacity-50">📍</span>
            </div>
          )}
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-[20px] font-bold tracking-[-0.4px] leading-tight">{place.name}</h2>
              {place.rating != null && (
                <span className="flex items-center gap-1 text-[13px] font-bold text-[#1F1B2E] bg-[#FFF5E0] px-2.5 py-1 rounded-full flex-shrink-0">
                  ★ {place.rating.toFixed(1)}
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#6B6275] leading-relaxed mb-3">📍 {place.address}</p>
            <div className="flex items-center gap-2 pt-3 border-t border-[#F5EEF2]">
              <span className="text-[10px] uppercase tracking-[1.5px] text-[#9A8FA3] font-bold">Code</span>
              <span className="font-mono font-black text-[14px] tracking-[3px] text-[#1F1B2E]">
                {code?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-[#FF4D8F] hover:bg-[#ff6aa3] active:scale-[0.98] text-white text-[15px] font-bold rounded-[18px] text-center transition-all shadow-[0_8px_24px_rgba(255,77,143,0.3)] block"
          >
            🗺 Ouvrir dans Google Maps
          </a>
          <Link
            href="/beta/find"
            className="w-full py-3.5 bg-white border-2 border-[#10D29B] text-[#10D29B] text-[14px] font-bold rounded-[18px] text-center block transition-all hover:bg-[#D6F9EC] active:scale-[0.98]"
          >
            Créer mon propre Zespot →
          </Link>
        </div>
      </div>
    </div>
  );
}
