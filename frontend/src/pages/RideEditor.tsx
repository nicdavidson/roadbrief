import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

interface StopFormData {
  id?: number;
  name: string;
  lat: number;
  lng: number;
  stop_type: 'start' | 'gas' | 'meal' | 'overnight' | 'waypoint' | 'end';
  order_in_day: number;
}

interface DayFormData {
  id?: number;
  day_number: number;
  date: string;
  title: string;
  notes?: string | null;
  stops?: StopFormData[];
}

export default function RideEditor() {
  const navigate = useNavigate();
  const { rideId } = useParams<{ rideId: string }>();
  const isNew = !rideId || rideId === 'new';

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  // Days state
  const [days, setDays] = useState<DayFormData[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load existing ride if editing
  useEffect(() => {
    if (!isNew) {
      fetch(`/api/v1/rides/${rideId}`)
        .then(r => r.json())
        .then(data => {
          setName(data.name);
          setDescription(data.description || '');
          setStartDate(data.start_date);
          setEndDate(data.end_date);
          setStatus(data.status as 'draft' | 'published');

          // Load days with stops
          const loadedDays = (data.days || []).map((d: any) => ({
            ...d,
          }));
          setDays(loadedDays);
        })
        .catch(err => setError(err.message));
    }
  }, [rideId, isNew]);

  const addDay = () => {
    setDays(prev => [...prev, {
      day_number: prev.length + 1,
      date: '',
      title: `Day ${prev.length + 1}`,
      notes: '',
    }]);
  };

  const removeDay = (index: number) => {
    setDays(prev => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, day_number: i + 1 })));
  };

  const updateDay = (index: number, field: keyof DayFormData, value: string) => {
    setDays(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const addStop = (dayIndex: number) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== dayIndex) return d;
      const stops = d.stops || [];
      return { ...d, stops: [...stops, { name: '', lat: 0, lng: 0, stop_type: 'waypoint', order_in_day: stops.length + 1 }] };
    }));
  };

  const updateStop = (dayIndex: number, stopIndex: number, field: keyof StopFormData, value: string | number) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== dayIndex) return d;
      const stops = (d.stops || []).map((s, j) => j === stopIndex ? { ...s, [field]: value } : s);
      return { ...d, stops };
    }));
  };

  const removeStop = (dayIndex: number, stopIndex: number) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== dayIndex) return d;
      const stops = (d.stops || []).filter((_, j) => j !== stopIndex).map((s, j) => ({ ...s, order_in_day: j + 1 }));
      return { ...d, stops };
    }));
  };

  const saveRide = async () => {
    if (!name.trim() || !startDate) return;

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        name: name.trim(),
        description: description.trim() || null,
        start_date: startDate,
        end_date: endDate,
        status,
      };

      // Include days with stops if editing existing ride
      if (!isNew && rideId) {
        payload.days = days.map(d => ({
          ...d,
          stops: (d.stops || []).filter(s => s.name.trim()), // Only save named stops
        }));
      }

      const url = isNew ? '/api/v1/rides' : `/api/v1/rides/${rideId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Save failed' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const result = await res.json();
      setSuccess(true);

      // Redirect to the ride after save (use new share code)
      setTimeout(() => {
        navigate(`/ride/${result.share_code}`);
      }, 1000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRide = async () => {
    if (!confirm('Delete this ride? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/v1/rides/${rideId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      navigate('/rides');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const stopTypeOptions: { value: StopFormData['stop_type']; label: string; icon: string }[] = [
    { value: 'start', label: 'Start', icon: '🟢' },
    { value: 'gas', label: 'Gas', icon: '⛽' },
    { value: 'meal', label: 'Meal', icon: '🍔' },
    { value: 'overnight', label: 'Overnight', icon: '🏨' },
    { value: 'waypoint', label: 'Waypoint', icon: '📍' },
    { value: 'end', label: 'End', icon: '🔴' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="px-4 pt-5 pb-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <Link to="/rides" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {isNew ? 'New Ride' : 'Edit Ride'}
          </h1>
          <div className="w-5" /> {/* Spacer for alignment */}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm">
            Ride saved! Redirecting...
          </div>
        )}

        {/* Basic info */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ride Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="EMBC 2026 Ride"
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the ride"
              rows={2}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <div className="flex gap-3">
              {(['draft', 'published'] as const).map(s => (
                <label key={s} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    checked={status === s}
                    onChange={() => setStatus(s)}
                    className="text-blue-600"
                  />
                  <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-slate-800 my-6" />

        {/* Days */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Days & Stops</h2>

          {days.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              No days added yet. Add your first day below.
            </p>
          ) : (
            <div className="space-y-4">
              {days.map((day, dayIndex) => (
                <div key={dayIndex} className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
                  {/* Day header */}
                  <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Day {day.day_number}: {day.title}
                    </span>
                    <button
                      onClick={() => removeDay(dayIndex)}
                      className="text-red-400 hover:text-red-500 text-xs"
                    >
                      Remove Day
                    </button>
                  </div>

                  {/* Day fields */}
                  <div className="p-4 space-y-3">
                    <input
                      type="text"
                      value={day.title}
                      onChange={e => updateDay(dayIndex, 'title', e.target.value)}
                      placeholder="Day title"
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={day.date}
                      onChange={e => updateDay(dayIndex, 'date', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      value={day.notes ?? ''}
                      onChange={e => updateDay(dayIndex, 'notes', e.target.value)}
                      placeholder="Day notes"
                      rows={2}
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* Stops */}
                    <div className="space-y-2">
                      {(day.stops || []).map((stop, stopIndex) => (
                        <div key={stopIndex} className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-slate-800/30 rounded-lg">
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={stop.name}
                              onChange={e => updateStop(dayIndex, stopIndex, 'name', e.target.value)}
                              placeholder="Stop name"
                              className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="flex gap-2">
                              <input
                                type="number"
                                step="0.0001"
                                value={stop.lat || ''}
                                onChange={e => updateStop(dayIndex, stopIndex, 'lat', parseFloat(e.target.value) || 0)}
                                placeholder="Lat"
                                className="w-20 px-2 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                step="0.0001"
                                value={stop.lng || ''}
                                onChange={e => updateStop(dayIndex, stopIndex, 'lng', parseFloat(e.target.value) || 0)}
                                placeholder="Lng"
                                className="w-20 px-2 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <select
                                value={stop.stop_type}
                                onChange={e => updateStop(dayIndex, stopIndex, 'stop_type', e.target.value as StopFormData['stop_type'])}
                                className="flex-1 px-2 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {stopTypeOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <button
                            onClick={() => removeStop(dayIndex, stopIndex)}
                            className="text-red-400 hover:text-red-500 text-xs p-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => addStop(dayIndex)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        + Add Stop
                      </button>
                    </div>
                  </div>

                  {/* Remove day button (at bottom) */}
                  {dayIndex > 0 && (
                    <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800">
                      <button
                        onClick={() => removeDay(dayIndex)}
                        className="text-xs text-red-400 hover:text-red-500"
                      >
                        Remove Day {day.day_number}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={addDay}
                className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-slate-700 text-sm text-gray-500 dark:text-gray-400 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                + Add Day
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={saveRide}
            disabled={!name.trim() || !startDate || saving}
            className="flex-1 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : (isNew ? 'Create Ride' : 'Save Changes')}
          </button>

          {!isNew && (
            <button
              onClick={deleteRide}
              className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              Delete
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-600">
        RoadBrief
      </footer>
    </div>
  );
}
