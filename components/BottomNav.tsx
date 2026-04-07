'use client';

import { usePathname, useRouter } from 'next/navigation';

const TABS = [
  {
    label: 'Événements',
    href: '/soiree',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={active ? '#FF6B2C' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </svg>
    ),
  },
  {
    label: 'Profil',
    href: '/profile',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={active ? '#FF6B2C' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

// Pages where the bottom nav is hidden
const HIDDEN: string[] = ['/'];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (HIDDEN.includes(pathname) || pathname.startsWith('/onboarding')) return null;

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 flex items-center border-t border-[#1A1A1A]"
      style={{
        background: 'rgba(10,10,10,0.93)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            className="flex-1 flex flex-col items-center py-3 gap-1 transition-all active:scale-90"
          >
            {tab.icon(active)}
            <span
              className="text-[10px] font-semibold tracking-[0.2px]"
              style={{ color: active ? '#FF6B2C' : '#555' }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
