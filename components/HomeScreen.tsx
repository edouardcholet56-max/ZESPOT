'use client';

import { useState, useEffect, useRef } from 'react';
import { AddressItem, TransportMode, Session } from '@/lib/types';
import { uid } from '@/lib/utils';

interface Props {
  addresses: AddressItem[];
  setAddresses: (addresses: AddressItem[]) => void;
  onFind: () => void;
  error: string;
  setError: (e: string) => void;
  mode: TransportMode;
  setMode: (mode: TransportMode) => void;
}

const MODES: { key: TransportMode; icon: string; label: string }[] = [
  { key: 'walking', icon: '🚶', label: 'À pied' },
  { key: 'bicycling', icon: '🚲', label: 'Vélo' },
  { key: 'transit', icon: '🚇', label: 'Transport' },
];

export default function HomeScreen({
  addresses,
  setAddresses,
  onFind,
  error,
  setError,
  mode,
  setMode,
}: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const addedNamesRef = useRef<Set<string>>(new Set());

  // Poll session for new participants
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/session?id=${sessionId}`);
        if (!res.ok) return;
        const data: Session = await res.json();
        setSession(data);

        // Add new participants' addresses
        data.participants.forEach((p, i) => {
          if (i === 0) return; // skip creator (already in addresses[0])
          if (p.address && !addedNamesRef.current.has(p.name)) {
            addedNamesRef.current.add(p.name);
            setAddresses([
              ...addresses,
              { id: uid(), value: p.address, label: p.name },
            ]);
          }
        });
      } catch {
        // silent
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId, addresses]);

  const addAddr = () => setAddresses([...addresses, { id: uid(), value: '' }]);

  const removeAddr = (id: string) => {
    if (addresses.length <= 2) return;
    setAddresses(addresses.filter((a) => a.id !== id));
  };

  const updateAddr = (id: string, value: string) => {
    setAddresses(addresses.map((a) => (a.id === id ? { ...a, value } : a)));
    if (error) setError('');
  };

  const createSession = async () => {
    setCreatingSession(true);
    try {
      const creatorName = sessionStorage.getItem('userName') || 'Moi';
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorName, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessionId(data.id);
      setShowPanel(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de créer la session.');
    } finally {
      setCreatingSession(false);
    }
  };

  const sessionUrl =
    typeof window !== 'undefined' && sessionId
      ? `${window.location.origin}/join/${sessionId}`
      : '';

  const copyLink = async () => {
    if (!sessionUrl) return;
    try {
      await navigator.clipboard.writeText(sessionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select input
    }
  };

  const shareLink = async () => {
    if (!sessionUrl || !navigator.share) return;
    await navigator.share({ title: 'ZESP0T', text: 'Rejoins ma session !', url: sessionUrl });
  };

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-5 py-10 pb-28"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,107,44,0.07) 0%, transparent 70%)',
      }}
    >
      <div className="w-full max-w-[460px]">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-[58px] font-bold tracking-[-3px] leading-none">
            ZESP<span className="text-[#FF6B2C]">0</span>T
          </h1>
          <p className="text-[12px] tracking-[4px] uppercase text-[#555] mt-2.5">
            Find the perfect spot
          </p>
        </div>

        <div className="bg-[#141414] border border-[#2A2A2A] rounded-[22px] p-8">
          {/* Transport mode selector */}
          <div className="flex gap-2 mb-5">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex-1 py-2.5 rounded-[10px] text-[12px] font-medium transition-all ${
                  mode === m.key
                    ? 'bg-[#FF6B2C] text-white'
                    : 'bg-[#1C1C1C] text-[#888] border border-[#2A2A2A] hover:border-[#FF6B2C]/50 hover:text-white'
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          <p className="text-[13px] text-[#888] mb-5">Rentre les adresses de tout le monde</p>

          {/* Address list */}
          <div className="flex flex-col gap-2.5 mb-4">
            {addresses.map((addr, i) => (
              <div key={addr.id} className="flex items-center gap-2.5">
                <div className="w-[26px] h-[26px] bg-[#1C1C1C] rounded-full flex items-center justify-center text-[11px] font-semibold text-[#888] flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-[12px] px-4 py-[13px] text-white text-[14px] outline-none transition-all focus:border-[#FF6B2C] focus:shadow-[0_0_0_3px_rgba(255,107,44,0.12)] placeholder:text-[#555]"
                    placeholder={
                      addr.label ? addr.label : i === 0 ? 'Ton adresse' : `Adresse ami ${i}`
                    }
                    value={addr.value}
                    onChange={(e) => updateAddr(addr.id, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onFind(); }}
                  />
                  {addr.label && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#FF6B2C] font-medium">
                      {addr.label}
                    </span>
                  )}
                </div>
                {addresses.length > 2 ? (
                  <button
                    onClick={() => removeAddr(addr.id)}
                    className="w-[26px] h-[26px] bg-transparent border border-[#2A2A2A] rounded-full flex items-center justify-center text-[#555] text-[15px] cursor-pointer flex-shrink-0 hover:border-red-400 hover:text-red-400 transition-all"
                    aria-label="Supprimer"
                  >
                    ×
                  </button>
                ) : (
                  <div className="w-[26px] flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Add address */}
          <button
            onClick={addAddr}
            className="w-full py-[11px] bg-transparent border border-dashed border-[#2A2A2A] rounded-[11px] text-[#555] text-[13px] cursor-pointer transition-all hover:border-[#FF6B2C] hover:text-[#FF6B2C] mb-4"
          >
            + Ajouter une adresse
          </button>

          {/* Session invite panel */}
          {showPanel && sessionId ? (
            <div className="mb-4 bg-[#1C1C1C] border border-[#2A2A2A] rounded-[14px] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white text-[13px] font-medium">Session ouverte</p>
                <span className="text-[11px] font-mono text-[#FF6B2C] bg-[#FF6B2C]/10 px-2 py-0.5 rounded-md">
                  {sessionId}
                </span>
              </div>

              {/* Participants list */}
              {session && session.participants.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-3">
                  {session.participants.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#FF6B2C]/15 flex items-center justify-center text-[9px] font-bold text-[#FF6B2C]">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[12px] text-[#888]">
                        {p.name}
                        {p.address ? '' : <span className="text-[#555] ml-1">· en attente…</span>}
                      </span>
                      {p.address && <span className="ml-auto text-[#3DD68C] text-[10px]">✓</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Share buttons */}
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className="flex-1 py-2 bg-[#2A2A2A] text-[#888] text-[12px] rounded-[8px] hover:bg-[#333] transition-all border border-[#3A3A3A]"
                >
                  {copied ? '✓ Copié' : '🔗 Copier le lien'}
                </button>
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    onClick={shareLink}
                    className="flex-1 py-2 bg-[#FF6B2C] text-white text-[12px] rounded-[8px] hover:bg-[#ff7d45] transition-all"
                  >
                    Partager →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={createSession}
              disabled={creatingSession}
              className="w-full py-[11px] bg-transparent border border-[#2A2A2A] rounded-[11px] text-[#888] text-[13px] cursor-pointer transition-all hover:border-[#FF6B2C]/50 hover:text-white mb-4 disabled:opacity-40"
            >
              {creatingSession ? 'Création…' : '👥 Inviter des amis'}
            </button>
          )}

          {/* Find CTA */}
          <button
            onClick={onFind}
            className="w-full py-[17px] bg-[#FF6B2C] border-none rounded-[14px] text-white text-[15px] font-semibold cursor-pointer tracking-[0.3px] transition-all hover:bg-[#ff7d45] hover:-translate-y-[1px] hover:shadow-[0_10px_32px_rgba(255,107,44,0.28)] active:translate-y-0"
          >
            Trouver le Spot →
          </button>

          {error && (
            <div className="mt-3.5 bg-red-900/20 border border-red-500/25 rounded-[10px] px-3.5 py-[11px] text-red-400 text-[13px]">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
