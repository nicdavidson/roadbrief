import type { POIRead } from '../types';

interface POIItemProps {
  poi: POIRead;
}

export default function POIItem({ poi }: POIItemProps) {
  const navUrl = poi.lat && poi.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`
    : poi.address
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(poi.address)}`
      : undefined;

  return (
    <div className="flex items-center gap-3 px-3 py-3 min-h-[48px]">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{poi.name}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
          {poi.rating && (
            <span className="text-xs text-amber-500">
              {'★'.repeat(Math.round(poi.rating))}
              <span className="text-gray-400 ml-0.5">{poi.rating.toFixed(1)}</span>
            </span>
          )}
          {poi.hours && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{poi.hours}</span>
          )}
          {poi.phone && /^[\d\s+\-().]+$/.test(poi.phone) && (
            <a href={`tel:${poi.phone}`} className="text-xs text-blue-500 dark:text-blue-400">
              {poi.phone}
            </a>
          )}
        </div>
      </div>

      {navUrl && (
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 min-h-[36px] flex items-center"
        >
          Navigate
        </a>
      )}
    </div>
  );
}
