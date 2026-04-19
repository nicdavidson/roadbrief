import { useState } from 'react';

interface ExportBarProps {
  dayId: number;
  rideShareCode?: string;
}

export default function ExportBar({ dayId, rideShareCode }: ExportBarProps) {
  const gpxUrl = `/api/v1/days/${dayId}/export/gpx`;
  const googleMapsUrl = `/api/v1/days/${dayId}/export/url`;

  // Generate a simple QR code using a public API
  const [showQR, setShowQR] = useState(false);

  const shareUrl = rideShareCode ? `${window.location.origin}/ride/${rideShareCode}` : '';

  return (
    <div className="mt-4 space-y-3">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <a
          href={gpxUrl}
          download={`day-${dayId}.gpx`}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          <span>📥</span> Export GPX
        </a>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
        >
          <span>🗺️</span> Google Maps
        </a>

        {rideShareCode && (
          <button
            onClick={() => setShowQR(!showQR)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span>📱</span> QR Code
          </button>
        )}
      </div>

      {/* Share URL modal */}
      {showQR && shareUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-center mb-4">Share this ride</h3>
            <p className="text-sm text-center font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded break-all select-all">{shareUrl}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(shareUrl); }}
              className="mt-3 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Copy Link
            </button>
            <button
              onClick={() => setShowQR(false)}
              className="mt-2 w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Shareable link */}
      {rideShareCode && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 truncate flex-1 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            /ride/{rideShareCode}
          </span>
        </div>
      )}
    </div>
  );
}
