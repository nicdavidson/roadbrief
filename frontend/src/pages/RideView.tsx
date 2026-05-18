import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { RideResponse, DayRead, HighlightRead } from '../types';
import { getRide, generateLegs } from '../api';
import HeaderBar from '../components/HeaderBar';
import RideMap from '../components/RideMap';
import DaySelector from '../components/DaySelector';
import StopCard from '../components/StopCard';
import ExportBar from '../components/ExportBar';
import HighlightCard from '../components/HighlightCard';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

const RideView: React.FC = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [ride, setRide] = useState<RideResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<number | null>(null);

  // Leg generation state
  const [generatingLegs, setGeneratingLegs] = useState<number | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareCode) return;
    getRide(shareCode)
      .then((data: RideResponse) => setRide(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [shareCode]);

  const handleGenerateLegs = async (dayId: number) => {
    setGeneratingLegs(dayId);
    setGenError(null);

    try {
      await generateLegs(dayId);
      // Refresh the ride data to pick up new legs
      const updated = await getRide(shareCode!);
      setRide(updated);
    } catch (err: any) {
      setGenError(err.message || 'Failed to generate legs');
    } finally {
      setGeneratingLegs(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading ride...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900 p-6">
        <div className="text-center max-w-sm">
          <p className="text-red-500 text-lg font-semibold mb-2">Something went wrong</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!ride) return null;

  const sortedDays = (ride.days || []).sort((a, b) => a.day_number - b.day_number);

  const totalMiles = sortedDays.reduce((sum, day) =>
    sum + (day.legs || []).reduce((s, l) => s + (l.distance_miles || 0), 0), 0
  );
  const totalStops = sortedDays.reduce((sum, day) => sum + (day.stops || []).length, 0);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Global header (hidden on ride view) */}
      <HeaderBar onMenuClick={() => {}} />

      {/* Ride Header */}
      <header className="px-4 pt-5 pb-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {ride.name}
            </h1>
            {ride.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{ride.description}</p>
            )}
          </div>
          <Link
            to={`/ride/${shareCode}/photos`}
            className="flex-shrink-0 ml-3 mt-1 flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Photos
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{formatDate(ride.start_date)} — {formatDate(ride.end_date)}</span>
          <span>{sortedDays.length} days</span>
          <span>{totalStops} stops</span>
          <span>~{Math.round(totalMiles)} mi</span>
        </div>
      </header>

      {/* Day selector */}
      <DaySelector
        days={sortedDays}
        activeDay={activeDay}
        onSelect={setActiveDay}
      />

      {/* Map */}
      <RideMap
        days={sortedDays}
        activeDay={activeDay}
        selectedStopId={selectedStopId}
        onMarkerClick={(stopId) => {
          setSelectedStopId(stopId);
          const el = document.getElementById(`stop-${stopId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />

      {/* Day content */}
      <div className="max-w-2xl mx-auto">
        {sortedDays.map((day: DayRead) => (
          activeDay === null || day.day_number === activeDay ? (
            <div key={day.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0">
              {/* Day header */}
              <div className="px-4 sm:px-6 pt-5 pb-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {day.title || `Day ${day.day_number}`}
                  </h2>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(day.date)}
                  </span>
                </div>

                {/* Route stats + generate button */}
                {day.legs && day.legs.length > 0 ? (
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                    <span>
                      {day.legs.reduce((sum, l) => sum + (l.distance_miles || 0), 0).toFixed(0)} mi
                    </span>
                    <span>
                      {(day.legs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) / 60).toFixed(1)}h riding
                    </span>
                    <span>{(day.stops || []).length} stops</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleGenerateLegs(day.id)}
                    disabled={generatingLegs === day.id}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {generatingLegs === day.id ? (
                      <>
                        <div className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 00.75-.75V9a3 3 0 00-3-3H9a3 3 0 00-3 3v6.75a.75.75 0 00.75.75h3a.75.75 0 01.75.75V21" />
                        </svg>
                        Generate Route
                      </>
                    )}
                  </button>
                )}

                {genError && (
                  <p className="mt-2 text-xs text-red-500">{genError}</p>
                )}
              </div>

              {/* Day-level highlights */}
              {(day.highlights || []).filter((h: HighlightRead) => h.day_id === day.id).length > 0 && (
                <div className="px-4 sm:px-6 pb-2">
                  {(day.highlights || []).filter((h: HighlightRead) => h.day_id === day.id).map((h: HighlightRead) => (
                    <HighlightCard key={h.id} highlight={h} />
                  ))}
                </div>
              )}

              {/* Stops */}
              <div>
                {(day.stops || []).map((stop) => (
                  <div key={stop.id} id={`stop-${stop.id}`}>
                    <StopCard
                      stop={stop}
                      isSelected={selectedStopId === stop.id}
                      onSelect={(sId) => setSelectedStopId(sId)}
                    />
                  </div>
                ))}
              </div>

              {/* Export bar */}
              <div className="px-4 sm:px-6 py-4">
                <ExportBar dayId={day.id} rideShareCode={ride.share_code} />
              </div>
            </div>
          ) : null
        ))}
      </div>

      {/* Footer */}
      <footer className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-600 safe-bottom">
        RoadBrief
      </footer>
    </div>
  );
};

export default RideView;
