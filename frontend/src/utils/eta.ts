import type { DayRead, StopRead, LegRead } from './types';

const DEFAULT_KICKSTANDS_UP = 8 * 60; // 8:00 AM in minutes from midnight

/**
 * Compute ETA (minutes from start of day) for each stop based on leg durations.
 * Returns a new array of stops with eta_minutes_from_start set, without mutating originals.
 */
export function computeStopETAs(day: DayRead): StopRead[] {
  const stops = day.stops || [];
  if (!stops.length) return stops;

  // Build a map of stop_id -> StopRead with ETA
  const etaMap = new Map<number, StopRead>();

  // First pass: set start stop ETA to 0
  const sortedStops = [...stops].sort((a, b) => a.order_in_day - b.order_in_day);
  for (const stop of sortedStops) {
    etaMap.set(stop.id, { ...stop, eta_minutes_from_start: null });
  }

  // Set the first stop (start type) ETA to 0 minutes from day start
  const startStop = sortedStops.find(s => s.stop_type === 'start') || sortedStops[0];
  if (startStop) {
    const entry = etaMap.get(startStop.id)!;
    etaMap.set(startStop.id, { ...entry, eta_minutes_from_start: 0 });
  }

  // Second pass: accumulate leg durations to compute arrival at each end stop
  const legs = (day.legs || []).sort((a, b) => a.order_in_day - b.order_in_day);
  let cumulativeMinutes = 0;

  for (const leg of legs) {
    const startStopId = leg.start_stop_id;
    const endStopId = leg.end_stop_id;

    // Get departure time from start stop (its ETA)
    const startEta = etaMap.get(startStopId)?.eta_minutes_from_start ?? 0;
    cumulativeMinutes = startEta + leg.duration_minutes;

    // Set arrival ETA for end stop
    const endEntry = etaMap.get(endStopId);
    if (endEntry) {
      // Only set if not already set to 0 (start stop), or if this leg gives earlier arrival
      if (endEntry.eta_minutes_from_start === null || cumulativeMinutes < endEntry.eta_minutes_from_start) {
        etaMap.set(endStopId, { ...endEntry, eta_minutes_from_start: cumulativeMinutes });
      }
    }
  }

  // Return stops in original order with ETA data
  return sortedStops.map(s => etaMap.get(s.id) || s);
}

/**
 * Format minutes from day start as a readable time string.
 * Uses configurable kickstands-up hour (default 8 AM).
 */
export function formatETA(minutesFromStart: number | null, kickstandsUpMinutes: number = DEFAULT_KICKSTANDS_UP): string {
  if (minutesFromStart === null) return '';

  const totalMinutes = kickstandsUpMinutes + minutesFromStart;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;

  if (hours < 0 || hours >= 24) return ''; // sanity check

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/**
 * Format minutes from day start as a duration string (e.g., "2h 15m").
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
