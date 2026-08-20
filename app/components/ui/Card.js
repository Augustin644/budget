'use client';

export default function Card({ children, className = '', onClick, glow = false }) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[#111827] border border-[#1F2937] rounded-xl p-4 sm:p-6
        ${glow ? 'shadow-[0_0_15px_rgba(57,246,214,0.1)]' : 'shadow-lg'}
        ${onClick ? 'cursor-pointer hover:border-[#39F6D6]/30 transition-colors' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
