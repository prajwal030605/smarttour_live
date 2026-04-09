# SmartTour – AI-Based Tourist Crowd Monitoring & Forecasting System

A production-ready full stack web application for real-time tourist crowd monitoring and forecasting.

## Tech Stack

- **Frontend & Backend:** Next.js 14 (App Router), TypeScript, TailwindCSS, Framer Motion, Recharts
- **Database:** Supabase PostgreSQL

## Features

- **Entry/Exit Logging:** GPS-validated vehicle entry and exit with 5km radius checkpoint validation
- **Crowd Analytics:** Real-time active vehicle count, status (Normal/High/Critical)
- **Linear Regression Prediction:** Tomorrow's predicted inflow using analytical formula
- **Admin Dashboard:** Analytics charts, threshold configuration, status monitoring
- **Tourist Advisory:** Smart recommendations based on crowd levels
- **QR Codes:** Static QR codes for Entry and Exit pages

## Setup

### 1. Clone and Install

```bash
cd smarttour-app
npm install
```

### 2. Environment Variables

Copy the example env file and add your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Schema

In your [Supabase Dashboard](https://app.supabase.com) → SQL Editor, run the contents of:

```
supabase/schema.sql
```

This creates `vehicle_logs`, `threshold_config`, and `tourist_places` tables with sample data.

### 4. Checkpoint Coordinates

The entry page validates that users are within 5km of a checkpoint. Default coordinates are in `types/index.ts` (Delhi). Update `CHECKPOINT_COORDS` to match your deployment location.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Access from Phone (QR Code Scanning)

To use entry/exit QR codes from your phone:

1. **Run with network access:**
   ```bash
   npm run dev:network
   ```
2. **Find your computer's IP:**
   - Mac/Linux: `ifconfig` or `ip addr` — look for `192.168.x.x`
   - Windows: `ipconfig` — look for IPv4 Address
3. **On your computer**, open `http://YOUR_IP:3000` (e.g. `http://192.168.1.5:3000`)
4. Go to the **QR Codes** page, enter the network URL if prompted, then scan with your phone

Ensure your phone and computer are on the **same Wi‑Fi network**.

### Development Mode (No Supabase)

If Supabase credentials are not set in `.env.local`, the app automatically uses an **in-memory mock database**. You can:

- Log vehicle entries and exits (stored in memory)
- View Admin dashboard with sample analytics
- See tourist advisory with Dehradun & Mussoorie places
- Configure thresholds

Data resets when the dev server restarts. Add Supabase credentials for persistent storage.

## Project Structure

```
/app
  /entry         - Vehicle entry form (GPS validated)
  /exit          - Vehicle exit form (with confetti)
  /admin         - Analytics dashboard
  /advisory      - Tourist recommendations
  /qr            - QR code generator
  /api           - API routes
/components      - Reusable UI components
/lib             - Supabase client
/utils           - Utilities (geolocation, linear regression)
/types           - TypeScript definitions
/supabase        - SQL schema
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/current-crowd` | GET | Active vehicles, status, thresholds |
| `/api/analytics` | GET | Daily and hourly entry/exit aggregates |
| `/api/predict` | GET | Predicted inflow and status |
| `/api/vehicle-log` | POST | Create entry or exit log |
| `/api/threshold` | GET/PUT | Fetch or update threshold config |
| `/api/places` | GET | List tourist places |

## Possible Enhancements

- **Authentication:** Admin login, role-based access
- **Notifications:** Alerts when crowd status becomes high/critical
- **Export:** CSV/PDF export of analytics
- **Map View:** Interactive map showing checkpoint and crowd hotspots
- **Mobile PWA:** Offline support, push notifications
- **Multi-checkpoint:** Support multiple entry/exit gates
- **Real-time Updates:** WebSocket for live crowd status

## License

MIT
