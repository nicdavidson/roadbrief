import { Link, useLocation } from 'react-router-dom';

interface HeaderBarProps {
  onMenuClick: () => void;
}

export default function HeaderBar({ onMenuClick }: HeaderBarProps) {
  const location = useLocation();

  // Don't show header on ride view (it has its own) or photo gallery
  const isRideView = location.pathname.match(/^\/ride\/[^/]+$/);
  const isPhotoGallery = location.pathname.match(/^\/ride\/[^/]+\/photos$/);
  const isEditor = location.pathname.includes('/rides/new') || location.pathname.includes('/edit');

  if (isRideView || isPhotoGallery || isEditor) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-30 px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-100 dark:border-slate-800">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {/* Hamburger menu */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Logo */}
        <Link to="/rides" className="text-lg font-bold text-gray-900 dark:text-white">
          RoadBrief
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link
            to="/rides"
            className={`p-2 rounded-lg transition-colors ${
              isActive('/rides')
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.842l-5.447-2.724M9 7v13" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
