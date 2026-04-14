'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

interface Prediction {
  place_id: string;
  description: string;
  main: string;
  secondary: string;
}

// ── Single address row with autocomplete ─────────────────────────

function AddressInput({
  addr,
  index,
  total,
  onChange,
  onRemove,
  onSubmit,
}: {
  addr: AddressItem;
  index: number;
  total: number;
  onChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  onSubmit: () => void;
}) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (val: string) => {
    if (val.trim().length < 2) { setPredictions([]); return; }
    try {
      const res = await fetch(`/api/autocomplete?input=${encodeURIComponent(val)}`);
      const data = await res.json();
      setPredictions(data.predictions || []);
    } catch { setPredictions([]); }
  }, []);

  const handleChange = (val: string) => {
    onChange(addr.id, val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 280);
  };

  const pick = (p: Prediction) => {
    onChange(addr.id, p.description);
    setPredictions([]);
    setFocused(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPredictions([]);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showDropdown = focused && predictions.length > 0;

  return (
    <div ref={containerRef} className="relative flex items-center gap-2.5">
      {/* Index badge */}
      <div className="w-[26px] h-[26px] bg-[#1C1C1C] rounded-full flex items-center justify-center text-[11px] font-semibold text-[#555] flex-shrink-0 border border-[#2A2A2A]">
        {index + 1}
      </div>

      {/* Input */}
      <div className="flex-1 relative">
        <input
          type="text"
          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-[12px] px-4 py-[13px] text-white text-[14px] outline-none transition-all focus:border-[#FF6B2C] focus:shadow-[0_0_0_3px_rgba(255,107,44,0.1)] placeholder:text-[#444]"
          placeholder={addr.label ? addr.label : index === 0 ? '📍 Ton adresse' : `👤 Adresse ami ${index}`}
          value={addr.value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { setFocused(true); if (addr.value.length >= 2) fetchSuggestions(addr.value); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { setPredictions([]); onSubmit(); }
            if (e.key === 'Escape') { setPredictions([]); setFocused(false); }
          }}
          autoComplete="off"
        />
        {addr.label && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#FF6B2C] font-medium pointer-events-none">
            {addr.label}
          </span>
        )}

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-[14px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50">
            {predictions.map((p, i) => (
              <button
                key={p.place_id}
                onMouseDown={() => pick(p)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#242424] active:bg-[#2A2A2A] ${i > 0 ? 'border-t border-[#222]' : ''}`}
              >
                <span className="text-[14px] mt-0.5 flex-shrink-0 opacity-50">📍</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">{p.main}</p>
                  <p className="text-[11px] text-[#555] truncate">{p.secondary}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Remove btn */}
      {total > 2 ? (
        <button
          onClick={() => onRemove(addr.id)}
          className="w-[26px] h-[26px] bg-transparent border border-[#2A2A2A] rounded-full flex items-center justify-center text-[#555] text-[16px] flex-shrink-0 hover:border-red-500/60 hover:text-red-400 transition-all"
          aria-label="Supprimer"
        >
          ×
        </button>
      ) : (
        <div className="w-[26px] flex-shrink-0" />
      )}
    </div>
  );
}

// ── Main HomeScreen ───────────────────────────────────────────────

export default function HomeScreen({
  addresses,
  setAddresses,
  onFind,
  error,
  setError,
  mode,
  setMode,
}: Props) {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const addedNamesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const name = sessionStorage.getItem('userName') || '';
    setUserName(name);
    // Restore last used transport mode
    const savedMode = sessionStorage.getItem('lastMode') as TransportMode | null;
    if (savedMode && ['walking', 'bicycling', 'transit'].includes(savedMode)) {
      setMode(savedMode);
    }
  }, [setMode]);

  // Persist mode choice
  const handleMode = (m: TransportMode) => {
    setMode(m);
    sessionStorage.setItem('lastMode', m);
  };

  // Poll session for new participants
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/session?id=${sessionId}`);
        if (!res.ok) return;
        const data: Session = await res.json();
        setSession(data);
        data.participants.forEach((p, i) => {
          if (i === 0) return;
          if (p.address && !addedNamesRef.current.has(p.name)) {
            addedNamesRef.current.add(p.name);
            setAddresses([...addresses, { id: uid(), value: p.address, label: p.name }]);
          }
        });
      } catch { /* silent */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId, addresses, setAddresses]);

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
      setTimeout(() => setCopied(false), 2200);
    } catch { /* fallback */ }
  };

  const shareLink = async () => {
    if (!sessionUrl || !navigator.share) return;
    await navigator.share({ title: 'ZESP0T', text: 'Rejoins ma session !', url: sessionUrl });
  };

  const filledCount = addresses.filter((a) => a.value.trim().length > 0).length;
  const canSearch = filledCount >= 2;

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-5 py-10"
      style={{ backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,107,44,0.08) 0%, transparent 65%)' }}
    >
      <div className="w-full max-w-[420px]">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[#2A2A2A] text-[#555] text-[13px] transition-all hover:border-[#FF6B2C] hover:text-[#FF6B2C]"
          >
            ←
          </button>
          <div className="text-center">
            <h1 className="text-[20px] font-bold tracking-[-0.8px]">
              ZESP<span className="text-[#FF6B2C]">0</span>T
            </h1>
            {userName && (
              <p className="text-[11px] text-[#444] mt-0.5">Salut {userName} 👋</p>
            )}
          </div>
          <div className="w-9" />
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-[#1E1E1E] rounded-[24px] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">

          {/* Transport mode */}
          <div className="flex gap-2 mb-6">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => handleMode(m.key)}
                className={`flex-1 py-2.5 rounded-[10px] text-[12px] font-medium transition-all ${
                  mode === m.key
                    ? 'bg-[#FF6B2C] text-white shadow-[0_4px_12px_rgba(255,107,44,0.3)]'
                    : 'bg-[#1A1A1A] text-[#666] border border-[#262626] hover:border-[#FF6B2C]/40 hover:text-[#ccc]'
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {/* Subtitle */}
          <p className="text-[12px] text-[#444] mb-4 tracking-wide">
            ADRESSES DU GROUPE
          </p>

          {/* Address rows */}
          <div className="flex flex-col gap-2.5 mb-3">
            {addresses.map((addr, i) => (
              <AddressInput
                key={addr.id}
                addr={addr}
                index={i}
                total={addresses.length}
                onChange={updateAddr}
                onRemove={removeAddr}
                onSubmit={onFind}
              />
            ))}
          </div>

          {/* Add address */}
          <button
            onClick={addAddr}
            className="w-full py-[10px] bg-transparent border border-dashed border-[#242424] rounded-[10px] text-[#444] text-[12px] transition-all hover:border-[#FF6B2C]/50 hover:text-[#FF6B2C] mb-4"
          >
            + Ajouter une adresse
          </button>

          {/* Session panel */}
          {showPanel && sessionId ? (
            <div className="mb-4 bg-[#161616] border border-[#222] rounded-[14px] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white text-[13px] font-medium">Session ouverte</p>
                <span className="text-[11px] font-mono text-[#FF6B2C] bg-[#FF6B2C]/10 px-2 py-0.5 rounded-md">
                  {sessionId}
                </span>
              </div>
              {session && session.participants.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-3">
                  {session.participants.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#FF6B2C]/15 flex items-center justify-center text-[9px] font-bold text-[#FF6B2C]">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[12px] text-[#777]">{p.name}</span>
                      {p.address
                        ? <span className="ml-auto text-[#30D158] text-[10px]">✓</span>
                        : <span className="ml-auto text-[#444] text-[10px]">en attente…</span>
                      }
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className={`flex-1 py-2 rounded-[8px] text-[12px] border transition-all ${copied ? 'bg-[#30D158]/10 border-[#30D158]/40 text-[#30D158]' : 'bg-[#1E1E1E] border-[#2A2A2A] text-[#777] hover:bg-[#252525]'}`}
                >
                  {copied ? '✓ Copié !' : '🔗 Copier'}
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
              className="w-full py-[10px] bg-transparent border border-[#222] rounded-[10px] text-[#555] text-[12px] transition-all hover:border-[#FF6B2C]/40 hover:text-[#ccc] mb-4 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {creatingSession
                ? <><span className="animate-spin inline-block w-3 h-3 border border-[#FF6B2C] border-t-transparent rounded-full" /> Création…</>
                : '👥 Inviter des amis par lien'
              }
            </button>
          )}

          {/* Find CTA */}
          <button
            onClick={onFind}
            disabled={!canSearch}
            className={`w-full py-[16px] rounded-[14px] text-[15px] font-semibold tracking-[0.2px] transition-all ${
              canSearch
                ? 'bg-[#FF6B2C] text-white hover:bg-[#ff7d45] hover:-translate-y-[1px] hover:shadow-[0_12px_36px_rgba(255,107,44,0.3)] active:translate-y-0'
                : 'bg-[#1A1A1A] text-[#333] cursor-not-allowed'
            }`}
          >
            {canSearch ? 'Trouver le Spot →' : `Encore ${2 - filledCount} adresse${2 - filledCount > 1 ? 's' : ''} manquante${2 - filledCount > 1 ? 's' : ''}`}
          </button>

          {error && (
            <div className="mt-3 bg-red-900/15 border border-red-500/20 rounded-[10px] px-3.5 py-3 text-red-400 text-[12px]">
              {error}
            </div>
          )}
        </div>

        {/* Create event CTA */}
        <button
          onClick={() => router.push('/soiree')}
          className="w-full mt-3 py-3.5 bg-transparent border border-[#1E1E1E] rounded-[16px] flex items-center justify-center gap-2 text-[13px] text-[#444] font-medium transition-all hover:border-[#2A2A2A] hover:text-[#888] active:scale-[0.98]"
        >
          <span>🎉</span>
          Créer un événement avec tes amis
          <span className="opacity-40">→</span>
        </button>
      </div>
    </div>
  );
}
