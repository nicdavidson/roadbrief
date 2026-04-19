import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { RideResponse, DayRead, StopRead, HighlightRead } from '../types';
import { getRide } from '../api';
import RideMap from '../components/RideMap';
import DaySelector from '../components/DaySelector';
import StopCard from '../components/StopCard';
import ExportBar from '../components/ExportBar';

// ─── RideView Page (Task 10 + Task 12) ────────────────────────────────────────
// Main page at /ride/{shareCode}. Fetches ride data and displays with map, day selector, stop cards.

interface RideViewProps {
  shareCode?: string;
}

const RideView: React.FC<RideViewProps> = ({ shareCode: propShareCode }) => {
  const routeParams = useParams<{ shareCode: string }>();
  const shareCode = routeParams.shareCode || propShareCode;

  const [ride, setRide] = useState<RideResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<number | null>(null);

  useEffect(() => {
    if (!shareCode) return;

    getRide(shareCode)
      .then((data: RideResponse) => setRide(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [shareCode]);

  if (loading) return <div className="p-4 text-center">Loading ride data...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!ride) return <div className="p-4">No ride found for share code: {shareCode}</div>;

  const sortedDays = (ride.days || []).sort((a, b) => a.day_number - b.day_number);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold">{ride.name}</h1>
        <p className="text-sm text-gray-500">
          {ride.start_date} → {ride.end_date} · Share: <code>{ride.share_code}</code>
        </p>
      </div>

      {/* Day selector pills */}
      <DaySelector days={sortedDays} activeDay={activeDay} onSelect={setActiveDay} />

      {/* Map */}
      <RideMap
        days={sortedDays}
        activeDay={activeDay}
        selectedStopId={selectedStopId}
        onMarkerClick={(stopId) => {
          setSelectedStopId(stopId);
          // Scroll to the stop card (simple scroll into view)
          const el = document.getElementById(`stop-${stopId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />

      {/* Stops */}
      <div className="p-4">
        {sortedDays.map((day: DayRead) => (
          activeDay === null || day.day_number === activeDay ? (
            <div key={day.id}>
              {/* Day header */}
              <h3 className="font-semibold text-lg mt-4">{day.title}</h3>
              <p className="text-sm text-gray-500">
                Day {day.day_number} · {day.date}
              </p>

              {/* Total distance/time for this day */}
              {day.legs && day.legs.length > 0 && (
                <p className="text-sm text-gray-400">
                  ~{day.legs.reduce((sum, l) => sum + (l.distance_miles || 0), 0).toFixed(0)} mi · ~{Math.round(day.legs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) / 60 * 10) / 10}h
                </p>
              )}

              {/* Stops for this day */}
              <div className="mt-2">
                {(day.stops || []).map((stop: StopRead) => (
                  <div key={stop.id} id={`stop-${stop.id}`}>
                    <StopCard
                      stop={stop}
                      isSelected={selectedStopId === stop.id}
                      onSelect={(sId) => setSelectedStopId(sId)}
                    />
                  </div>
                ))}
              </div>

              {/* Day-level highlights */}
              {(day.highlights || []).filter((h: HighlightRead) => h.day_id === day.id).map((h: HighlightRead) => (
                <div key={h.id} className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded text-sm">
                  <strong>{h.title}:</strong> {h.body}
                </div>
              ))}

              {/* Export buttons */}
              <ExportBar dayId={day.id} rideShareCode={ride.share_code} />

            </div>
          ) : null
        ))}
      </div>
    </div>
  );
};

export default RideView;
