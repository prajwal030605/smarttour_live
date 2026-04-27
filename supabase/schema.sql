-- =====================================================================
-- SmartTour Database Schema (v2 - Multi-Location)
-- Run this in Supabase SQL Editor. Safe to re-run (idempotent).
-- =====================================================================

-- =====================================================================
-- 1. locations  (master list of tourist destinations)
-- =====================================================================
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  district TEXT,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lon DOUBLE PRECISION NOT NULL,
  radius_km DOUBLE PRECISION NOT NULL DEFAULT 5,
  max_capacity INTEGER NOT NULL DEFAULT 5000,
  normal_limit INTEGER NOT NULL DEFAULT 2000,
  high_limit INTEGER NOT NULL DEFAULT 4000,
  critical_limit INTEGER NOT NULL DEFAULT 5000,
  daily_quota INTEGER,
  featured_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate existing locations table (if it already existed with old schema)
-- NOTE: NOT NULL columns must include DEFAULT so existing rows are backfilled safely.
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS center_lat DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS center_lon DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS radius_km DOUBLE PRECISION NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_capacity INTEGER NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS normal_limit INTEGER NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS high_limit INTEGER NOT NULL DEFAULT 4000,
  ADD COLUMN IF NOT EXISTS critical_limit INTEGER NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS daily_quota INTEGER,
  ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Drop NOT NULL on legacy columns from the previous schema (lat/lng/etc.)
-- so new INSERTs (which use center_lat/center_lon) don't violate constraints.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'locations' AND column_name = 'lat'
               AND is_nullable = 'NO') THEN
    EXECUTE 'ALTER TABLE locations ALTER COLUMN lat DROP NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'locations' AND column_name = 'lng'
               AND is_nullable = 'NO') THEN
    EXECUTE 'ALTER TABLE locations ALTER COLUMN lng DROP NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'locations' AND column_name = 'lon'
               AND is_nullable = 'NO') THEN
    EXECUTE 'ALTER TABLE locations ALTER COLUMN lon DROP NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'locations' AND column_name = 'longitude'
               AND is_nullable = 'NO') THEN
    EXECUTE 'ALTER TABLE locations ALTER COLUMN longitude DROP NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'locations' AND column_name = 'latitude'
               AND is_nullable = 'NO') THEN
    EXECUTE 'ALTER TABLE locations ALTER COLUMN latitude DROP NOT NULL';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_locations_slug ON locations(slug);
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(is_active);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for locations" ON locations;
CREATE POLICY "Allow all for locations" ON locations
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 2. vehicle_logs  (entry/exit history)
-- =====================================================================
CREATE TABLE IF NOT EXISTS vehicle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('entry', 'exit')),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  vehicle_type TEXT NOT NULL,
  vehicle_registration_number TEXT NOT NULL DEFAULT '',
  phone_number TEXT NOT NULL DEFAULT '',
  email TEXT,
  passenger_count INTEGER NOT NULL DEFAULT 0,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- migrate existing rows (additive only)
ALTER TABLE vehicle_logs
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS session_id UUID;

CREATE INDEX IF NOT EXISTS idx_vehicle_logs_created_at ON vehicle_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_type ON vehicle_logs(type);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_location ON vehicle_logs(location_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_session ON vehicle_logs(session_id);

ALTER TABLE vehicle_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for vehicle_logs" ON vehicle_logs;
CREATE POLICY "Allow all for vehicle_logs" ON vehicle_logs
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 3. active_vehicles  (currently inside any location)
-- =====================================================================
CREATE TABLE IF NOT EXISTS active_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  vehicle_registration_number TEXT NOT NULL,
  phone_number TEXT NOT NULL DEFAULT '',
  email TEXT,
  vehicle_type TEXT NOT NULL,
  passenger_count INTEGER NOT NULL DEFAULT 0,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  session_id UUID,
  last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE active_vehicles
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT NOW();

-- One active row per (registration, location) pair
DROP INDEX IF EXISTS idx_active_vehicles_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_vehicles_unique
  ON active_vehicles(vehicle_registration_number, location_id);

CREATE INDEX IF NOT EXISTS idx_active_vehicles_location ON active_vehicles(location_id);

ALTER TABLE active_vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for active_vehicles" ON active_vehicles;
CREATE POLICY "Allow all for active_vehicles" ON active_vehicles
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 4. vehicle_sessions  (one-time bind for geofencing)
-- =====================================================================
CREATE TABLE IF NOT EXISTS vehicle_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_registration_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  passenger_count INTEGER NOT NULL DEFAULT 1,
  email TEXT,
  phone_number TEXT,
  device_id TEXT,
  session_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'active', 'completed', 'expired')),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_sessions_token ON vehicle_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_vehicle_sessions_email ON vehicle_sessions(email);
