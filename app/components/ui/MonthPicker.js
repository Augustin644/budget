'use client';
import Button from './Button';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function MonthPicker({ year, month, onChange }) {
  const goToPrevious = () => {
    if (month === 1) {
      onChange(year - 1, 12);
    } else {
      onChange(year, month - 1);
    }
  };

  const goToNext = () => {
    if (month === 12) {
      onChange(year + 1, 1);
    } else {
      onChange(year, month + 1);
    }
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    onChange(now.getFullYear(), now.getMonth() + 1);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={goToPrevious}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </Button>
      <button
        onClick={goToCurrentMonth}
        className="text-sm sm:text-base font-semibold text-white hover:text-[#39F6D6] transition-colors min-w-[140px] text-center"
      >
        {MONTHS[month - 1]} {year}
      </button>
      <Button variant="ghost" size="sm" onClick={goToNext}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Button>
    </div>
  );
}
