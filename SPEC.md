# RoadBrief — Group Ride Planning & Sharing

**Status:** SPEC v2 — Captain-reviewed, decisions locked
**Author:** XO Milo, with Captain Nic
**Date:** 2026-04-18
**First Use Case:** Eastern Montana Bible Camp (EMBC) Ride
**Repo:** TBD
**Domain:** roadbrief.com / roadbrief.app (to register)

---

## What This Is

A ride planning and route-sharing platform for organized group motorcycle rides. NOT a navigation app — it's the layer above navigation. The organizer builds the trip binder (route, stops, POIs, notes), shares it with the group, and riders export legs to whatever nav app they prefer.

**Origin story:** The guy who used to make the EMBC ride's printed map packets passed away. Captain was asked to take over route planning. This app replaces the paper binder with something digital, shareable, and reusable — then scales to serve other ride organizations.

**Business model:** Personal tool first → white-label SaaS for ride organizations. Each group (EMBC, Christian Motorcycle Association, HOG chapters, etc.) gets their own branded app instance. White glove service.

---

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Ride** | A multi-day group ride event (e.g., "EMBC Ride 2026") |
| **Day** | A riding day with start point, end point, and intermediate stops |
| **Leg** | A segment between two stops within a day |
| **Stop** | A waypoint — could be mid-day (gas/food break) or overnight |
| **POI** | Points of interest near a stop — gas, food, hotels, campgrounds |
| **Highlight** | Admin-authored note for a segment (scenic routes, entry fees, hazards, etc.) |
| **Rider** | A participant in the ride, with optional profile |
| **Group** | A sub-group within the ride, each with a leader/navigator |
| **Photo** | Geotagged image posted by a rider during or after the ride |

---

## User Roles

### Admin / Route Planner
- Creates and manages rides
- Inputs days and cities → system generates route
- Can adjust stops, reorder days, add/remove waypoints
- Sets stop type: city center (riders choose their own POI) or pinned rally point (specific location)
- Authors Highlights (notes, warnings, tips per segment)
- Manages rider list and groups
- Can share own live location ("I'm here") for the ride group
- Can curate/feature photos

### Group Leader / Navigator
- Designated by admin for their sub-group
- Can share live location with their group (v1.1)
- Same viewing/export capabilities as riders

### Rider (Participant)
- Views the full ride plan — days, stops, route, POIs
- Exports route legs to their preferred nav app
- Browses indexed POIs at each stop (gas, food, lodging)
- Posts photos with location
- Sets up profile (motorcycle, photo, name)

---

## Feature Breakdown

### 1. Ride Planning (Admin)

**Input:** A list of days with start/end cities and any intermediate stops.

Example input for EMBC ride:
```
Day 1: Glendive, MT → Rapid City, SD (via Belle Fourche)
Day 2: Rapid City, SD → Custer, SD (Needles Highway loop)
Day 3: Custer, SD → Sheridan, WY
Day 4: Sheridan, WY → Glendive, MT
```

**System does:**
1. Geocodes each city/stop
2. Generates a route between sequential stops (road-following, not straight line)
3. Estimates distance and ride time per leg and per day
4. Auto-indexes POIs near each stop (gas, food, lodging — based on stop type)
5. Presents the full ride plan on a map with all days visible

**Admin can then:**
- Adjust stop locations (drag on map or search)
- Set stop destination: **city center** (riders pick their own spot) or **pinned rally point** (specific gas station, restaurant, etc.)
- Add intermediate stops ("We'll gas up in Broadus")
- Mark stops as "gas only", "meal stop", "overnight", etc.
- Add Highlights to any leg or stop
- Set the order and timing

### 2. Stop Types & POI Indexing

| Stop Type | Auto-Indexed POIs |
|-----------|------------------|
| **Gas Stop** | Gas stations (within ~2 mi) |
| **Meal Stop** | Restaurants, diners, bars with food (within ~5 mi) |
| **Overnight** | Hotels, motels, campgrounds (within ~10 mi), plus gas, food |
| **Waypoint** | Scenic/pass-through, no POI indexing unless admin adds |

Each indexed POI shows:
- Name, address, distance from stop
- Hours of operation (if available)
- Rating (if available)
- Phone number
- "Motorcycle friendly" flag (admin can tag manually, or user-reported)
- Direct link to Google Maps / Apple Maps for navigation to that specific POI

**POI Sources (in priority order):**
1. Google Places API — best coverage, costs money per call
2. OpenStreetMap / Overpass API — free, good for gas stations and campgrounds
3. Admin manual entry — for spots only locals know

### 3. Route Export

Each day's route (or individual legs) exportable as:

