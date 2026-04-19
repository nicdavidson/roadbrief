import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../api';
import type { RiderProfile, UpdateProfileRequest } from '../types';

const MOTORCYCLE_OPTIONS = [
  'Sport',
  'Cruiser',
  'Touring',
  'Adventure/Dual Sport',
  'Naked/Streetfighter',
  'Scrambler',
  'Bagger',
  'Other',
];

const EXPERIENCE_OPTIONS = [
  'Beginner (< 2 years)',
  'Intermediate (2-5 years)',
  'Experienced (5-10 years)',
  'Expert (10+ years)',
];

export default function Profile() {
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<UpdateProfileRequest>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProfile()
      .then(data => {
        setProfile(data);
        setForm({
          display_name: data.display_name || '',
          bio: data.bio || '',
          motorcycle_type: data.motorcycle_type || '',
          riding_experience: data.riding_experience || '',
        });
        setLoading(false);
      })
      .catch(() => {
        // Not logged in — show sign-up prompt
        setLoading(false);
      });
  }, []);

  const handleChange = (field: keyof UpdateProfileRequest, value: string) => {
    setForm(prev => ({ ...prev, [field]: value || undefined }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateProfile(form);
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading profile...</div>
      </div>
    );
  }

  // Not logged in — show sign-up CTA
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold">Profile</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-6">🏍️</div>
          <h2 className="text-xl font-semibold mb-4">Sign up for a RoadBrief account</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Create your rider profile to save rides, manage your fleet, and share adventures with friends.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
            Create Account
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
      </header>

      {/* Profile content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl mb-4">
            {profile.display_name?.[0]?.toUpperCase() || '🏍️'}
          </div>
          <h2 className="text-xl font-semibold">
            {profile.display_name || profile.username}
          </h2>
          <p className="text-gray-400 text-sm">@{profile.username}</p>
          {profile.email && (
            <p className="text-gray-500 text-sm mt-1">{profile.email}</p>
          )}
        </div>

        {/* Edit form */}
        <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-6">
          {/* Display name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={form.display_name || ''}
              onChange={e => handleChange('display_name', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              placeholder="Your name"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bio
            </label>
            <textarea
              value={form.bio || ''}
              onChange={e => handleChange('bio', e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Tell us about your riding adventures..."
            />
          </div>

          {/* Motorcycle type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Motorcycle Type
            </label>
            <select
              value={form.motorcycle_type || ''}
              onChange={e => handleChange('motorcycle_type', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select type...</option>
              {MOTORCYCLE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Experience */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Riding Experience
            </label>
            <select
              value={form.riding_experience || ''}
              onChange={e => handleChange('riding_experience', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select experience...</option>
              {EXPERIENCE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Save button */}
          <button
            type="submit"
            disabled={saving}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              saving
                ? 'bg-gray-600 cursor-not-allowed'
                : saved
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
          </button>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          {/* Account info */}
          <div className="pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-500">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
