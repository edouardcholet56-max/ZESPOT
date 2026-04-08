'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TransportMode, SoireeEvent } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarColor(name: string) {
  const colors = ['#FF6B2C', '#6C63FF', '#00C9A7', '#FF4757', '#FFA502', '#2ED573', '#1E90FF'];
  return colors[name.charCodeAt(0) % colors.length];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] text-[#444] uppercase tracking-[1.5px] font-semibold mb-2 px-1">{title}</p>
      <div className="bg-[#111] border border-[#1E1E1E] rounded-[16px] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({
  icon, label, value, onClick, danger, chevron = true,
}: {
  icon: string; label: string; value?: string;
  onClick?: () => void; danger?: boolean; chevron?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-4 border-b border-[#1A1A1A] last:border-0 transition-colors ${
        onClick ? 'hover:bg-[#161616] active:bg-[#1C1C1C]' : 'cursor-default'
      }`}
    >
      <span className="text-[18px] w-6 text-center flex-shrink-0">{icon}</span>
      <span className={`flex-1 text-[14px] text-left ${danger ? 'text-[#FF453A]' : 'text-white'}`}>
        {label}
      </span>
      {value && <span className="text-[13px] text-[#555] mr-1">{value}</span>}
      {chevron && onClick && (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      )}
    </button>
  );
}

// ── Edit profile modal ────────────────────────────────────────────

function EditModal({
  name, email, onSave, onClose,
}: {
  name: string; email: string;
  onSave: (n: string, e: string) => void;
  onClose: () => void;
}) {
  const [n, setN] = useState(name);
  const [e, setE] = useState(email);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-0" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-[430px] bg-[#1C1C1E] rounded-t-[24px] px-6 pt-6 pb-10"
        style={{ boxShadow: '0 -20px 60px rgba(0,0,0,0.6)' }}
      >
        <div className="w-10 h-1 bg-[#3A3A3C] rounded-full mx-auto mb-6" />
        <h2 className="text-[18px] font-bold mb-5">Modifier le profil</h2>
        <div className="flex flex-col gap-3 mb-5">
          <input
            value={n}
            onChange={(e) => setN(e.target.value)}
            placeholder="Prénom"
            className="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-[12px] px-4 py-3.5 text-[15px] text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B2C] transition-colors"
          />
          <input
            value={e}
            onChange={(ev) => setE(ev.target.value)}
            placeholder="E-mail"
            type="email"
            className="w-full bg-[#2C2C2E] border border-[#3A3A3C] rounded-[12px] px-4 py-3.5 text-[15px] text-white placeholder-[#555] focus:outline-none focus:border-[#FF6B2C] transition-colors"
          />
        </div>
        <button
          onClick={() => onSave(n.trim(), e.trim())}
          disabled={!n.trim()}
          className="w-full py-4 bg-[#FF6B2C] text-white text-[15px] font-semibold rounded-[14px] mb-3 transition-all hover:bg-[#ff7d45] disabled:opacity-40"
        >
          Enregistrer
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 text-[14px] text-[#666] transition-colors hover:text-white"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

// ── Transport modal ───────────────────────────────────────────────

const TRANSPORT_OPTS: { value: TransportMode; icon: string; label: string }[] = [
  { value: 'transit',   icon: '🚇', label: 'Métro / Transports' },
  { value: 'walking',   icon: '🚶', label: 'À pied' },
  { value: 'bicycling', icon: '🚲', label: 'Vélo' },
];

function TransportModal({
  current, onSave, onClose,
}: {
  current: TransportMode;
  onSave: (m: TransportMode) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(current);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-0" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-[430px] bg-[#1C1C1E] rounded-t-[24px] px-6 pt-6 pb-10">
        <div className="w-10 h-1 bg-[#3A3A3C] rounded-full mx-auto mb-6" />
        <h2 className="text-[18px] font-bold mb-5">Transport par défaut</h2>
        <div className="flex flex-col gap-2 mb-5">
          {TRANSPORT_OPTS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`flex items-center gap-3 px-4 py-4 rounded-[14px] border transition-all ${
                selected === opt.value
                  ? 'bg-[rgba(255,107,44,0.12)] border-[#FF6B2C] text-white'
                  : 'bg-[#2C2C2E] border-[#3A3A3C] text-[#999] hover:border-[#555]'
              }`}
            >
              <span className="text-[20px]">{opt.icon}</span>
              <span className="text-[14px] font-medium">{opt.label}</span>
              {selected === opt.value && (
                <span className="ml-auto text-[#FF6B2C] text-[16px]">✓</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => onSave(selected)}
          className="w-full py-4 bg-[#FF6B2C] text-white text-[15px] font-semibold rounded-[14px] mb-3 transition-all hover:bg-[#ff7d45]"
        >
          Enregistrer
        </button>
        <button onClick={onClose} className="w-full py-3 text-[14px] text-[#666] hover:text-white">
          Annuler
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [transport, setTransport] = useState<TransportMode>('transit');
  const [myEvents, setMyEvents] = useState<SoireeEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [showTransport, setShowTransport] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  // Load data from sessionStorage
  useEffect(() => {
    setName(sessionStorage.getItem('userName') || '');
    setEmail(sessionStorage.getItem('userEmail') || '');
    setTransport((sessionStorage.getItem('defaultTransport') as TransportMode) || 'transit');

    // Load events user participated in
    const eventIds: string[] = JSON.parse(sessionStorage.getItem('myEventIds') || '[]');
    if (eventIds.length === 0) return;

    setLoadingEvents(true);
    Promise.all(
      eventIds.map(async (id) => {
        try {
          const res = await fetch(`/api/event?id=${id}`);
          if (!res.ok) return null;
          const data = await res.json();
          return data.event as SoireeEvent;
        } catch {
          return null;
        }
      })
    ).then((events) => {
      setMyEvents(events.filter(Boolean) as SoireeEvent[]);
      setLoadingEvents(false);
    });
  }, []);

  const handleSaveProfile = (n: string, e: string) => {
    sessionStorage.setItem('userName', n);
    sessionStorage.setItem('userEmail', e);
    setName(n);
    setEmail(e);
    setShowEdit(false);
  };

  const handleSaveTransport = (m: TransportMode) => {
    sessionStorage.setItem('defaultTransport', m);
    setTransport(m);
    setShowTransport(false);
  };

  const handleLogout = () => {
    // Keep event participation data, clear identity
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('myAddress');
    sessionStorage.removeItem('myEventIds');
    sessionStorage.removeItem('defaultTransport');
    router.push('/onboarding');
  };

  const transportLabel = TRANSPORT_OPTS.find((o) => o.value === transport);

  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <div
        className="min-h-screen bg-[#0A0A0A] px-5 pt-12 pb-32"
        style={{ backgroundImage: 'radial-gradient(ellipse 80% 35% at 50% 0%, rgba(255,107,44,0.07) 0%, transparent 60%)' }}
      >
        {/* ── Avatar + identity ── */}
        <div className="flex flex-col items-center mb-8">
          {name ? (
            <div
              className="w-[80px] h-[80px] rounded-full flex items-center justify-center text-[28px] font-bold text-white mb-3 shadow-[0_0_0_3px_rgba(255,107,44,0.25)]"
              style={{ backgroundColor: `${avatarColor(name)}22`, border: `2px solid ${avatarColor(name)}66` }}
            >
              {getInitials(name)}
            </div>
          ) : (
            <div className="w-[80px] h-[80px] rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center mb-3">
              <span className="text-[32px]">👤</span>
            </div>
          )}

          <h1 className="text-[22px] font-bold tracking-[-0.5px]">
            {name || 'Anonyme'}
          </h1>
          {email && <p className="text-[13px] text-[#555] mt-0.5">{email}</p>}

          <button
            onClick={() => setShowEdit(true)}
            className="mt-3 px-5 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full text-[12px] text-[#888] font-medium transition-all hover:border-[#FF6B2C] hover:text-[#FF6B2C]"
          >
            Modifier le profil
          </button>
        </div>

        {/* ── Mes événements ── */}
        <Section title="Mes événements">
          {loadingEvents ? (
            <div className="px-4 py-5 text-[13px] text-[#444]">Chargement…</div>
          ) : myEvents.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-[13px] text-[#444] mb-2">Aucun événement pour l&apos;instant</p>
              <button
                onClick={() => router.push('/soiree')}
                className="text-[12px] text-[#FF6B2C] font-medium"
              >
                Créer un Zespot →
              </button>
            </div>
          ) : (
            <>
              {myEvents.slice(0, 3).map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => router.push(`/soiree/${ev.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-[#1A1A1A] last:border-0 hover:bg-[#161616] active:bg-[#1C1C1C] transition-colors"
                >
                  <div className="w-9 h-9 bg-[rgba(255,107,44,0.12)] rounded-[10px] flex items-center justify-center text-[16px] flex-shrink-0">
                    🎉
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[14px] font-medium text-white">{ev.name}</p>
                    <p className="text-[11px] text-[#555] mt-0.5">{formatEventDate(ev.date)} · {ev.participants.length} participant{ev.participants.length > 1 ? 's' : ''}</p>
                  </div>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
              {myEvents.length > 3 && (
                <button
                  onClick={() => router.push('/soiree')}
                  className="w-full px-4 py-3 text-[12px] text-[#FF6B2C] font-medium text-center hover:bg-[#161616] transition-colors"
                >
                  Voir tous les événements →
                </button>
              )}
            </>
          )}
        </Section>

        {/* ── Mon compte ── */}
        <Section title="Mon compte">
          <Row
            icon="👤"
            label="Modifier le profil"
            value={name || undefined}
            onClick={() => setShowEdit(true)}
          />
          <Row
            icon={transportLabel?.icon || '🚇'}
            label="Transport par défaut"
            value={transportLabel?.label}
            onClick={() => setShowTransport(true)}
          />
          <Row
            icon="🔔"
            label="Notifications"
            value="Activées"
            onClick={() => {
              if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
              }
            }}
          />
        </Section>

        {/* ── Support ── */}
        <Section title="Support">
          <Row
            icon="💬"
            label="Contacter le support"
            onClick={() => window.open('mailto:support@zespot.app?subject=Support ZESPOT', '_blank')}
          />
          <Row
            icon="❓"
            label="FAQ & Centre d'aide"
            onClick={() => window.open('mailto:support@zespot.app?subject=FAQ ZESPOT', '_blank')}
          />
          <Row
            icon="🐛"
            label="Signaler un bug"
            onClick={() => window.open('mailto:support@zespot.app?subject=Bug ZESPOT', '_blank')}
          />
          <Row
            icon="⭐"
            label="Noter l'application"
            onClick={() => {}}
          />
        </Section>

        {/* ── À propos ── */}
        <Section title="À propos">
          <Row
            icon="📋"
            label="Politique de confidentialité"
            onClick={() => {}}
          />
          <Row
            icon="📄"
            label="Conditions d'utilisation"
            onClick={() => {}}
          />
          <Row
            icon="ℹ️"
            label="Version"
            value="1.0.0"
            chevron={false}
          />
        </Section>

        {/* ── Logout ── */}
        {!logoutConfirm ? (
          <button
            onClick={() => setLogoutConfirm(true)}
            className="w-full py-4 bg-[#111] border border-[#1E1E1E] rounded-[16px] text-[14px] text-[#FF453A] font-medium transition-all hover:bg-[#1A1A1A] hover:border-[rgba(255,69,58,0.3)]"
          >
            Se déconnecter
          </button>
        ) : (
          <div className="bg-[#111] border border-[rgba(255,69,58,0.3)] rounded-[16px] p-4">
            <p className="text-[13px] text-[#888] text-center mb-4">Tu veux vraiment te déconnecter ?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setLogoutConfirm(false)}
                className="flex-1 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-[12px] text-[13px] text-[#888] font-medium hover:border-[#444]"
              >
                Annuler
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 bg-[rgba(255,69,58,0.15)] border border-[rgba(255,69,58,0.4)] rounded-[12px] text-[13px] text-[#FF453A] font-semibold hover:bg-[rgba(255,69,58,0.22)]"
              >
                Déconnecter
              </button>
            </div>
          </div>
        )}

        {/* Branding */}
        <p className="text-center text-[11px] text-[#2A2A2A] mt-8">
          ZESP<span className="text-[rgba(255,107,44,0.3)]">0</span>T · Made with ❤️
        </p>
      </div>

      {/* Modals */}
      {showEdit && (
        <EditModal
          name={name}
          email={email}
          onSave={handleSaveProfile}
          onClose={() => setShowEdit(false)}
        />
      )}
      {showTransport && (
        <TransportModal
          current={transport}
          onSave={handleSaveTransport}
          onClose={() => setShowTransport(false)}
        />
      )}
    </>
  );
}
