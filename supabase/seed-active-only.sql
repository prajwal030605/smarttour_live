-- =====================================================================
-- ACTIVE VEHICLES ONLY — quick standalone seeder
-- Paste this whole thing into Supabase SQL Editor and click Run.
-- Finishes in ~3 seconds. Idempotent.
-- =====================================================================

-- Clear prior demo rows
DELETE FROM active_vehicles WHERE email = 'demo-v2@smarttour.app';

-- One bulk INSERT that hits all 10 locations with status-tuned counts
WITH targets(slug, target_count) AS (
  VALUES
    ('kedarnath',         2700),
    ('haridwar',          5500),
    ('rishikesh',         3500),
    ('mussoorie',         2200),
    ('nainital',          1700),
    ('badrinath',         1500),
    ('auli',               600),
    ('jim-corbett',        450),
    ('lansdowne',          400),
    ('valley-of-flowers',  350)
)
INSERT INTO active_vehicles (
  location_id,
  vehicle_registration_number,
  phone_number,
  email,
  vehicle_type,
  passenger_count,
  latitude,
  longitude,
  last_heartbeat_at,
  created_at
)
SELECT
  l.id,
  -- Plate format includes location slug to guarantee global uniqueness
  'UK' || LPAD(((g.i * 17) % 14 + 1)::TEXT, 2, '0')
       || UPPER(SUBSTR(t.slug, 1, 2))
       || LPAD(g.i::TEXT, 5, '0'),
  '9' || LPAD(((g.i * 91) % 1000000000)::TEXT, 9, '0'),
  'demo-v2@smarttour.app',
  CASE (g.i % 6)
    WHEN 0 THEN 'Bus'
    WHEN 1 THEN 'Bike'
    WHEN 2 THEN 'Auto'
    ELSE 'Car'
  END,
  CASE (g.i % 6)
    WHEN 0 THEN 20 + (g.i % 25)
    WHEN 1 THEN 1  + (g.i % 2)
    WHEN 2 THEN 2  + (g.i % 3)
    ELSE 1 + (g.i % 4)
  END,
  l.center_lat + ((g.i % 100) - 50) * 0.0002,
  l.center_lon + ((g.i % 100) - 50) * 0.0002,
  NOW() - ((g.i % 30) || ' minutes')::INTERVAL,
  NOW() - ((g.i % 360) || ' minutes')::INTERVAL
FROM targets t
JOIN locations l ON l.slug = t.slug
CROSS JOIN LATERAL generate_series(1, t.target_count) AS g(i)
ON CONFLICT (vehicle_registration_number, location_id) DO NOTHING;

-- ─── Verification ────────────────────────────────────────────────────────
SELECT
  l.name,
  (SELECT COUNT(*) FROM active_vehicles WHERE location_id = l.id) AS active_now,
  l.normal_limit,
  l.high_limit,
  l.critical_limit,
  CASE
    WHEN (SELECT COUNT(*) FROM active_vehicles WHERE location_id = l.id) >= l.critical_limit THEN 'CRITICAL'
    WHEN (SELECT COUNT(*) FROM active_vehicles WHERE location_id = l.id) >= l.normal_limit  THEN 'HIGH'
    ELSE 'NORMAL'
  END AS status
FROM locations l
WHERE l.is_active = TRUE
  AND l.slug IN (
    'mussoorie','rishikesh','haridwar','nainital','auli',
    'jim-corbett','kedarnath','badrinath','valley-of-flowers','lansdowne'
  )
ORDER BY active_now DESC;

SELECT 'TOTAL' AS label, COUNT(*) AS active_vehicles FROM active_vehicles;
