'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SoireeEvent, TransportMode, SpotVibe, SpotFilters, ChosenZespot } from '@/lib/types';
import { storage } from '@/lib/storage';

type View = 'list' | 'create' | 'join';

// ── Helpers ───────────────────────────────────────────────────────

function formatDate(dateStr: string, timeStr?: string) {
  const d = new Date(dateStr + 'T12:00:00');
  const date = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  return timeStr ? `${date} · ${timeStr}` : date;
}

function isUpcoming(dateStr: string) {
  const d = new Date(dateStr + 'T23:59:59');
  return d >= new Date();
}

// ── Create form constants ─────────────────────────────────────────

const MODE_OPTS: { value: TransportMode; icon: string; label: string }[] = [
  { value: 'walking', icon: '🚶', label: 'À pied' },
  { value: 'bicycling', icon: '🚲', label: 'Vélo' },
  { value: 'transit', icon: '🚇', label: 'Métro' },
];

const VIBE_OPTS: { value: SpotVibe; icon: string; label: string }[] = [
  { value: 'darts',     icon: '🎯', label: 'Fléchettes' },
  { value: 'billiard',  icon: '🎱', label: 'Billard' },
  { value: 'sports',    icon: '⚽', label: 'Sportif' },
  { value: 'cocktails', icon: '🍸', label: 'Cocktails' },
  { value: 'live',      icon: '🎵', label: 'Live' },
  { value: 'terrace',   icon: '🌿', label: 'Terrasse' },
  { value: 'games',     icon: '🎮', label: 'Jeux' },
  { value: 'rooftop',   icon: '🌆', label: 'Rooftop' },
];

// ── Inner component (needs useSearchParams) ───────────────────────

function EvenementsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialView = (searchParams.get('view') as View) || 'list';
  const [view, setView] = useState<View>(initialView);

  // Events list
  const [events, setEvents] = useState<SoireeEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [zespots, setZespots] = useState<ChosenZespot[]>([]);

  // Create form
  const [eventName, setEventName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [creatorAddress, setCreatorAddress] = useState('');
  const [mode, setMode] = useState<TransportMode>('transit');
  const [vibes, setVibes] = useState<SpotVibe[]>([]);
  const [price, setPrice] = useState<1 | 2 | 3 | undefined>(undefined);
  const [openNow, setOpenNow] = useState(false);
  const [creating, setCreating] = useState(false);

  // Join form
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const [error, setError] = useState('');

  // Load user data + events
  useEffect(() => {
    if (storage.userName) setCreatorName(storage.userName);
    if (storage.myAddress) setCreatorAddress(storage.myAddress);

    // Load chosen zespots
    setZespots(storage.chosenZespots as ChosenZespot[]);

    const eventIds = storage.myEventIds;
    if (eventIds.length === 0) return;

    setLoadingEvents(true);
    Promise.all(
      eventIds.map(async (id) => {
        try {
          const res = await fetch(`/api/event?id=${id}`);
          if (!res.ok) return null;
          const data = await res.json();
          return data.event as SoireeEvent;
        } catch { return null; }
      })
    ).then((evs) => {
      const valid = evs.filter(Boolean) as SoireeEvent[];
      valid.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(valid);
      setLoadingEvents(false);
    });
  }, []);

  const upcoming = events.filter((e) => isUpcoming(e.date));
  const past = events.filter((e) => !isUpcoming(e.date));

  // ── Create ────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!eventName.trim() || !date || !creatorName.trim()) {
      setError("Remplis le nom de l'événement, la date et ton prénom.");
      return;
    }
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eventName.trim(),
          date,
          time: time || undefined,
          description: description.trim() || undefined,
          createdBy: creatorName.trim(),
          creatorAddress: creatorAddress.trim() || undefined,
          mode,
          filters: { vibes, price: price || undefined, openNow: openNow || undefined } as SpotFilters,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      storage.setEventMeta(data.id, { name: creatorName.trim(), isCreator: true });
      storage.addEventId(data.id);
      router.push(`/soiree/${data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création.');
      setCreating(false);
    }
  };

  // ── Join ──────────────────────────────────────────────────────────
  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError("Entre le code de l'événement."); return; }
    setError('');
    setJoining(true);
    try {
      const res = await fetch(`/api/event?id=${trimmed}`);
      if (!res.ok) { setError("Code invalide — vérifie avec l'organisateur."); setJoining(false); return; }
      storage.addEventId(trimmed);
      router.push(`/soiree/${trimmed}`);
    } catch {
      setError('Erreur réseau.');
      setJoining(false);
    }
  };

  // ── LIST VIEW ─────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div
        className="min-h-screen bg-[#0A0A0A] px-5 pt-12 pb-28"
        style={{ backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,107,44,0.08) 0%, transparent 60%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[28px] font-bold tracking-[-1px]">Événements</h1>
          <button
            onClick={() => { setError(''); setView('create'); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B2C] rounded-full text-white text-[13px] font-semibold transition-all hover:bg-[#ff7d45] active:scale-95"
          >
            <span className="text-[16px] leading-none">+</span> Nouveau
          </button>
        </div>

        {/* Chosen Zespots */}
        {zespots.length > 0 && (
          <div className="mb-7">
            <p className="text-[11px] text-[#444] uppercase tracking-[1.5px] font-semibold mb-3 px-1">Mes Zespots 🍺 · {zespots.length}</p>
            <div className="flex flex-col gap-2.5">
              {zespots.map((z) => (
                <div
                  key={z.id}
                  className="bg-[#111] border border-[#1E1E1E] rounded-[16px] p-3.5 transition-all hover:border-[#2A2A2A]"
                >
                  <div className="flex items-center gap-3">
                    {/* Thumbnail */}
                    <div className="w-[52px] h-[52px] rounded-[12px] overflow-hidden flex-shrink-0 bg-[#1A1A1A] flex items-center justify-center">
                      {z.photo_reference ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/photo?ref=${encodeURIComponent(z.photo_reference)}&w=200`}
                          alt={z.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[22px] opacity-40">🍺</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-white truncate">{z.name}</p>
                      <p className="text-[11px] text-[#555] truncate mt-0.5">{z.address}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {z.rating != null && (
                          <span className="text-[10px] text-[#FFD700] font-semibold">★ {z.rating.toFixed(1)}</span>
                        )}
                        <span className="text-[10px] text-[#333]">
                          {new Date(z.chosenAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[rgba(255,107,44,0.12)] flex items-center justify-center flex-shrink-0">
                      <span className="text-[12px]">✓</span>
                    </div>
                  </div>

                  {/* Meeting time row */}
                  <div className="mt-3 pt-3 border-t border-[#1A1A1A] flex items-center gap-2.5">
                    <span className="text-[14px] flex-shrink-0">🕐</span>
                    <div className="flex-1">
                      <p className="text-[10px] text-[#444] uppercase tracking-[0.8px] mb-0.5">Heure du RDV</p>
                      <input
                        type="time"
                        defaultValue={z.meetingTime || ''}
                        onChange={(e) => {
                          const t = e.target.value;
                          const updated = (storage.chosenZespots as ChosenZespot[]).map((s) =>
                            s.id === z.id ? { ...s, meetingTime: t || undefined } : s
                          );
                          storage.setChosenZespots(updated);
                          setZespots(updated);
                        }}
                        className="bg-transparent text-white text-[14px] font-semibold outline-none w-full placeholder-[#333]"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                    {z.meetingTime && (
                      <span className="text-[13px] font-bold text-[#FF6B2C] flex-shrink-0">{z.meetingTime}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejoindre pill */}
        <button
          onClick={() => { setError(''); setView('join'); }}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-[#141414] border border-[#2A2A2A] rounded-[14px] mb-6 transition-all hover:border-[#3A3A3A] active:scale-[0.98]"
        >
          <span className="text-[20px]">🔗</span>
          <div className="flex-1 text-left">
            <p className="text-[14px] font-medium text-white">Rejoindre un Zespot</p>
            <p className="text-[11px] text-[#555]">Entre le code partagé par l&apos;organisateur</p>
          </div>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        {loadingEvents ? (
          <div className="text-[13px] text-[#444] text-center py-8">Chargement…</div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-[52px] mb-4">🎉</div>
            <p className="text-white text-[17px] font-semibold mb-2">Aucun événement</p>
            <p className="text-[13px] text-[#555] mb-6">Crée ton premier Zespot ou rejoins-en un.</p>
            <button
              onClick={() => setView('create')}
              className="px-6 py-3 bg-[#FF6B2C] text-white rounded-[12px] text-[14px] font-semibold"
            >
              Créer un événement
            </button>
          </div>
        ) : (
          <>
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div className="mb-6">
                <p className="text-[11px] text-[#444] uppercase tracking-[1.5px] font-semibold mb-3 px-1">À venir · {upcoming.length}</p>
                <div className="flex flex-col gap-3">
                  {upcoming.map((ev) => (
                    <EventCard key={ev.id} event={ev} onClick={() => router.push(`/soiree/${ev.id}`)} />
                  ))}
                </div>
              </div>
            )}

            {/* Past */}
            {past.length > 0 && (
              <div>
                <p className="text-[11px] text-[#444] uppercase tracking-[1.5px] font-semibold mb-3 px-1">Passés · {past.length}</p>
                <div className="flex flex-col gap-3 opacity-60">
                  {past.map((ev) => (
                    <EventCard key={ev.id} event={ev} onClick={() => router.push(`/soiree/${ev.id}`)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── CREATE / JOIN FORMS ───────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#0A0A0A] px-5 py-8 pb-28"
      style={{ backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,107,44,0.07) 0%, transparent 70%)' }}
    >
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => { setView('list'); setError(''); }}
          className="text-[#555] text-[13px] mb-7 hover:text-[#FF6B2C] transition-colors"
        >
          ← Retour
        </button>

        <h1 className="text-[26px] font-bold tracking-[-1px] leading-tight mb-7">
          {view === 'create' ? '✨ Créer un événement' : '🔗 Rejoindre un Zespot'}
        </h1>

        {error && (
          <div className="mb-5 px-4 py-3 bg-[rgba(255,59,48,0.1)] border border-[rgba(255,59,48,0.3)] rounded-[10px] text-[#ff6b6b] text-[13px]">
            {error}
          </div>
        )}

        {/* CREATE FORM */}
        {view === 'create' && (
          <div className="flex flex-col gap-4">
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Nom de l'événement *"
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-[12px] px-4 py-3.5 text-[14px] text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B2C] transition-colors"
            />
            <div className="flex gap-3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 bg-[#141414] border border-[#2A2A2A] rounded-[12px] px-4 py-3.5 text-[14px] text-white focus:outline-none focus:border-[#FF6B2C] transition-colors"
                style={{ colorScheme: 'dark' }}
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-[110px] bg-[#141414] border border-[#2A2A2A] rounded-[12px] px-4 py-3.5 text-[14px] text-white focus:outline-none focus:border-[#FF6B2C] transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optionnel)"
              rows={2}
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-[12px] px-4 py-3.5 text-[14px] text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B2C] transition-colors resize-none"
            />

            <div className="border-t border-[#1C1C1C] pt-4">
              <p className="text-[11px] text-[#555] uppercase tracking-[1px] mb-3">Ton profil</p>
              <input
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Ton prénom *"
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-[12px] px-4 py-3.5 text-[14px] text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B2C] transition-colors"
              />
              <input
                value={creatorAddress}
                onChange={(e) => setCreatorAddress(e.target.value)}
                placeholder="Ton adresse"
                className="w-full mt-3 bg-[#141414] border border-[#2A2A2A] rounded-[12px] px-4 py-3.5 text-[14px] text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B2C] transition-colors"
              />
            </div>

            <div>
              <p className="text-[11px] text-[#555] uppercase tracking-[1px] mb-2">Transport</p>
              <div className="flex gap-2">
                {MODE_OPTS.map((m) => (
                  <button key={m.value} onClick={() => setMode(m.value)}
                    className={`flex-1 py-2.5 rounded-[10px] text-[12px] font-medium border transition-all ${mode === m.value ? 'bg-[rgba(255,107,44,0.15)] border-[#FF6B2C] text-[#FF6B2C]' : 'bg-[#141414] border-[#2A2A2A] text-[#666]'}`}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="border-t border-[#1C1C1C] pt-4">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[11px] text-[#555] uppercase tracking-[1px]">Filtres spot</p>
                <span className="text-[10px] text-[#FF6B2C] bg-[rgba(255,107,44,0.1)] px-2 py-0.5 rounded-full">Optionnel</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {VIBE_OPTS.map((v) => {
                  const active = vibes.includes(v.value);
                  return (
                    <button key={v.value} type="button"
                      onClick={() => setVibes(active ? vibes.filter((x) => x !== v.value) : [...vibes, v.value])}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-medium border transition-all ${active ? 'bg-[rgba(255,107,44,0.15)] border-[#FF6B2C] text-[#FF6B2C]' : 'bg-[#141414] border-[#2A2A2A] text-[#666]'}`}>
                      {v.icon} {v.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                {([1,2,3] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setPrice(price === p ? undefined : p)}
                    className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold border transition-all ${price === p ? 'bg-[rgba(255,107,44,0.15)] border-[#FF6B2C] text-[#FF6B2C]' : 'bg-[#141414] border-[#2A2A2A] text-[#666]'}`}>
                    {'€'.repeat(p)}
                  </button>
                ))}
                <button type="button" onClick={() => setOpenNow(!openNow)}
                  className={`flex-1 py-2 rounded-[10px] text-[12px] font-medium border transition-all ${openNow ? 'bg-[rgba(255,107,44,0.15)] border-[#FF6B2C] text-[#FF6B2C]' : 'bg-[#141414] border-[#2A2A2A] text-[#666]'}`}>
                  ✅ Ouvert
                </button>
              </div>
            </div>

            <button onClick={handleCreate} disabled={creating}
              className="w-full py-4 bg-[#FF6B2C] text-white text-[15px] font-semibold rounded-[14px] mt-1 transition-all hover:bg-[#ff7d45] disabled:opacity-50">
              {creating ? 'Création...' : "Créer l'événement →"}
            </button>
          </div>
        )}

        {/* JOIN FORM */}
        {view === 'join' && (
          <div className="flex flex-col gap-4">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-[12px] px-4 py-4 text-[22px] font-bold text-white text-center placeholder-[#333] tracking-[8px] focus:outline-none focus:border-[#FF6B2C] transition-colors uppercase"
            />
            <p className="text-[11px] text-[#444] text-center -mt-2">Demande le code à l&apos;organisateur</p>
            <button onClick={handleJoin} disabled={joining}
              className="w-full py-4 bg-[#FF6B2C] text-white text-[15px] font-semibold rounded-[14px] transition-all hover:bg-[#ff7d45] disabled:opacity-50">
              {joining ? 'Recherche...' : "Accéder à l'événement →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────

function EventCard({ event, onClick }: { event: SoireeEvent; onClick: () => void }) {
  const upcoming = isUpcoming(event.date);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 bg-[#111] border border-[#1E1E1E] rounded-[16px] p-4 text-left transition-all hover:border-[#2A2A2A] active:scale-[0.98]"
    >
      <div
        className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[20px] flex-shrink-0"
        style={{ background: upcoming ? 'rgba(255,107,44,0.12)' : 'rgba(255,255,255,0.04)' }}
      >
        🎉
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-white truncate">{event.name}</p>
        <p className="text-[11px] text-[#555] mt-0.5">{formatDate(event.date, event.time)}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-[#444]">{event.participants.length} participant{event.participants.length > 1 ? 's' : ''}</span>
          {upcoming && <span className="text-[10px] text-[#FF6B2C] font-medium bg-[rgba(255,107,44,0.1)] px-1.5 py-0.5 rounded-full">À venir</span>}
        </div>
      </div>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  );
}

// ── Page wrapper (Suspense for useSearchParams) ───────────────────

export default function EvenementsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#FF6B2C] border-t-transparent animate-spin" />
      </div>
    }>
      <EvenementsInner />
    </Suspense>
  );
}
