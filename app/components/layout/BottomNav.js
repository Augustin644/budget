'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MAIN_ITEMS = [
  { href: '/dashboard', label: 'Accueil', icon: '🏠' },
  { href: '/comptes', label: 'Comptes', icon: '🏦' },
  { href: '/investissements', label: 'Invest.', icon: '📈' },
  { href: '/transactions', label: 'Transactions', icon: '🧾' },
];

const MORE_ITEMS = [
  { href: '/budget', label: 'Budget', icon: '📋' },
  { href: '/credits', label: 'Crédits', icon: '💳' },
  { href: '/import', label: 'Import Excel', icon: '📥' },
  { href: '/scan', label: 'Scanner', icon: '🤖' },
  { href: '/analyse', label: 'Analyse IA', icon: '🧠' },
  { href: '/export', label: 'Export', icon: '📤' },
  { href: '/parametres', label: 'Paramètres', icon: '⚙️' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = MORE_ITEMS.some((item) => pathname === item.href || pathname?.startsWith(item.href + '/'));

  return (
    <>
      {showMore && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowMore(false)} />
      )}

      {showMore && (
        <div className="md:hidden fixed bottom-16 left-2 right-2 bg-[#1F2937] border border-[#374151] rounded-xl z-50 p-2 shadow-lg">
          <div className="grid grid-cols-4 gap-1">
            {MORE_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-lg transition-colors ${
                    isActive ? 'text-[#39F6D6] bg-[#39F6D6]/10' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-[10px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0B0F1A] border-t border-[#1F2937] z-50">
        <div className="flex items-center justify-around py-2">
          {MAIN_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                  isActive ? 'text-[#39F6D6]' : 'text-gray-500'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
              isMoreActive || showMore ? 'text-[#39F6D6]' : 'text-gray-500'
            }`}
          >
            <span className="text-lg">⋯</span>
            <span className="text-[10px]">Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}
