'use client';

import { AddressItem } from '@/lib/types';
import { uid } from '@/lib/utils';

interface Props {
  addresses: AddressItem[];
  setAddresses: (addresses: AddressItem[]) => void;
  onFind: () => void;
  error: string;
  setError: (e: string) => void;
}

export default function HomeScreen({ addresses, setAddresses, onFind, error, setError }: Props) {
  const addAddr = () => setAddresses([...addresses, { id: uid(), value: '' }]);

  const removeAddr = (id: string) => {
    if (addresses.length <= 2) return;
    setAddresses(addresses.filter((a) => a.id !== id));
  };

  const updateAddr = (id: string, value: string) => {
    setAddresses(addresses.map((a) => (a.id === id ? { ...a, value } : a)));
    if (error) setError('');
  };

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-5 py-12"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,107,44,0.07) 0%, transparent 70%)',
      }}
    >
      <div className="w-full max-w-[460px]">
        {/* ── Logo ── */}
        <div className="text-center mb-12">
          <h1 className="text-[58px] font-bold tracking-[-3px] leading-none">
            ZESP<span className="text-[#FF6B2C]">0</span>T
          </h1>
          <p className="text-[12px] tracking-[4px] uppercase text-[#555] mt-2.5">
            Find the perfect spot
          </p>
        </div>

        {/* ── Card ── */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-[22px] p-8">
          <p className="text-[13px] text-[#888] mb-5">
            Rentre les adresses de tout le monde
          </p>

          {/* Address list */}
          <div className="flex flex-col gap-2.5 mb-4">
            {addresses.map((addr, i) => (
              <div key={addr.id} className="flex items-center gap-2.5">
                {/* Number badge */}
                <div className="w-[26px] h-[26px] bg-[#1C1C1C] rounded-full flex items-center justify-center text-[11px] font-semibold text-[#888] flex-shrink-0">
                  {i + 1}
                </div>

                {/* Input */}
                <input
                  type="text"
                  className="flex-1 bg-[#1C1C1C] border border-[#2A2A2A] rounded-[12px] px-4 py-[13px] text-white text-[14px] outline-none transition-all focus:border-[#FF6B2C] focus:shadow-[0_0_0_3px_rgba(255,107,44,0.12)] placeholder:text-[#555]"
                  placeholder={i === 0 ? 'Ton adresse' : `Adresse ami ${i}`}
                  value={addr.value}
                  onChange={(e) => updateAddr(addr.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onFind();
                  }}
                />

                {/* Remove button or spacer */}
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
            className="w-full py-[11px] bg-transparent border border-dashed border-[#2A2A2A] rounded-[11px] text-[#555] text-[13px] cursor-pointer transition-all hover:border-[#FF6B2C] hover:text-[#FF6B2C] mb-5"
          >
            + Ajouter une adresse
          </button>

          {/* Find CTA */}
          <button
            onClick={onFind}
            className="w-full py-[17px] bg-[#FF6B2C] border-none rounded-[14px] text-white text-[15px] font-semibold cursor-pointer tracking-[0.3px] transition-all hover:bg-[#ff7d45] hover:-translate-y-[1px] hover:shadow-[0_10px_32px_rgba(255,107,44,0.28)] active:translate-y-0"
          >
            Trouver le Spot →
          </button>

          {/* Error */}
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
