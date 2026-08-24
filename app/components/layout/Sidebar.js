'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/comptes', label: 'Comptes', icon: '🏦' },
  { href: '/investissements', label: 'Investissements', icon: '📈' },
  { href: '/credits', label: 'Crédits', icon: '💳' },
  { href: '/budget', label: 'Budget', icon: '📋' },
  { href: '/transactions', label: 'Transactions', icon: '🧾' },
  { href: '/import', label: 'Import Excel', icon: '📥' },
  { href: '/scan', label: 'Scanner relevé', icon: '🤖' },
  { href: '/export', label: 'Export', icon: '📤' },
  { href: '/parametres', label: 'Paramètres', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0B0F1A] border-r border-[#1F2937] h-screen sticky top-0">
      <div className="p-4 border-b border-[#1F2937]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <span className="text-lg font-bold bg-gradient-to-r from-[#39F6D6] to-[#9B6BFF] bg-clip-text text-transparent">
            Budget App
          </span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-[#39F6D6]/10 text-[#39F6D6] border border-[#39F6D6]/20'
                  : 'text-gray-400 hover:text-white hover:bg-[#1F2937] border border-transparent'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[#1F2937]">
        <p className="text-xs text-gray-600 text-center">v1.0.0</p>
      </div>
    </aside>
  );
}
