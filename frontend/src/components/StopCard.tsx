import { useState } from 'react';
import type { StopRead, POIRead, HighlightRead } from '../types';
import POIItem from './POIItem';
import HighlightCard from './HighlightCard';

const TYPE_ICONS: Record<string, string> = {
  start: '🏁', gas: '⛽', meal: '🍔', overnight: '🏨', waypoint: '📍', end: '🚩',
};

interface StopCardProps {
  stop: StopRead;
  isSelected?: boolean;
  onSelect?: (stopId: number) => void;
}

export default function StopCard({ stop, isSelected = false, onSelect }: StopCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Group POIs by type
  const poiGroups: Record<string, POIRead[]> = {};
  (stop.pois || []).forEach((poi) => {
    const type = poi.poi_type;
    if (!poiGroups[type]) poiGroups[type] = [];
    poiGroups[type].push(poi);
  });

  const typeLabel: Record<string, string> = {
    gas: '⛽ Gas stations',
    food: '🍔 Restaurants',
    hotel: '🏨 Lodging',
  };

  const icon = TYPE_ICONS[stop.stop_type] || '📍';
  const poiCount = stop.pois?.length || 0;

  // Get highlights for this stop (from the nested data)
  const highlights = (stop as unknown as { highlights?: HighlightRead[] }).highlights || [];

  // Get leg info to next stop
  const legs = (stop as unknown as { legs?: import('../types').LegRead[] }).legs || [];
  const nextLeg = legs.find(l => l.start_stop_id === stop.id);

  return (
    <div className={`stop-card border-b border-gray-200 dark:border-gray-700 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
      <button
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => {
          setExpanded(!expanded);
          if (onSelect) onSelect(stop.id);
        }}
      >
        <span className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="font-medium">Stop {stop.order_in_day + 1}: {stop.name}</span>
          <span className="text-xs text-gray-500">({poiCount} POIs)</span>
        </span>
        <span className="text-gray-400">{expanded ? '▼' : '►'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          {/* Rally point */}
          {stop.rally_point_name && (
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded p-2">
              <span className="font-medium">Rally:</span> {stop.rally_point_name}
              {' '}({stop.rally_point_lat?.toFixed(4)}, {stop.rally_point_lng?.toFixed(4)})
            </div>
          )}

          {/* Leg info to next stop */}
          {nextLeg && (
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded p-2">
              → {nextLeg.distance_miles.toFixed(1)} mi · ~{Math.round(nextLeg.duration_minutes / 60 * 10) / 10}h driving
            </div>
          )}

          {/* POIs grouped by type — use POIItem component */}
          {Object.entries(poiGroups).map(([type, pois]) => (
            <div key={type}>
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">
                {typeLabel[type] || `${type}s`} ({pois.length})
              </span>
              <div className="mt-2 space-y-1">
                {pois.map((poi) => (
                  <POIItem key={poi.id} poi={poi} />
                ))}
              </div>
            </div>
          ))}

          {/* Highlights for this stop — use HighlightCard */}
          {highlights.length > 0 && (
            <div>
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">
                Highlights ({highlights.length})
              </span>
              {highlights.map((h) => (
                <HighlightCard key={h.id} highlight={h} />
              ))}
            </div>
          )}

          {/* Leg highlights (warnings, scenic notes) */}
          {legs.length > 0 && (
            <div>
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">
                Route Notes
              </span>
              {legs.map(leg => (
                (leg as unknown as { highlights?: HighlightRead[] }).highlights || []
              )).flat().map((h) => (
                <HighlightCard key={h.id} highlight={h} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
