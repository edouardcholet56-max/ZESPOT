'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TransportMode, SpotVibe, SpotFilters } from '@/lib/types';

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
    const name = sessionStorage.getItem('userName') || '';
    setUserName(name);
    if (name) setCreatorName(name);
    const addr = sessionStorage.getItem('myAddress') || '';
    if (addr) setCreatorAddress(addr);
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
      sessionStorage.setItem(`event_${data.id}_me`, JSON.stringify({ name: creatorName.trim(), isCreator: true }));
      // Track in profile
      const ids: string[] = JSON.parse(sessionStorage.getItem('myEventIds') || '[]');
      if (!ids.includes(data.id)) sessionStorage.setItem('myEventIds', JSON.stringify([data.id, ...ids]));
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
      <div
        className="min-h-screen bg-[#0A0A0A] flex flex-col px-6 pb-28"
        style={{ backgroundImage: 'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(255,107,44,0.10) 0%, transparent 65%)' }}
      >
        {/* Top */}
        <div className="pt-14 mb-10">
          <p className="text-[13px] text-[#555] mb-1">
            {userName ? `Salut ${userName} 👋` : 'Bienvenue 👋'}
          </p>
          <h1 className="text-[34px] font-bold tracking-[-1.5px] leading-tight">
            Crée ton<br />
            <span className="text-[#FF6B2C]">ZESP<span className="text-white">0</span>T</span>
          </h1>
        </div>

        {/* Main CTA */}
        <button
          onClick={() => { setError(''); setView('create'); }}
          className="w-full rounded-[20px] p-5 mb-4 text-left transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #FF6B2C 0%, #ff9a5c 100%)',
            boxShadow: '0 12px 40px rgba(255,107,44,0.35)',
          }}
        >
          <div className="text-[36px] mb-3">🎉</div>
          <p className="text-white text-[11px] font-semibold uppercase tracking-[1.5px] mb-1 opacity-80">Nouveau</p>
          <h2 className="text-white text-[22px] font-bold tracking-[-0.5px]">Créer un Zespot</h2>
          <p className="text-white/70 text-[13px] mt-1">Organise un événement, invite tes amis.</p>
        </button>

        {/* Secondary CTA */}
        <button
          onClick={() => { setError(''); setView('join'); }}
          className="w-full rounded-[20px] p-5 text-left bg-[#141414] border border-[#2A2A2A] transition-all active:scale-[0.98] hover:border-[#3A3A3A]"
        >
          <div className="text-[36px] mb-3">🔗</div>
          <p className="text-[#888] text-[11px] font-semibold uppercase tracking-[1.5px] mb-1">Invité</p>
          <h2 className="text-white text-[22px] font-bold tracking-[-0.5px]">Rejoindre un Zespot</h2>
          <p className="text-[#555] text-[13px] mt-1">Entre le code partagé par l&apos;organisateur.</p>
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
