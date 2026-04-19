import type { RideResponse, DayRead, StopRead, LegRead, POIRead, HighlightRead, PhotoRead, RiderProfile, UpdateProfileRequest } from './types';

const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, options);
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Ride endpoints
export async function getRide(shareCode: string): Promise<RideResponse> {
  return fetchJson<RideResponse>(`/rides/${shareCode}`);
}

// Day endpoints (for future use)
export async function getDays(rideId: number): Promise<DayRead[]> {
  return fetchJson<DayRead[]>(`/rides/${rideId}/days`);
}

// Stop endpoints (for future use)
export async function getStops(dayId: number): Promise<StopRead[]> {
  return fetchJson<StopRead[]>(`/days/${dayId}/stops`);
}

// Leg endpoints (for future use)
export async function generateLegs(dayId: number): Promise<LegRead[]> {
  return fetchJson<LegRead[]>(`/days/${dayId}/generate-legs`, {
    method: 'POST',
  });
}

// POI endpoints (for future use)
export async function indexPOIs(stopId: number): Promise<POIRead[]> {
  return fetchJson<POIRead[]>(`/stops/${stopId}/index-pois`, {
    method: 'POST',
  });
}

// Highlight endpoints (for future use)
export async function getHighlights(rideId: number): Promise<HighlightRead[]> {
  return fetchJson<HighlightRead[]>(`/rides/${rideId}/highlights`);
}

// Export endpoints (for future use)
export function getGPXUrl(dayId: number): string {
  return `${API_BASE}/days/${dayId}/export/gpx`;
}

export function getGoogleMapsUrl(dayId: number): string {
  return `${API_BASE}/days/${dayId}/export/url`;
}

// Photo endpoints
export async function getPhotos(rideId: number): Promise<PhotoRead[]> {
  return fetchJson<PhotoRead[]>(`/rides/${rideId}/photos`);
}

export async function getPhotosByDay(rideId: number, dayNum: number): Promise<PhotoRead[]> {
  return fetchJson<PhotoRead[]>(`/rides/${rideId}/photos/day/${dayNum}`);
}

export async function uploadPhoto(
  rideId: number,
  file: File,
  dayNum?: number,
  stopNum?: number,
  caption?: string,
  lat?: number,
  lng?: number,
): Promise<PhotoRead> {
  const formData = new FormData();
  formData.append('file', file);
  if (dayNum !== undefined) formData.append('day_num', String(dayNum));
  if (stopNum !== undefined) formData.append('stop_num', String(stopNum));
  if (caption) formData.append('caption', caption);
  if (lat !== undefined) formData.append('lat', String(lat));
  if (lng !== undefined) formData.append('lng', String(lng));

  const response = await fetch(`${API_BASE}/rides/${rideId}/photos`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || `Upload error ${response.status}`);
  }
  return response.json();
}

export async function deletePhoto(photoId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/photos/${photoId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Delete failed' }));
    throw new Error(err.detail || `Delete error ${response.status}`);
  }
}

// Profile endpoints
export async function getProfile(): Promise<RiderProfile> {
  return fetchJson<RiderProfile>('/riders/me');
}

export async function updateProfile(data: UpdateProfileRequest): Promise<RiderProfile> {
  const response = await fetch(`${API_BASE}/riders/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Update failed' }));
    throw new Error(err.detail || `Update error ${response.status}`);
  }
  return response.json();
}
