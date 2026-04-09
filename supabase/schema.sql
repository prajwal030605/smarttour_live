-- SmartTour Database Schema
-- Run this in Supabase SQL Editor

-- 1. vehicle_logs
CREATE TABLE IF NOT EXISTS vehicle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('entry', 'exit')),
  vehicle_type TEXT NOT NULL,
  vehicle_registration_number TEXT NOT NULL DEFAULT '',
  phone_number TEXT NOT NULL DEFAULT '',
  passenger_count INTEGER NOT NULL DEFAULT 0,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicle_logs
  ADD COLUMN IF NOT EXISTS vehicle_registration_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_number TEXT NOT NULL DEFAULT '';

-- Index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_created_at ON vehicle_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_type ON vehicle_logs(type);

-- Enable RLS (Row Level Security)
ALTER TABLE vehicle_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for anon (adjust per your auth requirements)
DROP POLICY IF EXISTS "Allow all for vehicle_logs" ON vehicle_logs;
CREATE POLICY "Allow all for vehicle_logs" ON vehicle_logs
  FOR ALL USING (true) WITH CHECK (true);

-- 1b. active_vehicles (currently inside destination)
CREATE TABLE IF NOT EXISTS active_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_registration_number TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  passenger_count INTEGER NOT NULL DEFAULT 0,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (vehicle_registration_number, phone_number)
);

ALTER TABLE active_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for active_vehicles" ON active_vehicles;
CREATE POLICY "Allow all for active_vehicles" ON active_vehicles
  FOR ALL USING (true) WITH CHECK (true);

-- 2. threshold_config
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

-- Insert default threshold row (only if empty)
INSERT INTO threshold_config (normal_limit, high_limit, critical_limit)
SELECT 2000, 5000, 8000
WHERE NOT EXISTS (SELECT 1 FROM threshold_config LIMIT 1);

-- 3. tourist_places
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

-- Insert sample tourist places (Dehradun & Mussoorie region)
INSERT INTO tourist_places (name, category, area, description, crowd_level)
VALUES
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
;
