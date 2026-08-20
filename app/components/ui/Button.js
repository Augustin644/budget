'use client';

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
}) {
  const base = 'font-medium rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2';
  
  const variants = {
    primary: 'bg-[#39F6D6] text-[#0B0F1A] hover:bg-[#2de0bf] active:bg-[#25c9ab]',
    secondary: 'bg-[#1F2937] text-gray-300 hover:bg-[#2a3548] border border-[#374151]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-400 hover:text-white hover:bg-[#1F2937]',
    violet: 'bg-[#9B6BFF] text-white hover:bg-[#8759e6]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
