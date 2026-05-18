import { useState, useEffect } from 'react';

interface RiderProfile {
  id: number;
  display_name: string;
  email?: string | null;
  profile_photo_url?: string | null;
  motorcycle?: string | null;
  auth_type: string;
  role: string;
  created_at: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state (editable fields)
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [motorcycle, setMotorcycle] = useState('');

  useEffect(() => {
    fetch('/api/v1/riders/me')
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setDisplayName(data.display_name);
        setEmail(data.email || '');
        setMotorcycle(data.motorcycle || '');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/v1/riders/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, email }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Save failed' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const updated = await res.json();
      setProfile(updated);
      setSuccess(true);

      // Clear success message after 2s
      setTimeout(() => setSuccess(false), 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveMotorcycle = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/riders/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motorcycle }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Save failed' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const updated = await res.json();
      setProfile(updated);
      setSuccess(true);

      setTimeout(() => setSuccess(false), 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900 p-6">
        <div className="text-center max-w-sm">
          <p className="text-red-500 text-lg font-semibold mb-2">Not authenticated</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">You need to log in to view your profile.</p>
        </div>
      </div>
    );
  }

  const authTypeLabel = profile.auth_type === 'local' ? 'Local Account' :
    profile.auth_type === 'github' ? 'GitHub OAuth' : profile.auth_type;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="px-4 pt-5 pb-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Profile</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm">
            Profile updated!
          </div>
        )}

        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          {profile.profile_photo_url ? (
            <img
              src={profile.profile_photo_url}
              alt={profile.display_name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl font-bold text-blue-600 dark:text-blue-400">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{profile.display_name}</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{authTypeLabel}</span>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Motorcycle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Motorcycle (optional)
          </label>
          <input
            type="text"
            value={motorcycle}
            onChange={e => setMotorcycle(e.target.value)}
            placeholder="e.g., 2024 BMW R1250GS"
            className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={saveMotorcycle}
            disabled={!motorcycle.trim() || saving}
            className="mt-2 px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            Save Bike
          </button>
        </div>

        {/* Account info */}
        <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Info</h3>
          <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <p>ID: {profile.id}</p>
            <p>Role: {profile.role}</p>
            <p>Created: {new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={saveProfile}
          disabled={!displayName.trim() || saving}
          className="w-full py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </main>

      {/* Footer */}
      <footer className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-600">
        RoadBrief
      </footer>
    </div>
  );
}