| Format | For |
|--------|-----|
| **Google Maps URL** | Universal — opens in browser or Google Maps app |
| **GPX file** | Beeline Moto, Garmin, most GPS units |
| **Deep link** | Calimoto, Waze (if supported) |
| **QR code** | Scan from phone at morning briefing |

The export is per-leg or per-day. Not the whole multi-day ride in one file (that's unusable in most nav apps).

### 4. Highlights (Admin Notes)

Highlights are rich-text notes attached to a leg, stop, or day. They surface prominently in the ride plan view.

**Examples:**
- **Needles Highway** — $20/vehicle entry fee (Iron Mountain Road). Worth every penny. Tight tunnels — watch your mirrors if you're on a bagger.
- **No gas between Miles City and Broadus** — 80 miles. Top off.
- **Custer State Park** — Campground reservations recommended. Buffalo may be on the road. Not kidding.
- **Construction on I-90 near Hardin** — Expect 15 min delay, single lane.

Each highlight has:
- Title
- Body (markdown)
- Category: scenic, warning, cost, tip, info
- Attached to: a specific leg, stop, or day

### 5. Rider Profiles

**Account creation is optional but encouraged.**

Three tiers:
1. **Anonymous viewer** — Can view the ride plan, browse POIs, export routes. No account needed. Just needs the ride's share link.
2. **Named rider (no account)** — Enters first name in a local config. Can post photos tagged with their name. Data stored locally. Can't recover if they clear their browser.
3. **Account holder** — Full profile. Email optional but warned: *"Without an email, you can't reset your password if you forget it."* Can add:
   - Display name
   - Profile photo
   - Motorcycle (year, make, model — freeform text is fine)
   - Emergency contact info (visible to admin only)

**Why this tiered approach:** It's a Bible Camp ride with maybe 15-20 people. Don't make Grandpa Dave create an account with a strong password to see where lunch is. But the guy who wants to post photos of his Road King at every overlook should be able to build a profile.

### 6. Photos & Social

**During and after the ride:**
- Riders can post photos (from camera roll or direct capture)
- Each photo gets:
  - Automatic geolocation (from EXIF or manual pin)
  - Association with the nearest stop/leg
  - Rider attribution (name or account)
  - Optional caption
- Photos appear on:
  - The ride's photo gallery (chronological)
  - The map (clustered pins)
  - Each stop's detail view (photos taken near that stop)

**After the ride:**
- The photo gallery becomes a shared memory of the trip
- Admin can feature/pin best photos
- Could generate a shareable "ride recap" page

**NOT building:**
- Comments/likes (keep it simple for now)
- Stories/reels
- Real-time location sharing for all riders (v1.1 for leaders only)

### 7. Location Sharing (v1.1)

Limited real-time location, role-gated:

| Role | Can Share Location | Sees Others' Location |
|------|-------------------|----------------------|
| Admin | Yes (opt-in) | All sharers |
| Group Leader/Navigator | Yes (opt-in) | All sharers |
| Rider | No (v1.x), maybe later | Leaders/admin only |

Use case: "Hey, I'm already at the gas station in Belle Fourche" — admin drops a pin, riders can see where the group lead is. NOT continuous tracking. Opt-in, manual "I'm here" or toggle-on/toggle-off sharing.

### 8. Map View

The primary interface is a map.

- Full ride shown with each day's route in a different color
- Stops shown as markers with type icons
- Click a stop → see POIs, highlights, photos
- Click a leg → see distance, time, highlights
- Day selector to focus on one day at a time
- Mobile-first: works on a phone screen at a gas station
- "Download for offline" button per day/route

### 9. Offline Support

**Priority: HIGH.** Eastern Montana and the Black Hills have spotty cell coverage.

**What works offline:**
- Full ride plan (days, stops, legs, highlights, POIs)
- Map tiles along the route corridor (pre-cached)
- POI details (pre-cached at ride save time)
- Photos queue locally, upload when back in coverage

**How:**
- Service worker (Workbox) caches app shell and API data
- Map tiles: Mapbox GL (web) or Mapbox Native SDK (via Capacitor) for offline download
  - Google Maps offline download CANNOT be triggered programmatically (no API, no intent, no deep link — confirmed via research)
  - Mapbox Native SDK has `OfflineManager` that lets users download a route corridor with one tap
  - OpenStreetMap tiles can be cached by service worker as fallback
- "Download for offline" button calculates tiles needed for route corridor at zoom levels 10-16, downloads and caches
- Cached ride plan includes all POI data so it's usable without network

**Storage budgets:**
- Small route (10 mi): ~5-15MB
- Large region (50 mi): ~50-200MB
- iOS Safari is the constraint (~50MB default, more with `navigator.storage.persist()`)

---

## Data Model (Conceptual)

```
Organization (tenant)
├── id, name, slug, branding (colors, logo, etc.)
├── subscription_tier
│
Ride
├── id, org_id, name, description, start_date, end_date
├── created_by (admin user)
├── share_code (for invite links)
├── status (draft|published|archived)
│
├── Days[]
│   ├── day_number, date, title ("Glendive to Rapid City")
│   ├── Highlights[] (day-level notes)
│   ├── Legs[]
│   │   ├── start_point (lat/lng/name)
│   │   ├── end_point (lat/lng/name)
│   │   ├── route_geometry (polyline)
│   │   ├── distance_miles, duration_minutes
│   │   └── Highlights[]
│   │       ├── title, body, category
│   │       └── location (optional lat/lng)
│   └── Stops[]
│       ├── name, lat/lng, type (gas|meal|overnight|waypoint)
│       ├── destination_mode (city_center|pinned_location)
│       ├── rally_point (optional specific lat/lng for meetup)
│       ├── order_in_day
│       ├── POIs[]
│       │   ├── name, address, lat/lng, type
│       │   ├── hours, rating, phone
│       │   ├── motorcycle_friendly (bool)
│       │   └── source (google|osm|manual)
│       ├── Highlights[]
│       └── Photos[]
│
├── Groups[]
│   ├── id, name, leader_id
│   └── rider_ids[]
│
├── Riders[]
│   ├── id, display_name, profile_photo
│   ├── motorcycle (text)
│   ├── emergency_contact (admin-only)
│   ├── auth_type (anonymous|local|account)
│   ├── email (optional)
│   ├── group_id
│   └── role (admin|leader|rider)
│
└── Photos[]
    ├── id, rider_id, image_url
    ├── lat/lng, caption
    ├── nearest_stop_id
    ├── taken_at, uploaded_at
    └── featured (bool)
```

---

## Tech Stack

### Architecture: PWA + Capacitor → Store Apps

| Layer | Tech | Why |
|-------|------|-----|
| **Frontend** | React + Mapbox GL JS | Map-first UI, offline tile support, PWA installable |
| **Backend** | FastAPI (Python) | Captain knows Python, fast to build, async |
| **Database** | PostgreSQL + PostGIS | Spatial queries for POI proximity, multi-tenant |
| **POI Data** | Google Places API + OSM/Overpass fallback | Best coverage with free fallback |
| **Routing** | Mapbox Directions API or OSRM | Route geometry for map display |
| **Maps** | Mapbox GL JS (web) + Mapbox Native SDK (Capacitor) | Offline tile download via OfflineManager |
| **Photos** | Cloudflare R2 | Cheap object storage, no egress fees |
| **Auth** | Simple JWT + optional email | Lightweight, supports all three tiers |
| **Hosting** | Fly.io | Multi-tenant, wildcard certs, custom domains, ~$6/mo base |
| **Native Wrapper** | Capacitor (Ionic) | Wraps PWA into iOS + Android store apps |
| **Export** | Custom GPX generator + Google Maps URL builder + QR | Standard formats |
| **Offline** | Workbox service worker + Mapbox OfflineManager | Layered caching strategy |

### Why Mapbox over Google Maps

Google Maps SDK has NO offline download API. Their ToS explicitly prohibits tile caching. You cannot programmatically trigger the "Download offline area" flow — no deep link, no intent, nothing.

Mapbox:
- Native SDK has `OfflineManager` — programmatic one-tap corridor download
- ToS allows tile caching with attribution
- Vector tiles are smaller and more efficient than raster
- Free tier: 50K map loads/mo (web), 25K MAU (native)
- Estimated cost for a small app: free tier or ~$50-100/mo

### Why Fly.io over Crucible

Captain's internet goes out → app goes down for everyone on a ride. Fly.io:
- Wildcard certificates: `*.roadbrief.app`
- Custom domains per tenant with auto-TLS
- Scale to zero when not in use
- Global Anycast routing
- Managed Postgres option
- ~$6/mo for 3 instances with HA
- Start on Crucible for dev, deploy to Fly.io for prod

### White-Label Architecture

**Web (runtime):** Single deployed app, tenant detected by subdomain or custom domain.
- `embc.roadbrief.app` → EMBC branding
- `cma.roadbrief.app` → CMA branding
- `rides.some-hog-chapter.org` → custom domain, their branding

**Store apps (build-time):** Capacitor generates per-tenant native shells.
- Same codebase, different config: bundle ID, app name, icons, splash screens
- `com.roadbrief.embc` → "EMBC Ride" on App Store
- `com.roadbrief.cma` → "CMA Rides" on App Store

**Tenant config drives both:**
```json
{
  "id": "embc",
  "name": "EMBC Rides",
  "subdomain": "embc",
  "theme": {
    "primaryColor": "#2D5016",
    "secondaryColor": "#F5E6D3",
    "fontFamily": "Inter"
  },
  "assets": {
    "logo": "/tenants/embc/logo.svg",
    "icon512": "/tenants/embc/icon-512.png"
  },
  "app": {
    "bundleId": "com.roadbrief.embc",
    "appName": "EMBC Rides"
  }
}
```

---

## Decisions Log

| Question | Decision | Rationale |
|----------|----------|-----------|
| Stop destinations | Admin decides per stop — city center OR pinned rally point | Some stops are "meet at the Cenex" and some are "find your own dinner in Rapid City" |
| Real-time location | v1.1 — leaders/admin only, opt-in "I'm here" | Not V1 complexity, but useful for group coordination |
| Offline support | High priority, Mapbox for tiles | Eastern MT cell coverage is spotty. Google Maps offline can't be triggered programmatically |
| Revenue model | Personal tool → white-label SaaS | Build for EMBC, monetize by offering branded instances to other ride orgs |
| Name | **RoadBrief** | Zero conflicts found. All domains (.com, .app, .io) appear available. Clean, professional, emphasizes planning/briefing |
| Hosting | Fly.io (prod), Crucible (dev) | Internet outage during a ride = app down for everyone. Can't risk it on home infra |

### Names Researched (2026-04-18)

| Name | Verdict | Issue |
|------|---------|-------|
| **RoadBrief** | **WINNER** | Zero conflicts. All domains likely available |
| RideLine | Moderate risk | Cycling app at rideline.app, name crowded in transport |
| RallyPoint | High risk | Major military social network (VC-funded, 2M+ members) |
| SaddleUp | High risk | Saturated by equestrian world, all domains taken |
| IronRoute | High risk | MetaArmor motorcycle gear brand, .com is $3,595 |

---

## Phased Delivery

### Phase 1: Ride Plan Viewer (MVP)
- Admin inputs days/cities via form or config
- System geocodes stops, generates routes, indexes POIs
- Map view with days, legs, stops, POI cards
- Stop destination mode (city center vs pinned rally point)
- Route export (Google Maps URLs + GPX + QR codes)
- Highlights (admin notes)
- Share link (no auth required to view)
- Mobile-responsive PWA
- Basic offline: ride plan and POI data cached via service worker

### Phase 1.1: Leader Location Sharing
- Admin/leader can toggle "share my location"
- Shows on map for group members
- Manual "I'm here" pin drop option

### Phase 2: Rider Profiles & Photos
- Account creation (optional email, with password reset warning)
- Named rider (local-only option)
- Profile: name, photo, motorcycle
- Photo upload with geolocation
- Photo gallery per ride and per stop
- Offline photo queue (syncs when connected)

### Phase 3: Offline & Polish
- Mapbox OfflineManager integration via Capacitor
- One-tap "Download this day for offline" with progress bar
- Print-friendly day summary
- Ride recap / shareable gallery page

### Phase 4: Multi-Tenant & Store Apps
- Organization/tenant system
- White-label theming (config-driven)
- Capacitor builds → App Store / Play Store per tenant
- Admin dashboard with rider management
- Ride templates (reusable base routes)
- Custom domains per tenant

---

## EMBC Ride — First Implementation

Once Captain provides the day/city list, I'll:
1. Build the data structure for the EMBC ride
2. Geocode all stops
3. Generate routes and index POIs
4. Stand up the map viewer on Crucible (dev)
5. Captain reviews, adjusts stops, adds highlights
6. Deploy to Fly.io
7. Share link goes out to the group

This ride is the proving ground. Everything we learn feeds back into the platform.

---

## Competitive Landscape

Quick scan of what exists:

| App | What It Does | Why It's Not This |
|-----|-------------|-------------------|
| **Rever** | Motorcycle ride tracking/sharing | Social-first, not planning-first. No group ride organization. |
| **Calimoto** | Motorcycle navigation with curvy road preference | Navigation app, not a ride planner. Single rider focused. |
| **Beeline Moto** | Simplified motorcycle navigation | Hardware + nav, not group planning |
| **REVER** | Ride logging and community | Post-ride logging, not pre-ride planning |
| **Furkot** | Trip planning with stops | Car-focused, no motorcycle POI indexing, no group features |
| **Roadtrippers** | Road trip planning | Car/RV focused, no motorcycle-specific features, no group coordination |

**Gap:** Nobody is doing "ride organizer builds a trip binder, shares it with the group, everyone exports legs to their own nav app." The planning-and-sharing layer for organized group rides doesn't exist as a product.

---

*Spec v2 — XO Milo, 2026-04-18*
*"Plan the ride. Ride the plan. Post the photos. Tell the story."*
