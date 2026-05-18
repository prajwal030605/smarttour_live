# SmartTour — AI-Based Tourist Crowd Intelligence

**Real-time crowd monitoring, automatic GPS-based entry/exit, and 7-day visitor forecasting for the 10 most-visited destinations in Uttarakhand.**

Built with Next.js 14 + Supabase + TypeScript. Deployed serverless on Vercel. Installable as a PWA.

---

## Table of Contents

1. [What it does](#what-it-does)
2. [Live demo](#live-demo)
3. [Architecture](#architecture)
4. [Quick start (local dev)](#quick-start-local-dev)
5. [Deploy to Vercel](#deploy-to-vercel)
6. [Project structure](#project-structure)
7. [Database schema](#database-schema)
8. [API endpoints](#api-endpoints)
9. [Key algorithms](#key-algorithms)
10. [Tested destinations](#tested-destinations)
11. [Optional integrations](#optional-integrations)
12. [Roadmap](#roadmap)

---

## What it does

SmartTour solves three operational problems faced by the Uttarakhand tourism department:

- **For tourists** — a public real-time crowd advisory and map showing how busy each destination is right now, so they can avoid over-capacity sites.
- **For zone officers** — automatic GPS-based detection of who is currently inside each tracked zone, with a manual checkpoint fallback (camera + plate capture) when GPS doesn't work.
- **For administrators** — a dashboard with live KPIs, 14-day analytics, **7-day Holt-Winters forecasts**, festival-aware multipliers, and inline daily-quota editing for sensitive Char Dham sites.

### Feature list

| Module | Description |
|--------|-------------|
| **Email-OTP registration** | One-time vehicle-to-device binding with a 6-digit code (Resend or console fallback). 24-hour session. |
| **GPS auto-tracking** | Client-side geofence state machine: 60-second dwell, 30-second debounce, 200-metre accuracy gate. Fires `entered`/`exited` events to the server with no user interaction. |
| **Manual checkpoint** | `/entry` and `/exit` forms with live camera feed (`getUserMedia`) and simulated AI plate detection. Auto-prefills from session. |
| **Crowd advisory** | Live multi-location board, refreshes every 30 seconds. Status badges: normal / high / critical. |
| **Crowd map** | react-leaflet dark-tile map with capacity-scaled circle markers per destination. |
| **AI forecasting** | Holt-Winters Triple Exponential Smoothing (α=0.3, β=0.1, γ=0.3, weekly seasonality) for 7-day visitor predictions. Falls back to linear regression if < 14 days of data. |
| **Festival calendar** | 10 seeded Uttarakhand events with traffic multipliers (×2.0 – ×3.5). |
| **Admin dashboard** | Overview, Analytics, Forecast, and Quotas tabs with Recharts visualisations. |
| **Daily quotas** | Per-location caps for Kedarnath (2,500), Badrinath (4,000), Valley of Flowers (800). API returns HTTP 429 when reached. |
| **PWA** | Installable on phone home screen, offline shell via service worker (production only). |
| **Command palette** | Cmd/Ctrl+K global shortcut with fuzzy navigation. |

---

## Live demo

The project deploys to a Vercel URL on every push. Branch-based preview deployments make every PR review-able on real devices.

---

## Architecture

A four-layer architecture. Each layer exposes a clean contract to the layer above.

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 4 — Client (PWA)                                     │
│  /register · /track · /entry · /exit · /advisory            │
│  /map · /festivals · /admin · /                             │
└──────────────────────────▲──────────────────────────────────┘
                           │  fetch (HTTPS / JSON)
┌──────────────────────────▼──────────────────────────────────┐
│  Layer 3 — API Routes (Vercel serverless)                   │
│  /api/locations · /api/session · /api/vehicle-log           │
│  /api/geofence · /api/current-crowd · /api/predict          │
│  /api/analytics · /api/otp                                  │
└──────────────────────────▲──────────────────────────────────┘
                           │  supabase-js client
┌──────────────────────────▼──────────────────────────────────┐
│  Layer 2 — Persistent Data (Supabase Postgres)              │
│  11 tables with RLS policies and indexes                    │
└──────────────────────────▲──────────────────────────────────┘
                           │  pure TypeScript modules
┌──────────────────────────▼──────────────────────────────────┐
│  Layer 1 — Algorithms (utils/)                              │
│  geofence.ts · holtWinters.ts · festivals.ts · locations.ts │
└─────────────────────────────────────────────────────────────┘
```

**Tech stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion · Recharts · react-leaflet · Supabase Postgres · Resend (optional)

---

## Quick start (local dev)

### 1. Clone and install

```bash
git clone https://github.com/prajwal030605/smarttour_live.git
cd smarttour_live
npm install
```

### 2. Set up Supabase

Create a free project at [supabase.com](https://supabase.com). From **Settings → API**, copy your Project URL and `anon` key.

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
# Optional — for real email OTP delivery (otherwise codes show on-screen)
# RESEND_API_KEY=re_xxxxx
```

### 3. Initialize the database

In **Supabase Dashboard → SQL Editor**, run the contents of:

```
supabase/schema.sql
```

This creates all 11 tables, RLS policies, indexes, and seeds the 10 Uttarakhand locations. The script is **idempotent** — safe to re-run.

### 4. (Optional) Seed demo data for AI forecasts

To populate Mussoorie with 30 days of realistic weekend-weighted traffic so the admin analytics and Holt-Winters forecast have data to show in demos, run:

```
supabase/seed-demo-data.sql
```

This inserts ~4,000 entry/exit events spread across 30 days with a weekly seasonality pattern and slight upward trend.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** If `NEXT_PUBLIC_SUPABASE_URL` is missing, the app automatically falls back to an in-memory `mockDb` (resets on every restart). Useful for quick UI work without setting up Supabase.

---

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. In **Project Settings → Environment Variables**, add for **Production + Preview + Development** scopes:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `RESEND_API_KEY` *(optional — for email OTP)*
4. Push to `main` → Vercel auto-deploys to production. Push to any feature branch → Vercel builds a preview URL automatically.

> **First-time gotcha:** If you reused an old Supabase project, the `locations` table may have legacy columns. The schema.sql contains an `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migration block that handles this safely. If you see `column "lat" violates not-null constraint`, the schema also drops NOT NULL on legacy `lat`/`lng`/`lon`/`latitude`/`longitude` columns automatically.

---

## Project structure

```
app/
  page.tsx              Landing page
  register/page.tsx     OTP-bound vehicle registration
  track/page.tsx        Live GPS geofence tracker
  entry/page.tsx        Manual entry + live camera
  exit/page.tsx         Manual exit with prefill
  advisory/page.tsx     Public crowd advisory board
  map/page.tsx          Interactive Leaflet crowd map
  festivals/page.tsx    Festival calendar
  admin/page.tsx        4-tab admin dashboard
  qr/page.tsx           QR code generator
  api/
    locations/          GET list, PATCH quota/thresholds
    session/            create / verify / [token]
    otp/                request / verify
    vehicle-log/        POST entry/exit with quota check
    geofence/           event / heartbeat (from GPS client)
    current-crowd/      Aggregated summary (4 parallel queries)
    analytics/          14-day chart data
    predict/            Holt-Winters 7-day forecast
    places/             Legacy tourist-places list
    threshold/          Legacy global config

components/
  ui/                   Toast, Confetti, CommandPalette, ServiceWorkerRegister, QRCodeDisplay
  map/CrowdMap.tsx      react-leaflet wrapper
  layout/Sidebar.tsx    Admin sidebar

lib/
  supabase-server.ts    Server-side Supabase client (env-aware)
  supabase.ts           Browser-side Supabase client
  mock-db.ts            In-memory fallback when env missing
  otp.ts                OTP generation + verification + session tokens
  email.ts              Resend integration + console fallback

utils/
  geofence.ts           Geofencer class — dwell timer, debounce, accuracy gate
  holtWinters.ts        Triple Exponential Smoothing implementation
  festivals.ts          10-event Uttarakhand calendar + multipliers
  locations.ts          Haversine + classifier + seed data
  linearRegression.ts   OLS fallback for short series
  device.ts             Device fingerprint + localStorage session helpers
  geolocation.ts        Browser geolocation wrappers
  constants.ts          UI constants (vehicle types, etc.)

supabase/
  schema.sql            11 tables, RLS, indexes, seed locations (idempotent)
  seed-demo-data.sql    30 days of weekend-weighted demo traffic for Mussoorie

types/
  index.ts              Project-wide types
  database.ts           Supabase row types

public/
  manifest.json         PWA manifest
  sw.js                 Service worker (cache-first shell, network-first API)
```

---

## Database schema

11 tables in Supabase Postgres, all with row-level security. See [`supabase/schema.sql`](supabase/schema.sql) for the full DDL.

| Table | Purpose |
|-------|---------|
| `locations` | 10 destinations with center coords, radius, capacity tiers, daily quota |
| `vehicle_sessions` | One row per registration; tracks status, session_token, 24h expiry |
| `otp_codes` | Short-lived (10-min) email verification codes |
| `active_vehicles` | Currently-inside snapshot; UNIQUE on (registration, location_id) |
| `vehicle_logs` | Append-only history of every entry and exit |
| `festivals` | Calendar of impact events with multipliers |
| `admin_users` | Tourism staff (super_admin / district_admin / zone_officer) |
| `alerts` | System notifications (threshold_high, broadcast, emergency, etc.) |
| `push_subscriptions` | Web Push endpoints (stretch feature) |
| `tourist_places` | Legacy Dehradun advisory data |
| `threshold_config` | Legacy global thresholds (now per-location) |

### Critical indexes

- `idx_vehicle_logs_created_at` — every analytics query filters by date
- `idx_vehicle_logs_location` — per-location aggregation
- `idx_active_vehicles_unique` on `(registration, location_id)` — prevents double-entry
- `idx_vehicle_sessions_token` — O(log n) session lookup

---

## API endpoints

15 routes total. All under `/api/`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/locations` | GET | List active destinations or fetch one by slug/id |
| `/api/locations` | PATCH | Admin update of thresholds / quota |
| `/api/session/create` | POST | Create vehicle session and send OTP |
| `/api/session/verify` | POST | Verify OTP and activate session |
| `/api/session/[token]` | GET | Look up a session by its token |
| `/api/otp/request` | POST | Generic OTP request (admin login flows) |
| `/api/otp/verify` | POST | Generic OTP verification |
| `/api/vehicle-log` | POST | Manual entry/exit with quota enforcement |
| `/api/geofence/event` | POST | Auto-detected entered/exited from GPS client |
| `/api/geofence/heartbeat` | POST | Refresh `last_heartbeat_at` for active session |
| `/api/current-crowd` | GET | Per-location crowd or `?summary=1` for all |
| `/api/predict` | GET | Holt-Winters 7-day forecast for a location |
| `/api/analytics` | GET | 14-day entry trend + vehicle type breakdown |
| `/api/places` | GET / POST | Legacy tourist-places (Dehradun advisory) |
| `/api/threshold` | GET / PATCH | Legacy global threshold config |

---

## Key algorithms

### Geofence state machine ([`utils/geofence.ts`](utils/geofence.ts))

Handles four real-world GPS issues that a naive radius check cannot:

| Issue | Mitigation |
|-------|------------|
| Drive-through (vehicle does not stop) | 60-second dwell timer before "entered" fires |
| Boundary flicker (GPS jitter at radius edge) | 30-second debounce cooldown |
| Bad GPS accuracy in hilly terrain | Accuracy gate at 200 m; worse readings emit heartbeats only |
| Overlapping zones | Smallest-radius wins (inner zone preferred) |

### Holt-Winters forecasting ([`utils/holtWinters.ts`](utils/holtWinters.ts))

Triple Exponential Smoothing decomposes the daily entry series into three components:

- **Level** (`α = 0.3`) — baseline
- **Trend** (`β = 0.1`) — directional growth
- **Seasonality** (`γ = 0.3`, period = 7) — weekly Sat/Sun spike pattern

Forecast for h steps ahead: `ŷ[n+h] = L + h·T + seasons[(n+h) mod 7]`

If the input series is shorter than 14 days, falls back to ordinary least-squares linear regression.

### Distance + classification ([`utils/locations.ts`](utils/locations.ts))

- **Haversine** great-circle distance — sub-100 m accurate for short distances
- **`findContainingLocation`** — picks the smallest-radius zone containing a point
- **`classifyCrowd`** — maps active count to `normal` / `high` / `critical` using per-location thresholds

---

## Tested destinations

The 10 Uttarakhand sites seeded in `supabase/schema.sql`:

| Slug | Name | Category | Radius | Capacity | Quota |
|------|------|----------|--------|----------|-------|
| `mussoorie` | Mussoorie | Hill Station | 5 km | 5,000 | — |
| `rishikesh` | Rishikesh | Religious + Adventure | 4 km | 8,000 | — |
| `haridwar` | Haridwar | Religious | 4 km | 15,000 | — |
| `nainital` | Nainital | Hill Station | 4 km | 4,000 | — |
| `auli` | Auli | Adventure | 3 km | 2,000 | — |
| `jim-corbett` | Jim Corbett | Wildlife | 5 km | 1,500 | — |
| `kedarnath` | Kedarnath | Religious | 2 km | 3,000 | 2,500 |
| `badrinath` | Badrinath | Religious | 2 km | 5,000 | 4,000 |
| `valley-of-flowers` | Valley of Flowers | Trekking | 3 km | 1,000 | 800 |
| `lansdowne` | Lansdowne | Hill Station | 3 km | 1,500 | — |

---

## Optional integrations

### Email OTP via Resend

Without `RESEND_API_KEY`, OTP codes are displayed on-screen in a "dev mode" amber banner with a tap-to-autofill button. To send real emails:

1. Sign up at [resend.com](https://resend.com) (free tier: 3,000 emails/month).
2. Verify a sender domain (or use `onboarding@resend.dev` for testing).
3. Add `RESEND_API_KEY=re_xxxxx` to `.env.local` and to Vercel env vars.
4. Redeploy.

### Camera-based plate detection

The `/entry` page includes a real `<video>` element bound to `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`. The "AI Scan Plate" button currently simulates OCR by picking from sample plates. To plug in a real OCR backend:

- Replace the simulated handler in [`app/entry/page.tsx`](app/entry/page.tsx)
- Capture a frame from the video element using `<canvas>.drawImage(video)`
- POST the image to a backend OCR service (Google Vision, AWS Rekognition, or self-hosted OpenCV + Tesseract)
- Use the returned text to populate the plate field

---

## Roadmap

- [ ] **Web Push** notifications (VAPID keys set up but not wired)
- [ ] **Forecast accuracy tracking** — store predictions and compare against actuals
- [ ] **Multi-language UI** (Hindi + English)
- [ ] **Admin authentication** with real OTP login via `/api/otp/*`
- [ ] **PDF export** of analytics reports (currently TSV)
- [ ] **Real OCR** backend integration for plate detection
- [ ] **WebSocket** updates for instant crowd refresh (currently 30s polling)

---

## License

MIT
