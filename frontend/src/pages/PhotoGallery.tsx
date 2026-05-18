import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPhotos, getRide, uploadPhoto, deletePhoto } from '../api';
import HeaderBar from '../components/HeaderBar';
import type { PhotoRead, RideResponse } from '../types';

export default function PhotoGallery() {
  const { shareCode } = useParams<{ shareCode: string }>();

  const [photos, setPhotos] = useState<PhotoRead[]>([]);
  const [ride, setRide] = useState<RideResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRead | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shareCode) return;

    getRide(shareCode)
      .then((data: RideResponse) => {
        setRide(data);
        return getPhotos(data.id);
      })
      .then((photoList) => {
        setPhotos(photoList.sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at)));
      })
      .catch(() => {
        setPhotos([]);
      })
      .finally(() => setLoading(false));
  }, [shareCode]);

  const getPhotoUrl = (photo: PhotoRead): string => {
    return `/uploads/${photo.image_url}`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large. Maximum 10MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const rideId = ride?.id;
      if (!rideId) return;

      await uploadPhoto(rideId, file);

      // Refresh photo list
      const updated = await getPhotos(rideId);
      setPhotos(updated.sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at)));

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: number) => {
    try {
      await deletePhoto(photoId);
      setPhotos(photos.filter(p => p.id !== photoId));
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to delete photo');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Global header (hidden on ride view and photo gallery) */}
      <HeaderBar onMenuClick={() => {}} />

      {/* Header */}
      <header className="px-4 pt-5 pb-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={shareCode ? `/ride/${shareCode}` : '/'}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Photos
            </h1>
          </div>
          {ride && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{ride.name}</span>
          )}
        </div>

        {/* Upload button */}
        <div className="mt-3">
          <button
            onClick={triggerFileInput}
            disabled={uploading || !ride}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border border-white/50 border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M4 17l2 2 6-6" />
                </svg>
                Upload Photo
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {uploadError && (
          <p className="mt-2 text-sm text-red-500">{uploadError}</p>
        )}
      </header>

      {/* Photo grid */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {photos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">📷</p>
            <p className="text-gray-500 dark:text-gray-400">No photos yet.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Upload photos from your ride to see them here.
            </p>
            <button
              onClick={triggerFileInput}
              disabled={!ride}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M4 17l2 2 6-6" />
              </svg>
              Upload Your First Photo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map(photo => (
              <div
                key={photo.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-800"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={getPhotoUrl(photo)}
                  alt={photo.caption || `Photo ${photo.id}`}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                  <div className="p-3 w-full">
                    {photo.caption && (
                      <p className="text-sm text-white truncate">{photo.caption}</p>
                    )}
                    {photo.featured && (
                      <span className="text-xs bg-amber-500/80 text-white px-2 py-0.5 rounded">
                        Featured
                      </span>
                    )}
                    {/* Delete button (only visible on hover for ride members) */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm('Delete this photo?')) {
                          handleDelete(photo.id);
                        }
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-600/80 text-white rounded-full hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete photo"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl z-10"
            onClick={() => setSelectedPhoto(null)}
          >
            ✕
          </button>
          <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <img
              src={getPhotoUrl(selectedPhoto)}
              alt={selectedPhoto.caption || 'Full screen photo'}
              className="max-h-[80vh] w-auto mx-auto object-contain rounded"
            />
            {selectedPhoto.caption && (
              <p className="text-white text-center mt-4">{selectedPhoto.caption}</p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-600 safe-bottom">
        RoadBrief
      </footer>
    </div>
  );
}
