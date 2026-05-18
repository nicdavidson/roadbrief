import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface RideSummary {
  id: number;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  share_code: string;
  status: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [rides, setRides] = useState<RideSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/rides')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setRides(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch { return iso; }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300',
      published: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
      archived: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading rides...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="px-4 pt-5 pb-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Rides</h1>
          <button
            onClick={() => navigate('/rides/new')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Ride
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {rides.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🏍️</p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No rides yet</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Create your first motorcycle ride to get started.
            </p>
            <button
              onClick={() => navigate('/rides/new')}
              className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Ride
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rides.map(ride => (
              <Link
                key={ride.id}
                to={`/ride/${ride.share_code}`}
                className="block p-4 rounded-xl border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{ride.name}</h3>
                    {ride.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {ride.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <span>{formatDate(ride.start_date)} — {formatDate(ride.end_date)}</span>
                      <span className="font-mono">{ride.share_code}</span>
                    </div>
                  </div>
                  {statusBadge(ride.status)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-600">
        RoadBrief
      </footer>
    </div>
  );
}
