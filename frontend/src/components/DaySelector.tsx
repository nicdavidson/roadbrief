import type { DayRead } from '../types';

interface DaySelectorProps {
  days: DayRead[];
  activeDay: number | null;
  onSelect: (dayNum: number | null) => void;
}

export default function DaySelector({ days, activeDay, onSelect }: DaySelectorProps) {
  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);

  return (
    <nav className="flex gap-2 overflow-x-auto px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 hide-scrollbar">
      <button
        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
          activeDay === null
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 shadow-sm'
        }`}
        onClick={() => onSelect(null)}
      >
        All Days
      </button>

      {sortedDays.map(day => (
        <button
          key={day.id}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
            activeDay === day.day_number
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 shadow-sm'
          }`}
          onClick={() => onSelect(day.day_number)}
        >
          <span className="sm:hidden">Day {day.day_number}</span>
          <span className="hidden sm:inline">Day {day.day_number}: {day.title?.split(' - ')[0] || day.date}</span>
        </button>
      ))}
    </nav>
  );
}
