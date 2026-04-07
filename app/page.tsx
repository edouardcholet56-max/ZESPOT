'use client'

import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-5"
      style={{ backgroundImage: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,107,44,0.07) 0%, transparent 70%)' }}>
      <div className="text-center">
        <h1 className="text-[72px] font-bold tracking-[-4px] leading-none">
          ZESP<span className="text-[#FF6B2C]">0</span>T
        </h1>
        <p className="text-[13px] tracking-[5px] uppercase text-[#555] mt-3 mb-16">
          Find the perfect spot
        </p>
        <button
          onClick={() => router.push('/onboarding')}
          className="px-10 py-4 bg-[#FF6B2C] text-white text-[15px] font-semibold rounded-[14px] tracking-[0.3px] transition-all hover:bg-[#ff7d45] hover:-translate-y-[1px] hover:shadow-[0_10px_32px_rgba(255,107,44,0.28)] active:translate-y-0"
        >
          Commencer →
        </button>
      </div>
    </div>
  )
}