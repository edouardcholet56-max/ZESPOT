const STEPS = [
  { icon: '📍', label: 'Localisation des adresses' },
  { icon: '🗺', label: 'Calcul du point central' },
  { icon: '🍺', label: 'Recherche des meilleurs bars' },
];

export default function LoadingScreen({ step }: { step: number }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <h2 className="text-[32px] font-bold tracking-[-1.5px] mb-10">
          ZESP<span className="text-[#FF6B2C]">0</span>T
        </h2>

        {/* Spinner */}
        <div className="w-11 h-11 border-2 border-[#2A2A2A] border-t-[#FF6B2C] rounded-full animate-spin mx-auto mb-7" />

        <p className="text-[14px] text-[#888] mb-8">Recherche du meilleur spot…</p>

        {/* Steps */}
        <div className="flex flex-col gap-2.5 text-left min-w-[260px] mx-auto">
          {STEPS.map((s, i) => {
            const n = i + 1;
            const isDone = step > n;
            const isActive = step === n;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 text-[13px] transition-colors duration-300 ${
                  isDone ? 'text-[#3DD68C]' : isActive ? 'text-white' : 'text-[#555]'
                }`}
              >
                <span className="w-5 text-center text-[15px]">
                  {isDone ? '✓' : s.icon}
                </span>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
