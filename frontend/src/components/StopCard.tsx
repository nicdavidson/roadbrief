import { useState } from 'react';
import type { StopRead, POIRead, HighlightRead } from '../types';
import POIItem from './POIItem';
import HighlightCard from './HighlightCard';

const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  start: { icon: '🟢', label: 'Start' },
  gas: { icon: '⛽', label: 'Gas' },
  meal: { icon: '🍔', label: 'Meal' },
  overnight: { icon: '🏨', label: 'Overnight' },
  waypoint: { icon: '📍', label: 'Waypoint' },
  end: { icon: '🔴', label: 'End' },
};

const POI_GROUP_LABELS: Record<string, { label: string; icon: string }> = {
  gas: { label: 'Gas Stations', icon: '⛽' },
  food: { label: 'Food & Drink', icon: '🍔' },
  hotel: { label: 'Lodging', icon: '🏨' },
  campground: { label: 'Campgrounds', icon: '⛺' },
};

function POIGroup({ type, pois }: { type: string; pois: POIRead[] }) {
  const [open, setOpen] = useState(false);
  const group = POI_GROUP_LABELS[type] || { label: type, icon: '📌' };

  return (
    <div>
      <button
        className="w-full flex items-center justify-between py-2.5 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <span>{group.icon}</span>
          {group.label}
          <span className="text-xs font-normal text-gray-400">({pois.length})</span>
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg divide-y divide-gray-100 dark:divide-slate-700 mb-2">
          {pois.map((poi) => (
            <POIItem key={poi.id} poi={poi} />
          ))}
        </div>
      )}
    </div>
  );
}

interface StopCardProps {
  stop: StopRead;
  isSelected?: boolean;
  onSelect?: (stopId: number) => void;
}

export default function StopCard({ stop, isSelected = false, onSelect }: StopCardProps) {
  const [expanded, setExpanded] = useState(false);

  const poiGroups: Record<string, POIRead[]> = {};
  (stop.pois || []).forEach((poi) => {
    const type = poi.poi_type;
    if (!poiGroups[type]) poiGroups[type] = [];
    poiGroups[type].push(poi);
  });

  const meta = TYPE_LABELS[stop.stop_type] || TYPE_LABELS.waypoint;
  const poiCount = stop.pois?.length || 0;
  const highlights = (stop as unknown as { highlights?: HighlightRead[] }).highlights || [];

  return (
    <div className={`border-b border-gray-100 dark:border-slate-800 transition-colors ${
      isSelected ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''
    }`}>
      {/* Tap target */}
      <button
        className="w-full px-4 sm:px-6 py-4 text-left flex items-center gap-3 active:bg-gray-50 dark:active:bg-slate-800 min-h-[56px]"
        onClick={() => {
          setExpanded(!expanded);
          if (onSelect) onSelect(stop.id);
        }}
      >
        <span className="text-xl flex-shrink-0">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">
            {stop.name}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {meta.label}
            {poiCount > 0 && <span> · {poiCount} nearby</span>}
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 sm:px-6 pb-4 space-y-4">
          {/* Rally point */}
          {stop.rally_point_name && (
            <div className="text-sm bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
              <span className="font-medium text-gray-700 dark:text-gray-300">Rally Point:</span>{' '}
              <span className="text-gray-600 dark:text-gray-400">{stop.rally_point_name}</span>
            </div>
          )}

          {/* Highlights */}
          {highlights.length > 0 && highlights.map((h) => (
            <HighlightCard key={h.id} highlight={h} />
          ))}

          {/* POI groups — collapsed by default */}
          {Object.entries(poiGroups).map(([type, pois]) => (
            <POIGroup key={type} type={type} pois={pois} />
          ))}

          {poiCount === 0 && highlights.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No nearby services found</p>
          )}
        </div>
      )}
    </div>
  );
}