CREATE INDEX IF NOT EXISTS idx_vehicle_sessions_reg ON vehicle_sessions(vehicle_registration_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_sessions_status ON vehicle_sessions(status);

ALTER TABLE vehicle_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for vehicle_sessions" ON vehicle_sessions;
CREATE POLICY "Allow all for vehicle_sessions" ON vehicle_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 5. otp_codes  (email OTP verification)
-- =====================================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('vehicle_bind', 'admin_login')),
  used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for otp_codes" ON otp_codes;
CREATE POLICY "Allow all for otp_codes" ON otp_codes
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 6. admin_users  (proper auth for dashboard)
-- =====================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'zone_officer' CHECK (role IN ('super_admin', 'district_admin', 'zone_officer')),
  assigned_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for admin_users" ON admin_users;
CREATE POLICY "Allow all for admin_users" ON admin_users
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 7. festivals  (calendar for Holt-Winters multipliers)
-- =====================================================================
CREATE TABLE IF NOT EXISTS festivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  impact_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.5,
  applies_to_location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_festivals_dates ON festivals(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_festivals_location ON festivals(applies_to_location_id);

ALTER TABLE festivals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for festivals" ON festivals;
CREATE POLICY "Allow all for festivals" ON festivals
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 8. alerts  (admin alerts + broadcasts)
-- =====================================================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('threshold_high', 'threshold_critical', 'broadcast', 'emergency', 'quota_full')),
  message TEXT NOT NULL,
  metadata JSONB,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_location ON alerts(location_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for alerts" ON alerts;
CREATE POLICY "Allow all for alerts" ON alerts
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 9. push_subscriptions  (Web Push for Phase 5)
-- =====================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  session_id UUID REFERENCES vehicle_sessions(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for push_subscriptions" ON push_subscriptions;
CREATE POLICY "Allow all for push_subscriptions" ON push_subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 10. tourist_places  (kept for Phase 3 advisory; legacy data preserved)
-- =====================================================================
CREATE TABLE IF NOT EXISTS tourist_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  area TEXT NOT NULL,
  description TEXT,
  crowd_level TEXT NOT NULL CHECK (crowd_level IN ('low', 'medium', 'high'))
);

ALTER TABLE tourist_places ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for tourist_places" ON tourist_places;
CREATE POLICY "Allow all for tourist_places" ON tourist_places
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 11. threshold_config  (legacy; per-location thresholds now in locations)
-- =====================================================================
CREATE TABLE IF NOT EXISTS threshold_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normal_limit INTEGER NOT NULL DEFAULT 2000,
  high_limit INTEGER NOT NULL DEFAULT 5000,
  critical_limit INTEGER NOT NULL DEFAULT 8000
);

ALTER TABLE threshold_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for threshold_config" ON threshold_config;
CREATE POLICY "Allow all for threshold_config" ON threshold_config
  FOR ALL USING (true) WITH CHECK (true);

INSERT INTO threshold_config (normal_limit, high_limit, critical_limit)
SELECT 2000, 5000, 8000
WHERE NOT EXISTS (SELECT 1 FROM threshold_config LIMIT 1);

-- =====================================================================
-- SEED: 10 Uttarakhand locations
-- =====================================================================
INSERT INTO locations (slug, name, description, category, district, center_lat, center_lon, radius_km, max_capacity, normal_limit, high_limit, critical_limit, featured_image_url)
VALUES
  ('mussoorie',         'Mussoorie',          'Queen of the Hills - colonial-era hill station with cable cars and viewpoints',     'Hill Station',     'Dehradun',     30.4598, 78.0644, 5, 5000, 2000, 4000, 5000, NULL),
  ('rishikesh',         'Rishikesh',          'Yoga capital of the world - Ganges adventure and spirituality',                       'Religious + Adventure', 'Tehri Garhwal', 30.0869, 78.2676, 4, 8000, 3000, 6000, 8000, NULL),
  ('haridwar',          'Haridwar',           'Gateway to the gods - Har Ki Pauri and Ganga Aarti',                                 'Religious',        'Haridwar',     29.9457, 78.1642, 4, 15000, 5000, 10000, 15000, NULL),
  ('nainital',          'Nainital',           'Lake district of India - serene Naini Lake surrounded by hills',                     'Hill Station',     'Nainital',     29.3919, 79.4542, 4, 4000, 1500, 3000, 4000, NULL),
  ('auli',              'Auli',               'Skiing paradise with Himalayan panoramas',                                            'Adventure',        'Chamoli',      30.5266, 79.5709, 3, 2000, 800, 1500, 2000, NULL),
  ('jim-corbett',       'Jim Corbett',        'India''s oldest national park - tiger reserve',                                       'Wildlife',         'Nainital',     29.5300, 78.7747, 5, 1500, 600, 1200, 1500, NULL),
  ('kedarnath',         'Kedarnath',          'Sacred Char Dham temple at 3,583m - one of twelve Jyotirlingas',                      'Religious',        'Rudraprayag',  30.7346, 79.0669, 2, 3000, 1000, 2500, 3000, NULL),
  ('badrinath',         'Badrinath',          'Char Dham shrine of Lord Vishnu beside Alaknanda river',                              'Religious',        'Chamoli',      30.7433, 79.4938, 2, 5000, 2000, 4000, 5000, NULL),
  ('valley-of-flowers', 'Valley of Flowers',  'UNESCO World Heritage Site - alpine wildflower meadow',                              'Trekking',         'Chamoli',      30.7287, 79.6058, 3, 1000, 400, 800, 1000, NULL),
  ('lansdowne',         'Lansdowne',          'Untouched cantonment hill town with pine forests',                                    'Hill Station',     'Pauri Garhwal', 29.8377, 78.6868, 3, 1500, 600, 1200, 1500, NULL)
