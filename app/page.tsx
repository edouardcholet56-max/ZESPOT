'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (storage.isLoggedIn) {
      router.replace('/soiree');
    } else {
      router.replace('/onboarding');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[#FF6B2C] border-t-transparent animate-spin" />
    </div>
  );
}
