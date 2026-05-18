# RoadBrief — Task List

Ordered by priority. Check off as completed.

---

## Phase 1: Core Polish (MVP for EMBC 2026)

- [ ] **Seed EMBC 2026 data** — Parse `routes/embc-2026.md` into the database
- [ ] **Day distance totals** — Calculate total miles per day from leg distances
- [ ] **Stop type icons** — Gas, meal, overnight, waypoint icons on map and cards
- [ ] **Leg ETA display** — Show estimated arrival times based on kickstands-up + cumulative drive time
- [ ] **Mobile-first responsive pass** — Ensure RideView works well on phone screens
- [ ] **Share link flow** — When shared, show join modal (name + motorcycle) before full view
- [ ] **Offline data cache** — Service worker + IndexedDB for viewing ride offline (read-only)
- [ ] **Export: Google Maps links per leg** — Generate multi-stop Google Maps URLs per leg
- [ ] **Export: GPX download** — Generate GPX file per day for GPS devices

## Phase 2: Rider Experience

- [ ] **Live location sharing** — WebSocket, optional opt-in, shows rider dots on map
- [ ] **Rider check-in at stops** — Tap to mark arrival, group knows who's where
- [ ] **Push notifications** — Ride updates, route changes, "group leaving in 5 min"
- [ ] **Photo auto-attach** — EXIF lat/lng matches to nearest stop automatically
- [ ] **Weather overlay** — Forecast per stop using lat/lng + date
- [ ] **Gas station distance warnings** — Flag legs >80mi with no gas stop

## Phase 3: Admin / Organizer

- [ ] **Ride builder UI** — Drag-and-drop stop ordering, map pin placement
- [ ] **Bulk stop import** — Paste a list of cities/addresses, geocode them
- [ ] **Route optimization suggestions** — Flag inefficient ordering
- [ ] **Rider management panel** — See who's joined, assign groups, emergency contacts
- [ ] **Ride templates** — Clone a previous ride as starting point

## Phase 4: Native & Distribution

- [ ] **Capacitor build** — iOS and Android packages from existing PWA
- [ ] **Deep links** — Share code opens directly in app if installed
- [ ] **App Store submission** — Screenshots, description, metadata
- [ ] **Offline map tiles** — Download map area for no-signal riding
- [ ] **Background location** — Continue sharing position when app backgrounded

## Phase 5: Platform Growth

- [ ] **Multi-org support** — Different riding groups on same platform
- [ ] **Public ride discovery** — Browse published rides by region
- [ ] **Ride history / journal** — Past rides become a photo timeline
- [ ] **Integrations** — Beeline, Calimoto, Rever route import

---

## Tech Debt / Bugs

- [ ] Fix unstaged working directory changes (review and commit or discard)
- [ ] Add backend test suite (pytest, minimum CRUD coverage)
- [ ] Frontend testing (Vitest + React Testing Library)
- [ ] API rate limiting (slowapi or similar)
- [ ] Input validation hardening (max lengths, sanitization)
- [ ] Error boundary in React (catch component crashes gracefully)
