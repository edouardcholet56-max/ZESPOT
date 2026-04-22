'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Place } from '@/lib/types';

export default function BetaSharedSpotPage() {
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
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }
        setPlace(data.spot as Place);
        setTime(typeof data.time === 'string' ? data.time : null);
        setLoading(false);
      })
      .catch(() => {
        setError('Network error.');
        setLoading(false);
      });
  }, [code]);

  const mapsUrl = place
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`
    : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2EE] flex items-center justify-center">
        <span className="inline-block w-4 h-4 border-t border-black animate-spin rounded-full" />
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="min-h-screen bg-[#F5F2EE] flex flex-col px-6">
        <header className="pt-6 pb-4 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.2em] text-black/50">ZeSpot</span>
          <span className="text-[11px] uppercase tracking-[0.2em] text-black/50">404</span>
        </header>
        <hr />

        <main className="flex-1 flex flex-col justify-center max-w-[380px] w-full mx-auto py-16">
          <p className="text-[11px] uppercase tracking-[0.25em] text-black/50 mb-5">Not found</p>
          <h1 className="font-serif text-[42px] leading-[1.02] tracking-[-0.03em] mb-4">
            This <span className="italic">ZeSpot</span> is gone.
          </h1>
          <p className="font-serif text-[17px] leading-[1.4] text-black/60 mb-12">
            The link may have expired (7 days) or the code is invalid.
          </p>
        </main>

        <hr />
        <section className="py-8">
          <button
            onClick={() => router.push('/beta')}
            className="block w-full py-5 bg-[#D13631] text-white text-[13px] uppercase tracking-[0.18em] text-center active:bg-black transition-colors"
          >
            Back home
          </button>
        </section>
      </div>
    );
  }

  const formattedTime = time ? formatDateTime(time) : null;

  return (
    <div className="min-h-screen bg-[#F5F2EE] text-black pb-16">
      <header className="pt-6 pb-4 flex items-center justify-between max-w-[520px] mx-auto px-6">
        <span className="text-[11px] uppercase tracking-[0.2em] text-black/50">Shared ZeSpot</span>
        <span className="font-serif text-[13px] tracking-[0.08em] text-black/70">
          {code?.toUpperCase()}
        </span>
      </header>
      <hr />

      <main className="max-w-[520px] mx-auto px-6 pt-10 space-y-12">
        <section>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#D13631] mb-4">
            You&apos;re invited
          </p>
          <h1 className="font-serif text-[44px] leading-[1.02] tracking-[-0.03em]">
            Meet at <span className="italic">{place.name}.</span>
          </h1>
          <p className="text-[13px] text-black/60 mt-3 leading-relaxed">{place.address}</p>
        </section>

        {place.photo_reference ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photo?ref=${encodeURIComponent(place.photo_reference)}&w=800`}
            alt={place.name}
            className="w-full h-[220px] object-cover"
          />
        ) : (
          <div className="w-full h-[180px] border border-black/10 flex items-center justify-center">
            <span className="font-serif italic text-[26px] text-black/30">ZeSpot</span>
          </div>
        )}

        {/* When — only shown if set */}
        {formattedTime && (
          <section>
            <hr className="mb-6" />
            <p className="text-[11px] uppercase tracking-[0.2em] text-black/60 mb-3">
              When
            </p>
            <p className="font-serif text-[28px] leading-[1.15] tracking-[-0.02em]">
              <span className="italic">{formattedTime}.</span>
            </p>
          </section>
        )}

        <hr />

        {place.rating != null && (
          <section>
            <p className="text-[11px] uppercase tracking-[0.2em] text-black/60 mb-3">
              The spot
            </p>
            <div className="flex items-center gap-6 text-[11px] uppercase tracking-[0.15em] text-black/70">
              <span>★ {place.rating.toFixed(1)}</span>
              {place.user_ratings_total != null && <span>{place.user_ratings_total} reviews</span>}
            </div>
          </section>
        )}

        <hr />

        <section className="space-y-3">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-5 bg-[#D13631] text-white text-[13px] uppercase tracking-[0.18em] text-center active:bg-black transition-colors"
          >
            Open in Google Maps
          </a>
          <Link
            href="/beta/find"
            className="block w-full py-4 border border-black/20 text-black text-[12px] uppercase tracking-[0.18em] text-center hover:border-black transition-colors"
          >
            Create my own ZeSpot
          </Link>
        </section>
      </main>
    </div>
  );
}

function formatDateTime(value: string): string {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}
