'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Session } from '@/lib/types';
import { storage } from '@/lib/storage';

const MODE_LABELS: Record<string, string> = {
  walking: '🚶 À pied',
  bicycling: '🚲 Vélo',
  transit: '🚇 Transport',
};

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-[#FF6B2C]/15 border border-[#FF6B2C]/30 flex items-center justify-center text-[13px] font-bold text-[#FF6B2C] flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function JoinPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const seenNamesRef = useRef<Set<string>>(new Set());

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/session?id=${id}`);
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) return;
      const data: Session = await res.json();
      setSession(data);
    } catch {
      // silent — will retry
    }
  };

  useEffect(() => {
    if (storage.userName) setName(storage.userName);
    if (storage.myAddress) setAddress(storage.myAddress);

    fetchSession();
    const interval = setInterval(fetchSession, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handleJoin = async () => {
    if (!name.trim() || !address.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/session/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), address: address.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setSession(data);
      setJoined(true);
      storage.userName = name.trim();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de rejoindre.');
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-5">
        <div className="text-center">
          <h1 className="text-[42px] font-bold tracking-[-2px] mb-3">
            ZESP<span className="text-[#FF6B2C]">0</span>T
          </h1>
          <p className="text-[#555] text-[14px]">Session introuvable ou expirée.</p>
        </div>
      </div>
    );
  }

  const creator = session?.participants[0];

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-5 py-12"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,107,44,0.07) 0%, transparent 70%)',
      }}
    >
      <div className="w-full max-w-[420px]">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[42px] font-bold tracking-[-2px] leading-none">
            ZESP<span className="text-[#FF6B2C]">0</span>T
          </h1>
          {creator && (
            <p className="text-[13px] text-[#888] mt-2">
              Session de <span className="text-white font-medium">{creator.name}</span>
              {session?.mode && (
                <span className="ml-2 text-[#555]">· {MODE_LABELS[session.mode]}</span>
              )}
            </p>
          )}
        </div>

        <div className="bg-[#141414] border border-[#2A2A2A] rounded-[22px] p-7 flex flex-col gap-5">
          {/* Participants list */}
          {session && session.participants.length > 0 && (
            <div>
              <p className="text-[11px] tracking-[2px] uppercase text-[#555] mb-3">
                Participants ({session.participants.length})
              </p>
              <div className="flex flex-col gap-2">
                {session.participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Avatar name={p.name} />
                    <div>
                      <p className="text-white text-[13px] font-medium">{p.name}</p>
                      {p.address && (
                        <p className="text-[#555] text-[11px] truncate max-w-[280px]">{p.address}</p>
                      )}
                    </div>
                    {i === 0 && (
                      <span className="ml-auto text-[10px] text-[#FF6B2C] border border-[#FF6B2C]/30 rounded-full px-2 py-0.5">
                        Créateur
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Separator */}
          {session && session.participants.length > 0 && (
            <div className="border-t border-[#2A2A2A]" />
          )}

          {!joined ? (
            <>
              {/* Name */}
              <div>
                <label className="text-[11px] tracking-[2px] uppercase text-[#555] mb-2 block">
                  Ton prénom
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Lucas"
                  className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-[12px] px-4 py-[13px] text-white text-[14px] outline-none transition-all focus:border-[#FF6B2C] focus:shadow-[0_0_0_3px_rgba(255,107,44,0.12)] placeholder:text-[#555]"
                />
              </div>

              {/* Address */}
              <div>
                <label className="text-[11px] tracking-[2px] uppercase text-[#555] mb-2 block">
                  Ton adresse de départ
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  placeholder="Ex: 15 rue de la Paix, Paris"
                  className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-[12px] px-4 py-[13px] text-white text-[14px] outline-none transition-all focus:border-[#FF6B2C] focus:shadow-[0_0_0_3px_rgba(255,107,44,0.12)] placeholder:text-[#555]"
                />
              </div>

              {error && (
                <p className="text-red-400 text-[12px] bg-red-900/20 border border-red-500/25 rounded-[10px] px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleJoin}
                disabled={!name.trim() || !address.trim() || submitting}
                className="w-full py-[17px] bg-[#FF6B2C] border-none rounded-[14px] text-white text-[15px] font-semibold cursor-pointer tracking-[0.3px] transition-all hover:bg-[#ff7d45] hover:-translate-y-[1px] hover:shadow-[0_10px_32px_rgba(255,107,44,0.28)] active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {submitting ? 'Envoi…' : 'Rejoindre la session →'}
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-10 h-10 border-2 border-[#2A2A2A] border-t-[#FF6B2C] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white text-[14px] font-medium mb-1">Tu es dans la session !</p>
              <p className="text-[#555] text-[12px]">
                En attente que {creator?.name || 'l\'organisateur'} lance la recherche…
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-[#333] mt-5">Code session : {id}</p>
      </div>
    </div>
  );
}
