'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TransportMode, SpotVibe, SpotFilters } from '@/lib/types';
import { storage } from '@/lib/storage';

type View = 'home' | 'create' | 'join';

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

const PRICE_OPTS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: '€' },
  { value: 2, label: '€€' },
  { value: 3, label: '€€€' },
];

export default function SoireePage() {
  const router = useRouter();
  const [view, setView] = useState<View>('home');
  const [userName, setUserName] = useState('');

  // Event form
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
  const [lateClosure, setLateClosure] = useState(false);
  const [creating, setCreating] = useState(false);

  // Join form
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    setUserName(storage.userName);
    if (storage.userName) setCreatorName(storage.userName);
    if (storage.myAddress) setCreatorAddress(storage.myAddress);
  }, []);

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
          filters: {
            vibes,
            price: price || undefined,
            openNow: openNow || undefined,
            lateClosure: lateClosure || undefined,
          } as SpotFilters,
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

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError("Entre le code de l'événement."); return; }
    setError('');
    setJoining(true);
    try {
      const res = await fetch(`/api/event?id=${trimmed}`);
      if (!res.ok) { setError("Code invalide — vérifie avec l'organisateur."); setJoining(false); return; }
      router.push(`/soiree/${trimmed}`);
    } catch {
      setError('Erreur réseau.');
      setJoining(false);
    }
  };

  // ── Home screen ───────────────────────────────────────────────────
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col px-5 pb-10 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-0 right-0 h-[340px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(255,107,44,0.13) 0%, transparent 70%)' }} />

        {/* Top bar */}
        <div className="flex items-center justify-between pt-14 mb-8 relative">
          <div>
            <p className="text-[12px] text-[#555] mb-0.5 tracking-wide">
              {userName ? `Salut ${userName} 👋` : 'Bienvenue 👋'}
            </p>
            <h1 className="text-[32px] font-bold tracking-[-1.5px] leading-[1.1]">
              ZESP<span className="text-[#FF6B2C]">0</span>T
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/profile')}
              className="w-9 h-9 bg-[#141414] border border-[#222] rounded-full flex items-center justify-center transition-all hover:border-[#FF6B2C] active:scale-90"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Card 1: Créer un Zespot (hero) ── */}
        <button
          onClick={() => router.push('/find')}
          className="w-full rounded-[22px] overflow-hidden mb-3 text-left transition-all active:scale-[0.97] relative"
          style={{
            background: 'linear-gradient(145deg, #FF6B2C 0%, #e8551f 60%, #c94010 100%)',
            boxShadow: '0 16px 48px rgba(255,107,44,0.35)',
          }}
        >
          {/* Decorative circles */}
          <div className="absolute top-[-30px] right-[-30px] w-[140px] h-[140px] rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute bottom-[-40px] right-[20px] w-[100px] h-[100px] rounded-full bg-white/5 pointer-events-none" />

          <div className="px-6 py-6 relative">
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 bg-white/15 rounded-[14px] flex items-center justify-center text-[24px]">
                🍺
              </div>
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
            <p className="text-white/70 text-[11px] font-semibold uppercase tracking-[2px] mb-1">Spot</p>
            <h2 className="text-white text-[24px] font-bold tracking-[-0.5px]">Créer un Zespot</h2>
            <p className="text-white/60 text-[13px] mt-1.5">Trouve le bar idéal pour tout le groupe en quelques secondes.</p>
          </div>
        </button>

        {/* ── Cards 2 & 3 (side by side) ── */}
        <div className="flex gap-3 mb-3">
          {/* Rejoindre */}
          <button
            onClick={() => router.push('/evenements?view=join')}
            className="flex-1 rounded-[18px] p-4 text-left bg-[#131313] border border-[#1E1E1E] transition-all active:scale-[0.96] hover:border-[#2A2A2A] hover:bg-[#161616]"
          >
            <div className="w-10 h-10 bg-[#1E1E1E] rounded-[12px] flex items-center justify-center text-[18px] mb-4">
              🔗
            </div>
            <p className="text-[#555] text-[10px] font-semibold uppercase tracking-[1.5px] mb-0.5">Invité</p>
            <h3 className="text-white text-[15px] font-bold leading-snug">Rejoindre un Zespot</h3>
          </button>

          {/* Créer un événement */}
          <button
            onClick={() => router.push('/evenements?view=create')}
            className="flex-1 rounded-[18px] p-4 text-left bg-[#131313] border border-[#1E1E1E] transition-all active:scale-[0.96] hover:border-[#2A2A2A] hover:bg-[#161616]"
          >
            <div className="w-10 h-10 bg-[#1E1E1E] rounded-[12px] flex items-center justify-center text-[18px] mb-4">
              🎉
            </div>
            <p className="text-[#555] text-[10px] font-semibold uppercase tracking-[1.5px] mb-0.5">Événement</p>
            <h3 className="text-white text-[15px] font-bold leading-snug">Créer un événement</h3>
          </button>
        </div>

        {/* ── Quick access to events ── */}
        <button
          onClick={() => router.push('/evenements')}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-transparent border border-[#1A1A1A] rounded-[14px] text-left transition-all hover:border-[#252525] active:scale-[0.98]"
        >
          <span className="text-[18px]">📅</span>
          <p className="flex-1 text-[13px] text-[#444]">Voir mes événements</p>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    );
  }

  // ── Create / Join forms ───────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#0A0A0A] px-5 py-8 pb-28"
      style={{ backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,107,44,0.07) 0%, transparent 70%)' }}
    >
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => { setView('home'); setError(''); }}
          className="text-[#555] text-[13px] mb-8 hover:text-[#FF6B2C] transition-colors"
        >
          ← Retour
        </button>

        <h1 className="text-[28px] font-bold tracking-[-1px] leading-tight mb-8">
          {view === 'create' ? '✨ Créer un événement' : '🔗 Rejoindre un Zespot'}
        </h1>

        {/* Error */}
        {error && (
          <div className="mb-5 px-4 py-3 bg-[rgba(255,59,48,0.1)] border border-[rgba(255,59,48,0.3)] rounded-[10px] text-[#ff6b6b] text-[13px]">
            {error}
          </div>
        )}

        {/* CREATE FORM */}
        {view === 'create' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] text-[#555] uppercase tracking-[1px] mb-1.5 block">Nom de l&apos;événement *</label>
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Anniversaire de Paul, After work..."
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-[10px] px-4 py-3 text-[14px] text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B2C] transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-[#555] uppercase tracking-[1px] mb-1.5 block">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-[10px] px-4 py-3 text-[14px] text-white focus:outline-none focus:border-[#FF6B2C] transition-colors"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="w-[110px]">
                <label className="text-[11px] text-[#555] uppercase tracking-[1px] mb-1.5 block">Heure</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-[10px] px-4 py-3 text-[14px] text-white focus:outline-none focus:border-[#FF6B2C] transition-colors"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#555] uppercase tracking-[1px] mb-1.5 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Infos, thème, tenue..."
                rows={2}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-[10px] px-4 py-3 text-[14px] text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B2C] transition-colors resize-none"
              />
            </div>

            <div className="border-t border-[#1C1C1C] pt-4">
              <p className="text-[11px] text-[#555] uppercase tracking-[1px] mb-3">Ton profil</p>
              <input
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Ton prénom *"
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-[10px] px-4 py-3 text-[14px] text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B2C] transition-colors"
              />
              <input
                value={creatorAddress}
                onChange={(e) => setCreatorAddress(e.target.value)}
                placeholder="Ton adresse (pour trouver le spot)"
                className="w-full mt-3 bg-[#141414] border border-[#2A2A2A] rounded-[10px] px-4 py-3 text-[14px] text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B2C] transition-colors"
              />
            </div>

            <div>
              <p className="text-[11px] text-[#555] uppercase tracking-[1px] mb-2">Moyen de transport</p>
              <div className="flex gap-2">
                {MODE_OPTS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    className={`flex-1 py-2.5 rounded-[10px] text-[12px] font-medium border transition-all ${
                      mode === m.value
                        ? 'bg-[rgba(255,107,44,0.15)] border-[#FF6B2C] text-[#FF6B2C]'
                        : 'bg-[#141414] border-[#2A2A2A] text-[#666] hover:border-[#444]'
                    }`}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FILTERS */}
            <div className="border-t border-[#1C1C1C] pt-4">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[11px] text-[#555] uppercase tracking-[1px]">Filtres pour le spot</p>
                <span className="text-[10px] text-[#FF6B2C] bg-[rgba(255,107,44,0.1)] px-2 py-0.5 rounded-full font-medium">Optionnel</span>
              </div>

              {/* Vibes */}
              <p className="text-[11px] text-[#444] mb-2">Ambiance</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {VIBE_OPTS.map((v) => {
                  const active = vibes.includes(v.value);
                  return (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => setVibes(active ? vibes.filter((x) => x !== v.value) : [...vibes, v.value])}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-medium border transition-all ${
                        active
                          ? 'bg-[rgba(255,107,44,0.15)] border-[#FF6B2C] text-[#FF6B2C]'
                          : 'bg-[#141414] border-[#2A2A2A] text-[#666] hover:border-[#3A3A3A]'
                      }`}
                    >
                      <span>{v.icon}</span>
                      <span>{v.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Price */}
              <p className="text-[11px] text-[#444] mb-2">Budget</p>
              <div className="flex gap-2 mb-4">
                {PRICE_OPTS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPrice(price === p.value ? undefined : p.value)}
                    className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold border transition-all ${
                      price === p.value
                        ? 'bg-[rgba(255,107,44,0.15)] border-[#FF6B2C] text-[#FF6B2C]'
                        : 'bg-[#141414] border-[#2A2A2A] text-[#666] hover:border-[#3A3A3A]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Toggles */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpenNow(!openNow)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[12px] font-medium border transition-all ${
                    openNow
                      ? 'bg-[rgba(255,107,44,0.15)] border-[#FF6B2C] text-[#FF6B2C]'
                      : 'bg-[#141414] border-[#2A2A2A] text-[#666] hover:border-[#3A3A3A]'
                  }`}
                >
                  ✅ Ouvert
                </button>
                <button
                  type="button"
                  onClick={() => setLateClosure(!lateClosure)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[12px] font-medium border transition-all ${
                    lateClosure
                      ? 'bg-[rgba(255,107,44,0.15)] border-[#FF6B2C] text-[#FF6B2C]'
                      : 'bg-[#141414] border-[#2A2A2A] text-[#666] hover:border-[#3A3A3A]'
                  }`}
                >
                  🌙 Ferme tard
                </button>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-4 bg-[#FF6B2C] text-white text-[15px] font-semibold rounded-[14px] mt-2 transition-all hover:bg-[#ff7d45] hover:-translate-y-[1px] hover:shadow-[0_10px_32px_rgba(255,107,44,0.28)] disabled:opacity-50 disabled:translate-y-0"
            >
              {creating ? 'Création...' : "Créer l'événement →"}
            </button>
          </div>
        )}

        {/* JOIN FORM */}
        {view === 'join' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] text-[#555] uppercase tracking-[1px] mb-1.5 block">Code de l&apos;événement</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-[10px] px-4 py-3 text-[20px] font-bold text-white text-center placeholder-[#333] tracking-[8px] focus:outline-none focus:border-[#FF6B2C] transition-colors uppercase"
              />
              <p className="text-[11px] text-[#444] mt-2 text-center">Demande le code à l&apos;organisateur</p>
            </div>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-4 bg-[#FF6B2C] text-white text-[15px] font-semibold rounded-[14px] transition-all hover:bg-[#ff7d45] hover:-translate-y-[1px] hover:shadow-[0_10px_32px_rgba(255,107,44,0.28)] disabled:opacity-50"
            >
              {joining ? 'Recherche...' : "Accéder à l'événement →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
