import type { DayRead } from '../types';

interface DaySelectorProps {
  days: DayRead[];
  activeDay: number | null;
  onSelect: (dayNum: number | null) => void;
}

export default function DaySelector({ days, activeDay, onSelect }: DaySelectorProps) {
  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);

  return (
    <div className="day-pills flex gap-2 overflow-x-auto p-3 border-b border-gray-200 dark:border-gray-700">
      <button
        className={`day-pill px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
          activeDay === null
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
        onClick={() => onSelect(null)}
      >
        All Days
      </button>

      {sortedDays.map(day => (
        <button
          key={day.id}
          className={`day-pill px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
            activeDay === day.day_number
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          onClick={() => onSelect(day.day_number)}
        >
          Day {day.day_number}
        </button>
      ))}

      {/* Mobile: hide overflow text */}
      <style>{`
        .day-pills::-webkit-scrollbar { display: none; }
        .day-pills { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
