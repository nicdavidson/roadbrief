# RoadBrief — Offline Strategy

Cell coverage in eastern Montana and rural Black Hills is unreliable. Offline support is a priority.

## What Works Offline

| Feature | Offline? | How |
|---------|----------|-----|
| View ride plan (days, stops, legs) | Yes | Service worker caches API response |
| View map with route | Yes | Mapbox tile cache (native) or OSM tile cache (web) |
| Browse POIs | Yes | Cached with ride data |
| Read highlights | Yes | Cached with ride data |
| Export GPX | Yes | Generated client-side from cached route geometry |
| Export Google Maps URL | Yes | Generated client-side from cached coordinates |
| Post photos | Queued | Stored in IndexedDB, uploaded when back online |
| View others' photos | Partial | Previously loaded photos cached, new ones need network |

## Implementation Layers

### Layer 1: App Shell (Workbox)
Cache the app itself — HTML, JS, CSS, fonts, icons.
```
workbox-precache: all build assets
workbox-routing: NetworkFirst for API, CacheFirst for static
```

### Layer 2: Ride Data Cache
When a rider views a ride, cache the full ride response:
```
GET /api/v1/rides/{share_code} → cache in IndexedDB
```
This includes all days, stops, legs, POIs, highlights — everything needed to render the ride plan without network.

Add a "Save for offline" button that explicitly triggers this + shows confirmation.

### Layer 3: Map Tiles

**Web (PWA):**
- Mapbox GL JS doesn't support offline tile download in web browsers
- Use Mapbox style with OpenStreetMap raster tile fallback for offline
- Service worker intercepts tile requests, caches along route corridor
- Pre-fetch tiles at zoom levels 8-14 along route polyline

**Native (Capacitor + Mapbox Native SDK):**
- Use `OfflineManager` to download tile packs
- Calculate bounding box from route geometry + buffer
- One-tap "Download Day X for offline"
- Show download progress and storage estimate

### Layer 4: Photo Queue
```typescript
// When offline:
// 1. Save photo to IndexedDB with metadata
// 2. Show in local gallery with "pending upload" badge
// 3. When back online, upload queue processes automatically
```

## Google Maps Offline Nudge
We can't programmatically trigger Google Maps offline downloads. Instead:
- After rider exports a leg/day to Google Maps, show a tip:
  "Tip: Download this area for offline in Google Maps → Profile → Offline maps → Select your own map"
- Include a link that opens Google Maps centered on the route area (user still has to manually download)

## Storage Budget
- App shell: ~2MB
- Ride data (JSON): <100KB
- Map tiles (one day corridor): 5-50MB depending on zoom/area
- Queued photos: variable, 2-10MB each
- Total reasonable budget: ~100MB

## Phase Plan
- Phase 1: Ride data caching via service worker (free, easy)
- Phase 3: Full offline with tile download (needs Capacitor for native, tile pre-fetch for web)
