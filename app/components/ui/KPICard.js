'use client';
import Card from './Card';

export default function KPICard({ title, value, subtitle, icon, onClick, color = 'cyan' }) {
  const colorMap = {
    cyan: 'text-[#39F6D6]',
    violet: 'text-[#9B6BFF]',
    red: 'text-red-400',
    green: 'text-emerald-400',
  };

  return (
    <Card onClick={onClick} glow>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider">{title}</p>
          <p className={`text-xl sm:text-2xl font-bold mt-1 ${colorMap[color] || 'text-white'} truncate`}>
            {value}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && <span className="text-2xl ml-2 flex-shrink-0">{icon}</span>}
      </div>
    </Card>
  );
}
