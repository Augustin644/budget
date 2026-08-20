'use client';

export default function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  className = '',
  required = false,
  step,
  min,
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs text-gray-400 uppercase tracking-wider">{label}</label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        step={step}
        min={min}
        className="bg-[#0B0F1A] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#39F6D6] focus:ring-1 focus:ring-[#39F6D6]/50 transition-colors"
      />
    </div>
  );
}
