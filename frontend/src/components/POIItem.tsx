import type { POIRead } from '../types';

const TYPE_ICONS: Record<string, string> = {
  gas: '⛽',
  food: '🍔',
  hotel: '🏨',
  campground: '⛺',
};

interface POIItemProps {
  poi: POIRead;
}

export default function POIItem({ poi }: POIItemProps) {
  const icon = TYPE_ICONS[poi.poi_type] || '📌';

  // Build Google Maps link from POI coordinates
  const mapsUrl = poi.lat && poi.lng
    ? `https://www.google.com/maps?q=${poi.lat},${poi.lng}${poi.name ? '+' + encodeURIComponent(poi.name) : ''}`
    : poi.address
      ? `https://www.google.com/maps/search/${encodeURIComponent(poi.address)}`
      : undefined;

  const appleMapsUrl = poi.lat && poi.lng
    ? `https://maps.apple.com/?q=${poi.lat},${poi.lng}${poi.name ? '+' + encodeURIComponent(poi.name) : ''}`
    : undefined;

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline block truncate"
          >
            {poi.name}
          </a>
        )}
        {!mapsUrl && <span className="text-sm font-medium block truncate">{poi.name}</span>}

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {poi.address && (
            <span className="truncate max-w-[200px]">{poi.address}</span>
          )}
          {poi.rating && (
            <span>{'★'.repeat(Math.round(poi.rating))} {poi.rating.toFixed(1)}</span>
          )}
          {poi.hours && (
            <span>{poi.hours}</span>
          )}
          {poi.phone && (
            <a href={`tel:${poi.phone}`} className="text-blue-500">
              {poi.phone}
            </a>
          )}
        </div>

        {/* Quick open buttons */}
        <div className="flex gap-2 mt-1">
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
              Google Maps
            </a>
          )}
          {appleMapsUrl && (
            <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
              Apple Maps
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
