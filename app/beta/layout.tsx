import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Zespot — simplifiez vos sorties.',
  description: 'Simplifiez vos sorties. Trouvez le spot parfait entre amis.',
};

export default function BetaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="beta-root bg-white text-black min-h-screen">
      {children}
    </div>
  );
}
