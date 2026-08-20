'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Accueil', icon: '🏠' },
  { href: '/comptes', label: 'Comptes', icon: '🏦' },
  { href: '/investissements', label: 'Invest.', icon: '📈' },
  { href: '/transactions', label: 'Transactions', icon: '🧾' },
  { href: '/budget', label: 'Budget', icon: '📋' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0B0F1A] border-t border-[#1F2937] z-50">
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.map((item) => {
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
      </div>
    </nav>
  );
}
