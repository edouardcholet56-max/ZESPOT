'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [geoGranted, setGeoGranted] = useState<boolean | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [contactsGranted, setContactsGranted] = useState<boolean | null>(null);
  const [geoAddress, setGeoAddress] = useState('');

  const requestGeo = async () => {
    if (!navigator.geolocation) {
      setGeoGranted(false);
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoGranted(true);
        try {
          const res = await fetch(
            `/api/reverse-geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          );
          const data = await res.json();
          if (data.address) {
            setGeoAddress(data.address);
            // Save immediately — don't wait for the continue button
            sessionStorage.setItem('myAddress', data.address);
          }
        } catch {
          // silently fail — address pre-fill is optional
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoGranted(false);
        setGeoLoading(false);
        if (err.code === 1) {
          // PERMISSION_DENIED — store message for UI
          sessionStorage.setItem('geoError', 'permission');
        }
      }
    );
  };

  const requestContacts = async () => {
    try {
      // Contacts API — Chrome Android only
      // @ts-ignore
      if ('contacts' in navigator && 'ContactsManager' in window) {
        // @ts-ignore
        await navigator.contacts.select(['name', 'email'], { multiple: true });
        setContactsGranted(true);
      } else {
        setContactsGranted(false);
      }
    } catch {
      setContactsGranted(false);
    }
  };

  const handleContinue = () => {
    if (!name.trim()) return;
    if (geoAddress) sessionStorage.setItem('myAddress', geoAddress);
    sessionStorage.setItem('userName', name);
    router.push('/find');
  };

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
        <div className="text-center mb-10">
          <h1 className="text-[42px] font-bold tracking-[-2px] leading-none">
            ZESP<span className="text-[#FF6B2C]">0</span>T
          </h1>
          <p className="text-[12px] tracking-[4px] uppercase text-[#555] mt-2">
            Crée ton profil
          </p>
        </div>

        <div className="bg-[#141414] border border-[#2A2A2A] rounded-[22px] p-8 flex flex-col gap-5">
          {/* Nom */}
          <div>
            <label className="text-[11px] tracking-[2px] uppercase text-[#555] mb-2 block">
              Ton prénom
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Edouard"
              className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-[12px] px-4 py-[13px] text-white text-[14px] outline-none transition-all focus:border-[#FF6B2C] focus:shadow-[0_0_0_3px_rgba(255,107,44,0.12)] placeholder:text-[#555]"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-[11px] tracking-[2px] uppercase text-[#555] mb-2 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@example.com"
              className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-[12px] px-4 py-[13px] text-white text-[14px] outline-none transition-all focus:border-[#FF6B2C] focus:shadow-[0_0_0_3px_rgba(255,107,44,0.12)] placeholder:text-[#555]"
            />
          </div>

          {/* Géolocalisation */}
          <div className="flex items-center justify-between p-4 bg-[#1C1C1C] rounded-[14px] border border-[#2A2A2A]">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-white text-[13px] font-medium">Géolocalisation</p>
              <p className="text-[#555] text-[11px] mt-0.5 truncate">
                {geoGranted === true
                  ? geoLoading ? 'Récupération de l\'adresse…' : geoAddress || 'Position obtenue'
                  : geoGranted === false
                  ? 'Bloqué — autorise la localisation dans les réglages du navigateur'
                  : 'Pour pré-remplir ton adresse'}
              </p>
            </div>
            {geoGranted === null && (
              <button
                onClick={requestGeo}
                className="px-4 py-2 bg-[#FF6B2C] text-white text-[12px] font-semibold rounded-[8px] hover:bg-[#ff7d45] transition-all flex-shrink-0"
              >
                Autoriser
              </button>
            )}
            {geoGranted === true && !geoLoading && (
              <span className="text-[#FF6B2C] text-[18px] flex-shrink-0">✓</span>
            )}
            {geoLoading && (
              <div className="w-4 h-4 border-2 border-[#2A2A2A] border-t-[#FF6B2C] rounded-full animate-spin flex-shrink-0" />
            )}
            {geoGranted === false && (
              <span className="text-[#555] text-[13px] flex-shrink-0">✕</span>
            )}
          </div>

          {/* Contacts */}
          <div className="flex items-center justify-between p-4 bg-[#1C1C1C] rounded-[14px] border border-[#2A2A2A]">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-white text-[13px] font-medium">Contacts</p>
              <p className="text-[#555] text-[11px] mt-0.5">
                {contactsGranted === true
                  ? 'Accès accordé'
                  : contactsGranted === false
                  ? 'Non disponible sur cet appareil'
                  : 'Pour retrouver tes amis facilement'}
              </p>
            </div>
            {contactsGranted === null && (
              <button
                onClick={requestContacts}
                className="px-4 py-2 bg-[#2A2A2A] text-[#888] text-[12px] font-semibold rounded-[8px] hover:bg-[#333] transition-all border border-[#3A3A3A] flex-shrink-0"
              >
                Autoriser
              </button>
            )}
            {contactsGranted === true && (
              <span className="text-[#FF6B2C] text-[18px] flex-shrink-0">✓</span>
            )}
            {contactsGranted === false && (
              <span className="text-[#555] text-[13px] flex-shrink-0">✕</span>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleContinue}
            disabled={!name.trim()}
            className="w-full py-[17px] bg-[#FF6B2C] border-none rounded-[14px] text-white text-[15px] font-semibold cursor-pointer tracking-[0.3px] transition-all hover:bg-[#ff7d45] hover:-translate-y-[1px] hover:shadow-[0_10px_32px_rgba(255,107,44,0.28)] active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            Trouver le Spot →
          </button>

          <p className="text-center text-[11px] text-[#444]">
            La géo et les contacts sont optionnels
          </p>
        </div>
      </div>
    </div>
  );
}
