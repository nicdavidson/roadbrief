import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  shareCode?: string;
}

export default function SidebarMenu({ isOpen, onClose, shareCode }: SidebarMenuProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const isActive = (path: string) => location.pathname === path;
  const isRideView = shareCode ? `/ride/${shareCode}` : null;

  // Build menu items
  const menuItems = [
    { label: 'All Rides', path: '/rides', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.842l-5.447-2.724M9 7v13" />
      </svg>
    )},
    ...(isRideView ? [{ label: 'This Ride', path: isRideView, icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 00.75-.75V9a3 3 0 00-3-3H9a3 3 0 00-3 3v6.75a.75.75 0 00.75.75h3a.75.75 0 01.75.75V21" />
      </svg>
    )}] : []),
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-slate-900 z-50 shadow-xl transition-transform duration-200 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-slate-800">
          <span className="text-lg font-bold text-gray-900 dark:text-white">RoadBrief</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onClose()}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}

          {/* Divider */}
          <div className="my-3 border-t border-gray-100 dark:border-slate-800" />

          {/* Profile link */}
          <Link
            to="/profile"
            onClick={() => onClose()}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              isActive('/profile')
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Profile
          </Link>

          {/* Create Ride button */}
          <button
            onClick={() => { onClose(); navigate('/rides/new'); }}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Ride
          </button>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 text-center text-xs text-gray-400 dark:text-gray-600 border-t border-gray-100 dark:border-slate-800">
          RoadBrief v0.1
        </div>
      </aside>
    </>
  );
}
