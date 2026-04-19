# RoadBrief — Frontend Specification

React + TypeScript + Vite. Mapbox GL JS for maps. Tailwind CSS for styling.
Mobile-first — this will be used on phones at gas stations.

## Pages

### 1. Ride View (`/ride/{share_code}`)
The main page. What riders see when they open the share link.

**Layout (mobile):**
```
┌─────────────────────┐
│      MAP (60vh)      │  ← Mapbox GL, shows full route
│   [Day 1] [2] [3]   │  ← Day selector pills at bottom of map
├─────────────────────┤
│   Day 1: Glendive    │  ← Day title
│   to Hot Springs     │
│   ~450 mi · ~8h      │  ← Distance and time
├─────────────────────┤
│ ► Stop 1: Glendive   │  ← Expandable stop cards
│   ★ Rally: Cenex...  │
│ ► Stop 2: Alzada     │
│   ⛽ Gas stations (3) │
│ ► Stop 3: Hulett     │
│   🍔 Restaurants (5)  │
│   ⚠️ Highlight: ...   │
├─────────────────────┤
│ [Export Day as GPX]   │  ← Export buttons
│ [Open in Google Maps] │
│ [QR Code]             │
└─────────────────────┘
```

**Map behavior:**
- All days shown with different colored route lines
- Selecting a day zooms to that day's route
- Stop markers with type-appropriate icons (gas pump, fork/knife, bed, flag)
- Tapping a marker on map scrolls to that stop's card below
- Tapping a stop card pans map to that stop

**Day selector:**
- Horizontal pill bar overlaying bottom of map
- "All Days" option shows full route
- Active day highlighted

**Stop cards (expanded):**
- Stop name, type icon
- Rally point info (if pinned)
- POI list grouped by type (gas, food, lodging)
  - Each POI: name, distance, rating, hours
  - Tap POI → opens Google Maps/Apple Maps to that specific location
- Highlights for this stop (styled prominently)
- Leg info to next stop (distance, time)
- Leg highlights (warnings, scenic notes)

### 2. Ride Gallery (`/ride/{share_code}/photos`)
Photo gallery for the ride.

- Grid of photos, chronological
- Filter by day or stop
- Tap photo → full screen with caption, rider name, location
- Featured photos pinned to top

### 3. Profile (`/profile`)
Rider's own profile page.

- Display name, profile photo, motorcycle
- Edit form
- "Sign up for full account" prompt for local-only riders

### 4. Admin: Ride Editor (`/admin/ride/{id}`)
Where the organizer builds the ride. Not in V1 MVP — can use API directly or a simple form. Build this in Phase 2.

## Components

### `<RideMap />`
Mapbox GL JS map component.
- Props: `days: Day[]` (with legs and stops)
- Renders route lines per day (different colors)
- Renders stop markers
- Handles marker click → callback to parent
- Day filtering (show/hide routes by day)

### `<DaySelector />`
Horizontal scrollable pill bar.
- Props: `days: Day[]`, `activeDay: number | null`, `onSelect: (dayNum) => void`

### `<StopCard />`
Expandable card for a single stop.
- Props: `stop: Stop` (with POIs and highlights)
- Collapsed: name, type icon, POI count summary
- Expanded: full POI list, highlights, leg info to next stop

### `<POIItem />`
Single POI within a stop card.
- Props: `poi: POI`
- Shows: name, type icon, distance, rating, hours
- Tap: opens native maps app to this location

### `<HighlightCard />`
Styled note card for admin highlights.
- Props: `highlight: Highlight`
- Category-based styling (warning = amber, scenic = green, cost = blue, etc.)

### `<ExportBar />`
Export options for a day or leg.
- GPX download button
- Google Maps link button
- QR code generator (shows modal with QR)

## State Management
Keep it simple — React context or Zustand. One main state:
```typescript
interface RideState {
  ride: Ride | null;
  activeDay: number | null;  // day_number or null for "all"
  selectedStop: number | null;  // stop id
  loading: boolean;
  error: string | null;
}
```

Single fetch on mount: `GET /api/v1/rides/{share_code}` loads everything.

## Offline (Phase 3)
- Service worker (Workbox) caches app shell and ride data
- Mapbox tiles cached via style pack download
- Show "Offline" indicator in header when no connection
- Photo uploads queue in IndexedDB, sync when back online