ON CONFLICT (slug) DO NOTHING;

-- Set Mussoorie daily quota example (Char Dham locations get strict caps)
UPDATE locations SET daily_quota = 2500 WHERE slug = 'kedarnath';
UPDATE locations SET daily_quota = 4000 WHERE slug = 'badrinath';
UPDATE locations SET daily_quota = 800  WHERE slug = 'valley-of-flowers';

-- Deactivate any pre-existing non-Uttarakhand rows (old/recycled project data)
-- This hides them from the app without destroying data.
UPDATE locations
SET is_active = FALSE
WHERE slug NOT IN (
  'mussoorie', 'rishikesh', 'haridwar', 'nainital', 'auli',
  'jim-corbett', 'kedarnath', 'badrinath', 'valley-of-flowers', 'lansdowne'
);

-- =====================================================================
-- SEED: tourist_places (legacy; preserved for advisory page)
-- =====================================================================
INSERT INTO tourist_places (name, category, area, description, crowd_level)
SELECT * FROM (VALUES
  ('Forest Research Institute', 'Historical', 'Dehradun', 'Colonial-era architecture and museum', 'high'),
  ('Robber''s Cave', 'Nature', 'Dehradun', 'Natural cave formation with stream', 'high'),
  ('Tapkeshwar Temple', 'Religious', 'Dehradun', 'Ancient Shiva temple by the river', 'medium'),
  ('Sahastradhara', 'Nature', 'Dehradun', 'Sulphur springs and waterfalls', 'medium'),
  ('Mindrolling Monastery', 'Religious', 'Dehradun', 'Tibetan Buddhist monastery', 'low'),
  ('Rajaji National Park', 'Wildlife', 'Dehradun', 'Wildlife sanctuary and tiger reserve', 'low'),
  ('Gun Hill', 'Viewpoint', 'Mussoorie', 'Cable car ride and panoramic views', 'high'),
  ('Kempty Falls', 'Nature', 'Mussoorie', 'Popular waterfall and picnic spot', 'high'),
  ('Mall Road', 'Shopping', 'Mussoorie', 'Colonial-era promenade with shops', 'high'),
  ('Lal Tibba', 'Viewpoint', 'Mussoorie', 'Highest point in Mussoorie', 'medium'),
  ('Company Garden', 'Park', 'Mussoorie', 'Manicured gardens and boating', 'medium'),
  ('Mussoorie Lake', 'Nature', 'Mussoorie', 'Artificial lake with activities', 'low')
) AS v(name, category, area, description, crowd_level)
WHERE NOT EXISTS (SELECT 1 FROM tourist_places LIMIT 1);

-- =====================================================================
-- SEED: festivals (sample 2026 calendar)
-- =====================================================================
INSERT INTO festivals (name, start_date, end_date, impact_multiplier, applies_to_location_id, is_active)
SELECT * FROM (VALUES
  ('Char Dham Yatra Opening',  '2026-04-30'::date, '2026-05-31'::date, 2.5, NULL::uuid, TRUE),
  ('Diwali',                   '2026-11-08'::date, '2026-11-10'::date, 1.6, NULL::uuid, TRUE),
  ('Holi',                     '2026-03-04'::date, '2026-03-05'::date, 1.4, NULL::uuid, TRUE),
  ('Summer Peak Season',       '2026-05-01'::date, '2026-06-30'::date, 1.5, NULL::uuid, TRUE),
  ('Christmas New Year Rush',  '2026-12-23'::date, '2027-01-02'::date, 1.7, NULL::uuid, TRUE)
) AS v(name, start_date, end_date, impact_multiplier, applies_to_location_id, is_active)
WHERE NOT EXISTS (SELECT 1 FROM festivals LIMIT 1);
