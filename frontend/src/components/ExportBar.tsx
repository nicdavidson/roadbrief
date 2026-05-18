import { useState } from 'react';

interface ExportBarProps {
  dayId: number;
  rideShareCode?: string;
}

export default function ExportBar({ dayId, rideShareCode }: ExportBarProps) {
  const gpxUrl = `/api/v1/days/${dayId}/export/gpx`;
  const googleMapsUrl = `/api/v1/days/${dayId}/export/url`;
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = rideShareCode ? `${window.location.origin}/ride/${rideShareCode}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <a
          href={gpxUrl}
          download={`day-${dayId}.gpx`}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors min-h-[44px]"
        >
          GPX
        </a>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors min-h-[44px]"
        >
          Google Maps
        </a>

        {rideShareCode && (
          <button
            onClick={() => setShowShare(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
          >
            Share Ride
          </button>
        )}
      </div>

      {/* Share modal */}
      {showShare && shareUrl && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" onClick={() => setShowShare(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm safe-bottom"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white text-center mb-4">Share this ride</h3>
            <div className="bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-3 text-center">
              <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all select-all">{shareUrl}</p>
            </div>
            <button
              onClick={handleCopy}
              className="mt-4 w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors min-h-[48px]"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={() => setShowShare(false)}
              className="mt-2 w-full py-3 text-gray-500 dark:text-gray-400 text-sm font-medium min-h-[44px]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
