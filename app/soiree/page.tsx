'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TransportMode } from '@/lib/types';

const MODE_OPTS: { value: TransportMode; icon: string; label: string }[] = [
  { value: 'walking', icon: '🚶', label: 'À pied' },
  { value: 'bicycling', icon: '🚲', label: 'Vélo' },
  { value: 'transit', icon: '🚇', label: 'Métro' },
];

export default function SoireePage() {
  const router = useRouter();

  // Create form
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [eventName, setEventName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [creatorAddress, setCreatorAddress] = useState('');
  const [mode, setMode] = useState<TransportMode>('transit');
  const [creating, setCreating] = useState(false);

  // Join form
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!eventName.trim() || !date || !creatorName.trim()) {
      setError('Remplis le nom de l'événement, la date et ton prénom.');
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Store creator identity in sessionStorage
      sessionStorage.setItem(`event_${data.id}_me`, JSON.stringify({ name: creatorName.trim(), isCreator: true }));
      router.push(`/soiree/${data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création.');
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError('Entre le code de l'événement.'); return; }
    setError('');
    setJoining(true);
    try {
      const res = await fetch(`/api/event?id=${trimmed}`);
      if (!res.ok) { setError('Code invalide — vérifie avec l\'organisateur.'); setJoining(false); return; }
      router.push(`/soiree/${trimmed}`);
    } catch {
      setError('Erreur réseau.');
      setJoining(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] px-5 py-8"
      style={{ backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,107,44,0.08) 0%, transparent 70%)' }}
    >
      {/* Header */}
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push('/')} className="text-[#555] text-[13px] mb-8 hover:text-[#FF6B2C] transition-colors">
          ← Accueil
        </button>

        <h1 className="text-[36px] font-bold tracking-[-2px] leading-tight mb-1">
          Organisez votre
        </h1>
        <h1 className="text-[36px] font-bold tracking-[-2px] leading-tight mb-8">
          soirée <span className="text-[#FF6B2C]">🎉</span>
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-[#141414] rounded-[12px] border border-[#2A2A2A]">
          {(['create', 'join'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2.5 text-[13px] font-semibold rounded-[10px] transition-all ${
                tab === t
                  ? 'bg-[#FF6B2C] text-white'
                  : 'text-[#666] hover:text-white'
              }`}
            >
              {t === 'create' ? '✨ Créer un événement' : '🔗 Rejoindre'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 px-4 py-3 bg-[rgba(255,59,48,0.1)] border border-[rgba(255,59,48,0.3)] rounded-[10px] text-[#ff6b6b] text-[13px]">
            {error}
          </div>
        )}

        {/* CREATE FORM */}
        {tab === 'create' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] text-[#555] uppercase tracking-[1px] mb-1.5 block">Nom de l'événement *</label>
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Événement 30 ans de Paul, After work..."
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
              <div className="w-[120px]">
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
                placeholder="Infos supplémentaires, thème, tenue..."
                rows={2}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-[10px] px-4 py-3 text-[14px] text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B2C] transition-colors resize-none"
              />
            </div>

            <div className="border-t border-[#1C1C1C] pt-4">
              <p className="text-[11px] text-[#555] uppercase tracking-[1px] mb-3">Ton profil</p>
              <div className="flex gap-3">
                <input
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="Ton prénom *"
                  className="flex-1 bg-[#141414] border border-[#2A2A2A] rounded-[10px] px-4 py-3 text-[14px] text-white placeholder-[#444] focus:outline-none focus:border-[#FF6B2C] transition-colors"
                />
              </div>
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

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-4 bg-[#FF6B2C] text-white text-[15px] font-semibold rounded-[14px] mt-2 transition-all hover:bg-[#ff7d45] hover:-translate-y-[1px] hover:shadow-[0_10px_32px_rgba(255,107,44,0.28)] disabled:opacity-50 disabled:translate-y-0"
            >
              {creating ? 'Création...' : 'Créer l'événement →'}
            </button>
          </div>
        )}

        {/* JOIN FORM */}
        {tab === 'join' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] text-[#555] uppercase tracking-[1px] mb-1.5 block">Code de l'événement</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC123"
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
              {joining ? 'Recherche...' : 'Accéder à l'événement →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
