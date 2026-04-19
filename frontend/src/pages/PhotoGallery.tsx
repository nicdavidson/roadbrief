import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { uploadPhoto, deletePhoto } from '../api';
import type { PhotoRead, RideResponse } from '../types';

export default function PhotoGallery() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();

  const [photos, setPhotos] = useState<PhotoRead[]>([]);
  const [ride, setRide] = useState<RideResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRead | null>(null);
  const [filterDay, setFilterDay] = useState<number | null>(null);

  useEffect(() => {
    if (!shareCode) return;

    // Fetch ride to get ride_id and day info
    fetch(`/api/v1/rides/${shareCode}`)
      .then(r => r.json())
      .then((data: RideResponse) => {
        setRide(data);

        // Fetch photos for each day and aggregate
        const photoPromises = (data.days || []).map(day =>
          fetch(`/api/v1/rides/${data.id}/photos/day/${day.day_number}`)
            .then(r => r.json()) as Promise<PhotoRead[]>
        );

        return Promise.all(photoPromises);
      })
      .then(allPhotos => {
        setPhotos(allPhotos.flat().sort((a, b) => a.created_at.localeCompare(b.created_at)));
        setLoading(false);
      })
      .catch(() => {
        setPhotos([]);
        setLoading(false);
      });
  }, [shareCode]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !ride) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const dayNum = filterDay; // Upload to currently filtered day, or null for all days
        const newPhoto = await uploadPhoto(ride.id, file, dayNum || undefined);
        setPhotos(prev => [...prev, newPhoto]);
      } catch (err) {
        alert(`Failed to upload ${file.name}: ${(err as Error).message}`);
      }
    }
    setUploading(false);
  };

  const handleDelete = async (photoId: number) => {
    if (!confirm('Delete this photo?')) return;
    try {
      await deletePhoto(photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      setSelectedPhoto(null);
    } catch (err) {
      alert(`Failed to delete: ${(err as Error).message}`);
    }
  };

  const filteredPhotos = filterDay ? photos.filter(p => p.day_num === filterDay) : photos;

  const getDayNumbers = () => ride?.days?.map(d => d.day_number) || [];

  const getPhotoUrl = (photo: PhotoRead): string => {
    // Backend serves from /uploads/{file_path}
    return `/uploads/${photo.file_path}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading photos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(shareCode ? `/ride/${shareCode}` : '/')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Ride
            </button>
            <h1 className="text-xl font-bold">
              {ride?.name || 'Photo Gallery'}
            </h1>
          </div>
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors">
            Upload Photos
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </header>

      {/* Day filter */}
      {getDayNumbers().length > 1 && (
        <div className="max-w-6xl mx-auto px-4 py-3">
          <button
            onClick={() => setFilterDay(null)}
            className={`px-3 py-1 rounded-l-lg text-sm ${
              filterDay === null ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            All Days
          </button>
          {getDayNumbers().map(dayNum => (
            <button
              key={dayNum}
              onClick={() => setFilterDay(dayNum)}
              className={`px-3 py-1 text-sm ${
                filterDay === dayNum ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Day {dayNum}
            </button>
          ))}
        </div>
      )}

      {/* Photo grid */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-2xl mb-4">📷</p>
            <p>No photos yet.</p>
            <p className="text-sm mt-2">Upload photos from your ride to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map(photo => (
              <div
                key={photo.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-800"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={getPhotoUrl(photo)}
                  alt={photo.caption || `Photo ${photo.id}`}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                  <div className="p-3 w-full">
                    {photo.caption && (
                      <p className="text-sm truncate">{photo.caption}</p>
                    )}
                    {photo.day_num && (
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                        Day {photo.day_num}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Full-screen modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl"
            onClick={() => setSelectedPhoto(null)}
          >
            ✕
          </button>
          <div className="max-w-4xl max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
            <img
              src={getPhotoUrl(selectedPhoto)}
              alt={selectedPhoto.caption || 'Full screen photo'}
              className="max-h-[80vh] object-contain"
            />
            <div className="mt-4 flex items-center justify-between">
              <div>
                {selectedPhoto.caption && (
                  <p className="text-lg">{selectedPhoto.caption}</p>
                )}
                <div className="flex gap-2 mt-2">
                  {selectedPhoto.day_num && (
                    <span className="text-sm text-gray-400">Day {selectedPhoto.day_num}</span>
                  )}
                  {selectedPhoto.stop_num && (
                    <span className="text-sm text-gray-400">Stop {selectedPhoto.stop_num}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(selectedPhoto.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg">
          Uploading...
        </div>
      )}
    </div>
  );
}
