'use client';

export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-[#1F2937] text-gray-300',
    success: 'bg-emerald-500/20 text-emerald-400',
    danger: 'bg-red-500/20 text-red-400',
    warning: 'bg-amber-500/20 text-amber-400',
    info: 'bg-[#39F6D6]/20 text-[#39F6D6]',
    violet: 'bg-[#9B6BFF]/20 text-[#9B6BFF]',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
