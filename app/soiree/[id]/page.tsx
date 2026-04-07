'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SoireeEvent, Place, LatLng, TransportMode } from '@/lib/types';
import { getMidpoint, haversine, sleep } from '@/lib/utils';

const MODE_ICON: Record<TransportMode, string> = {
  walking: '🚶',
  bicycling: '🚲',
  transit: '🚇',
};

function formatDate(dateStr: string, timeStr?: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const dateFormatted = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return timeStr ? `${dateFormatted} à ${timeStr}` : dateFormatted;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#FF6B2C', '#6C63FF', '#00C9A7', '#FF4757', '#FFA502', '#2ED573', '#1E90FF', '#FF6B81'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      style={{ width: size, height: size, backgroundColor: `${color}22`, borderColor: `${color}55`, fontSize: size * 0.35 }}
      className="rounded-full border flex items-center justify-center font-bold text-white flex-shrink-0"
    >
      {initials}
    </div>
  );
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const eventId = params.id;

  const [event, setEvent] = useState<SoireeEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Who am I?
  const [myName, setMyName] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);

  // Join form
  const [showJoin, setShowJoin] = useState(false);
  const [joinName, setJoinName] = useState('');
  const [joinAddress, setJoinAddress] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Find spot
  const [findingSpot, setFindingSpot] = useState(false);
  const [findStep, setFindStep] = useState(0);
  const [topSpots, setTopSpots] = useState<Place[]>([]);
  const [spotError, setSpotError] = useState('');

  // Invite copy
  const [copied, setCopied] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/event?id=${eventId}`);
      if (!res.ok) { setNotFound(true); return; }
      const data = await res.json();
      setEvent(data.event);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
    // Restore identity
    const stored = sessionStorage.getItem(`event_${eventId}_me`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMyName(parsed.name);
        setIsCreator(parsed.isCreator || false);
      } catch { /* ignore */ }
    }
    // Poll every 5s
    const interval = setInterval(fetchEvent, 5000);
    return () => clearInterval(interval);
  }, [eventId, fetchEvent]);

  const handleJoin = async () => {
    if (!joinName.trim()) { setJoinError('Entre ton prénom.'); return; }
    setJoinError('');
    setJoining(true);
    try {
      const res = await fetch(`/api/event/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: joinName.trim(), address: joinAddress.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem(`event_${eventId}_me`, JSON.stringify({ name: joinName.trim(), isCreator: false }));
      setMyName(joinName.trim());
      setEvent(data.event);
      setShowJoin(false);
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setJoining(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/soiree/${eventId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFindSpot = async () => {
    if (!event) return;
    const withAddress = event.participants.filter((p) => p.address);
    if (withAddress.length < 2) { setSpotError('Il faut au moins 2 participants avec une adresse.'); return; }

    setSpotError('');
    setFindingSpot(true);
    setTopSpots([]);
    setFindStep(1);

    try {
      // 1. Geocode addresses
      const geocoded: (LatLng & { formatted: string })[] = [];
      for (const p of withAddress) {
        const res = await fetch(`/api/geocode?address=${encodeURIComponent(p.address!)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(`Geocodage de "${p.address}" échoué`);
        geocoded.push(data);
      }

      // 2. Midpoint
      setFindStep(2);
      await sleep(200);
      const mid = getMidpoint(geocoded);

      // 3. Find bars
      setFindStep(3);
      let res = await fetch(`/api/places?lat=${mid.lat}&lng=${mid.lng}&radius=800`);
      let data = await res.json();
      let rawPlaces = data.places || [];
      if (rawPlaces.length < 3) {
        res = await fetch(`/api/places?lat=${mid.lat}&lng=${mid.lng}&radius=1500`);
        data = await res.json();
        rawPlaces = data.places || [];
      }

      let candidates: Place[] = rawPlaces
        .map((p: Omit<Place, 'dist'>) => ({ ...p, dist: haversine(mid.lat, mid.lng, p.lat, p.lng) }))
        .sort((a: Place, b: Place) => a.dist - b.dist)
        .slice(0, 10);

      // 4. Travel times
      setFindStep(4);
      try {
        const origins = geocoded.map((c) => `${c.lat},${c.lng}`).join('|');
        const destinations = candidates.map((p) => `${p.lat},${p.lng}`).join('|');
        const ttRes = await fetch(
          `/api/travel-times?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&mode=${event.mode}`
        );
        const ttData = await ttRes.json();
        if (ttData.matrix) {
          candidates = candidates.map((place, j) => ({
            ...place,
            travelTimes: ttData.matrix.map((row: (number | null)[]) => row[j]),
          }));
          candidates.sort((a, b) => {
            const vA = (a.travelTimes || []).filter((t): t is number => t !== null);
            const vB = (b.travelTimes || []).filter((t): t is number => t !== null);
            const maxA = vA.length ? Math.max(...vA) : Infinity;
            const maxB = vB.length ? Math.max(...vB) : Infinity;
            return maxA - maxB;
          });
        }
      } catch { /* use geo sort */ }

      await sleep(300);
      setTopSpots(candidates.slice(0, 5));
    } catch (e: unknown) {
      setSpotError(e instanceof Error ? e.message : 'Erreur lors de la recherche.');
    } finally {
      setFindingSpot(false);
      setFindStep(0);
    }
  };

  const STEPS = ['Géocodage des adresses', 'Calcul du point central', 'Recherche des bars', 'Optimisation des trajets'];

  // ── Loading / not found ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#555] text-[14px]">Chargement…</div>
      </div>
    );
  }
  if (notFound || !event) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-4 px-5">
        <div className="text-[48px]">😕</div>
        <p className="text-white text-[18px] font-semibold">Soirée introuvable</p>
        <p className="text-[#555] text-[13px]">Ce code ne correspond à aucune soirée active.</p>
        <button onClick={() => router.push('/soiree')} className="mt-4 px-6 py-3 bg-[#FF6B2C] text-white rounded-[12px] text-[14px] font-semibold">
          Retour
        </button>
      </div>
    );
  }

  const alreadyJoined = myName !== null;
  const withAddress = event.participants.filter((p) => p.address);
  const canFindSpot = withAddress.length >= 2;

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] px-5 py-8"
      style={{ backgroundImage: 'radial-gradient(ellipse 80% 35% at 50% 0%, rgba(255,107,44,0.07) 0%, transparent 65%)' }}
    >
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.push('/soiree')} className="text-[#555] text-[13px] hover:text-[#FF6B2C] transition-colors">
            ← Soirées
          </button>
          <div className="text-[16px] font-bold tracking-[-0.5px]">
            ZESP<span className="text-[#FF6B2C]">0</span>T
          </div>
        </div>

        {/* Event card */}
        <div className="bg-[#111] border border-[#2A2A2A] rounded-[20px] p-6 mb-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-[26px] font-bold tracking-[-1px] leading-tight">{event.name}</h1>
              <p className="text-[13px] text-[#FF6B2C] mt-1">{formatDate(event.date, event.time)}</p>
            </div>
            <div className="text-[32px] mt-1">🎉</div>
          </div>
          {event.description && (
            <p className="text-[13px] text-[#666] leading-relaxed mb-4 border-t border-[#1E1E1E] pt-3">{event.description}</p>
          )}
          <div className="flex items-center gap-4 text-[11px] text-[#444]">
            <span>Créé par <span className="text-[#888]">{event.createdBy}</span></span>
            <span>{MODE_ICON[event.mode]} {event.mode === 'walking' ? 'À pied' : event.mode === 'bicycling' ? 'Vélo' : 'Métro'}</span>
          </div>
        </div>

        {/* Invite section */}
        <div className="bg-[#111] border border-[#2A2A2A] rounded-[16px] p-4 mb-5 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[11px] text-[#555] uppercase tracking-[1px] mb-0.5">Code d&apos;invitation</p>
            <p className="text-[22px] font-bold tracking-[6px] text-white">{event.id}</p>
          </div>
          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-[10px] text-[12px] font-semibold border transition-all ${
              copied
                ? 'bg-[rgba(46,213,115,0.15)] border-[#2ed573] text-[#2ed573]'
                : 'bg-[#1A1A1A] border-[#2A2A2A] text-[#888] hover:border-[#FF6B2C] hover:text-[#FF6B2C]'
            }`}
          >
            {copied ? '✓ Copié !' : '🔗 Copier le lien'}
          </button>
        </div>

        {/* Participants */}
        <div className="bg-[#111] border border-[#2A2A2A] rounded-[16px] p-4 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold">
              Participants <span className="text-[#555] font-normal ml-1">({event.participants.length})</span>
            </p>
            {!alreadyJoined && (
              <button
                onClick={() => setShowJoin(!showJoin)}
                className="px-3 py-1.5 bg-[#FF6B2C] text-white text-[12px] font-semibold rounded-[8px] transition-all hover:bg-[#ff7d45]"
              >
                + Rejoindre
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {event.participants.map((p) => (
              <div key={p.id} className={`flex items-center gap-3 ${p.name === myName ? 'opacity-100' : 'opacity-80'}`}>
                <Avatar name={p.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white leading-none">
                    {p.name}
                    {p.name === event.createdBy && <span className="ml-2 text-[10px] text-[#FF6B2C] font-normal">organisateur</span>}
                    {p.name === myName && <span className="ml-2 text-[10px] text-[#2ed573] font-normal">toi</span>}
                  </p>
                  {p.address ? (
                    <p className="text-[11px] text-[#444] mt-0.5 truncate">{p.address}</p>
                  ) : (
                    <p className="text-[11px] text-[#333] mt-0.5">Pas d&apos;adresse</p>
                  )}
                </div>
                {p.address && <div className="w-1.5 h-1.5 rounded-full bg-[#2ed573] flex-shrink-0" />}
              </div>
            ))}
          </div>

          {/* Join form */}
          {showJoin && (
            <div className="mt-4 pt-4 border-t border-[#1E1E1E] flex flex-col gap-3">
              <p className="text-[12px] text-[#666]">Rejoins la soirée !</p>
              {joinError && <p className="text-[12px] text-[#ff6b6b]">{joinError}</p>}
              <input
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="Ton prénom *"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-[10px] px-3 py-2.5 text-[13px] text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B2C] transition-colors"
              />
              <input
                value={joinAddress}
                onChange={(e) => setJoinAddress(e.target.value)}
                placeholder="Ton adresse (pour trouver le spot)"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-[10px] px-3 py-2.5 text-[13px] text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B2C] transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowJoin(false)}
                  className="flex-1 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-[#666] text-[13px] rounded-[10px] transition-colors hover:border-[#444]"
                >
                  Annuler
                </button>
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="flex-1 py-2.5 bg-[#FF6B2C] text-white text-[13px] font-semibold rounded-[10px] transition-all hover:bg-[#ff7d45] disabled:opacity-50"
                >
                  {joining ? 'En cours...' : 'Confirmer'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Find spot section */}
        <div className="bg-[#111] border border-[#2A2A2A] rounded-[16px] p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[13px] font-semibold">Trouver le Spot 🎯</p>
              <p className="text-[11px] text-[#555] mt-0.5">
                {canFindSpot
                  ? `${withAddress.length} adresses disponibles — prêt à chercher`
                  : `${withAddress.length}/2 adresses minimum pour chercher`}
              </p>
            </div>
            <button
              onClick={handleFindSpot}
              disabled={!canFindSpot || findingSpot}
              className={`px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${
                canFindSpot && !findingSpot
                  ? 'bg-[#FF6B2C] text-white hover:bg-[#ff7d45] hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(255,107,44,0.3)]'
                  : 'bg-[#1A1A1A] text-[#444] cursor-not-allowed border border-[#2A2A2A]'
              }`}
            >
              {findingSpot ? '...' : 'Chercher'}
            </button>
          </div>

          {/* Loading steps */}
          {findingSpot && (
            <div className="flex flex-col gap-1.5 mt-3">
              {STEPS.map((s, i) => (
                <div key={i} className={`flex items-center gap-2 text-[12px] transition-all ${
                  i + 1 < findStep ? 'text-[#2ed573]' : i + 1 === findStep ? 'text-white' : 'text-[#333]'
                }`}>
                  <span>{i + 1 < findStep ? '✓' : i + 1 === findStep ? '⏳' : '○'}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}

          {spotError && (
            <p className="text-[12px] text-[#ff6b6b] mt-3">{spotError}</p>
          )}
        </div>

        {/* Results */}
        {topSpots.length > 0 && (
          <div className="flex flex-col gap-3 mb-8">
            <p className="text-[13px] font-semibold text-[#888]">Top spots pour votre soirée</p>
            {topSpots.map((spot, i) => {
              const maxTime = spot.travelTimes
                ? Math.max(...spot.travelTimes.filter((t): t is number => t !== null))
                : null;
              const mins = maxTime ? Math.round(maxTime / 60) : null;
              const photoSrc = spot.photo_reference
                ? `/api/photo?ref=${encodeURIComponent(spot.photo_reference)}&w=600`
                : null;

              return (
                <div
                  key={spot.place_id}
                  className={`rounded-[16px] overflow-hidden border ${
                    i === 0
                      ? 'border-[#FF6B2C] bg-[rgba(255,107,44,0.05)]'
                      : 'border-[#2A2A2A] bg-[#111]'
                  }`}
                >
                  {photoSrc && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoSrc} alt={spot.name} className="w-full h-[140px] object-cover" loading="eager" />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          {i === 0 && <span className="text-[10px] bg-[#FF6B2C] text-white px-2 py-0.5 rounded-full font-semibold">TOP PICK</span>}
                          <h3 className="text-[15px] font-semibold">{spot.name}</h3>
                        </div>
                        {spot.address && <p className="text-[11px] text-[#555] mt-0.5">{spot.address}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {mins && <p className="text-[12px] text-[#FF6B2C] font-semibold">max {mins} min</p>}
                        {spot.rating && <p className="text-[11px] text-[#666]">★ {spot.rating.toFixed(1)}</p>}
                      </div>
                    </div>
                    {spot.travelTimes && (
                      <div className="flex gap-1.5 flex-wrap mt-3">
                        {event.participants.filter((p) => p.address).map((p, idx) => {
                          const t = spot.travelTimes![idx];
                          const m = t ? Math.round(t / 60) : null;
                          return (
                            <span key={p.id} className="px-2 py-0.5 bg-[#1A1A1A] rounded-full text-[10px] text-[#888]">
                              {MODE_ICON[event.mode]} {p.name} {m ? `${m} min` : '?'}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
