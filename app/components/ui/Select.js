'use client';

export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Sélectionner...',
  className = '',
  required = false,
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs text-gray-400 uppercase tracking-wider">{label}</label>
      )}
      <select
        value={value}
        onChange={onChange}
        required={required}
        className="bg-[#0B0F1A] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#39F6D6] focus:ring-1 focus:ring-[#39F6D6]/50 transition-colors appearance-none"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
