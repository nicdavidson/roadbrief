import { Link } from 'react-router-dom';

export default function Profile() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4">🏍️</p>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Profile</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Account management coming soon.
        </p>
        <Link to="/" className="text-blue-500 hover:text-blue-600 text-sm">
          Back to Ride
        </Link>
      </div>
    </div>
  );
}
