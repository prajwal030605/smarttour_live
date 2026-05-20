-- =====================================================================
-- SmartTour — All-Locations Demo Seed (BULK / FAST version)
-- Uses INSERT … SELECT FROM generate_series for bulk inserts.
-- Completes in ~5-10 seconds on Supabase free tier (vs 60+s for row-by-row).
--
-- Target outcome on /advisory:
--   ▸ 1 critical (red)   — Kedarnath
--   ▸ 4 high     (amber) — Haridwar, Rishikesh, Mussoorie, Nainital
--   ▸ 5 normal   (green) — Badrinath, Auli, Jim Corbett, Lansdowne, Valley of Flowers
--
-- Safe to re-run. Clears prior demo-v2 rows before inserting.
-- =====================================================================

-- ─── 1. Clean prior demo data ────────────────────────────────────────────
DELETE FROM active_vehicles WHERE email = 'demo-v2@smarttour.app';
DELETE FROM vehicle_logs    WHERE source = 'demo-v2';

-- ─── 2. Bulk-insert ACTIVE VEHICLES per location (set to hit target status)
WITH targets(slug, target_count) AS (
  VALUES
    ('kedarnath',         2700),  -- > 2500 → CRITICAL
    ('haridwar',          5500),  -- > 5000 → HIGH
    ('rishikesh',         3500),  -- > 3000 → HIGH
    ('mussoorie',         2200),  -- > 2000 → HIGH
    ('nainital',          1700),  -- > 1500 → HIGH
    ('badrinath',         1500),  -- < 2000 → NORMAL
    ('auli',               600),  -- < 800  → NORMAL
    ('jim-corbett',        450),  -- < 600  → NORMAL
    ('lansdowne',          400),  -- < 600  → NORMAL
    ('valley-of-flowers',  350)   -- < 400  → NORMAL
)
INSERT INTO active_vehicles (
  location_id, vehicle_registration_number, phone_number, email,
  vehicle_type, passenger_count, latitude, longitude,
  last_heartbeat_at, created_at
)
SELECT
  l.id,
  'UK' || LPAD(((g.i * 17) % 14 + 1)::TEXT, 2, '0')
       || CHR(65 + ((g.i * 7) % 26))
       || CHR(65 + ((g.i * 11) % 26))
       || LPAD(g.i::TEXT, 5, '0')                     AS plate,
  '9' || LPAD(((g.i * 91) % 1000000000)::TEXT, 9, '0') AS phone,
  'demo-v2@smarttour.app',
  CASE (g.i % 6)
    WHEN 0 THEN 'Bus'
    WHEN 1 THEN 'Bike'
    WHEN 2 THEN 'Auto'
    ELSE 'Car'
  END                                                   AS vehicle_type,
  CASE (g.i % 6)
    WHEN 0 THEN 20 + (g.i % 25)
    WHEN 1 THEN 1  + (g.i % 2)
    WHEN 2 THEN 2  + (g.i % 3)
    ELSE 1 + (g.i % 4)
  END                                                   AS passengers,
  l.center_lat + ((g.i % 100) - 50) * 0.0002          AS lat,
  l.center_lon + ((g.i % 100) - 50) * 0.0002          AS lon,
  NOW() - ((g.i % 30) || ' minutes')::INTERVAL        AS heartbeat,
  NOW() - ((g.i % 360) || ' minutes')::INTERVAL       AS created
FROM targets t
JOIN locations l ON l.slug = t.slug
CROSS JOIN LATERAL generate_series(1, t.target_count) AS g(i)
ON CONFLICT (vehicle_registration_number, location_id) DO NOTHING;

-- ─── 3. Bulk-insert 30 DAYS of vehicle_logs per location ─────────────────
-- Volume scales with location size; weekends get ~1.6× weekday baseline.
WITH daily_targets(slug, weekday_volume) AS (
  VALUES
    ('haridwar',          350),
    ('rishikesh',         200),
    ('mussoorie',         140),
    ('badrinath',         140),
    ('nainital',          110),
    ('kedarnath',          90),
    ('auli',               55),
    ('lansdowne',          45),
    ('jim-corbett',        45),
    ('valley-of-flowers',  30)
),
day_series AS (
  SELECT
    l.id          AS location_id,
    l.center_lat,
    l.center_lon,
    dt.weekday_volume,
    d::date       AS day,
    EXTRACT(DOW FROM d)::INT AS dow,
    CASE
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN (dt.weekday_volume * 16 / 10)
      WHEN EXTRACT(DOW FROM d) = 5       THEN (dt.weekday_volume * 13 / 10)
      ELSE dt.weekday_volume
    END AS day_volume
  FROM daily_targets dt
  JOIN locations l ON l.slug = dt.slug
  CROSS JOIN LATERAL generate_series(CURRENT_DATE - 29, CURRENT_DATE, '1 day'::INTERVAL) AS d
)
INSERT INTO vehicle_logs (
  type, location_id, vehicle_type, vehicle_registration_number,
  phone_number, email, latitude, longitude, passenger_count,
  source, created_at
)
SELECT
  'entry',
  ds.location_id,
  CASE (g.i % 6)
    WHEN 0 THEN 'Bus'
    WHEN 1 THEN 'Bike'
    WHEN 2 THEN 'Auto'
    ELSE 'Car'
  END,
  'UK' || LPAD(((g.i * 13 + ds.dow) % 14 + 1)::TEXT, 2, '0')
       || CHR(65 + ((g.i * 7) % 26))
       || CHR(65 + ((g.i * 11) % 26))
       || LPAD(((g.i * 37) % 9999)::TEXT, 4, '0'),
  '9' || LPAD(((g.i * 91) % 1000000000)::TEXT, 9, '0'),
  'demo-v2@smarttour.app',
  ds.center_lat + ((g.i % 100) - 50) * 0.0002,
  ds.center_lon + ((g.i % 100) - 50) * 0.0002,
  CASE (g.i % 6)
    WHEN 0 THEN 20 + (g.i % 25)
    WHEN 1 THEN 1  + (g.i % 2)
    WHEN 2 THEN 2  + (g.i % 3)
    ELSE 1 + (g.i % 4)
  END,
  'demo-v2',
  ds.day::TIMESTAMPTZ
    + ((6 + (g.i % 17)) || ' hours')::INTERVAL
    + ((g.i * 7 % 60)   || ' minutes')::INTERVAL
FROM day_series ds
CROSS JOIN LATERAL generate_series(1, ds.day_volume) AS g(i);

-- ─── 4. Bulk-insert matching EXIT logs (85% of entries get an exit) ─────
INSERT INTO vehicle_logs (
  type, location_id, vehicle_type, vehicle_registration_number,
  phone_number, email, latitude, longitude, passenger_count,
  source, created_at
)
SELECT
  'exit',
  location_id,
  vehicle_type,
  vehicle_registration_number,
  phone_number,
  email,
  latitude,
  longitude,
  passenger_count,
  'demo-v2',
  created_at + ((1 + (RANDOM() * 5)::INT) || ' hours')::INTERVAL
FROM vehicle_logs
WHERE source = 'demo-v2'
  AND type = 'entry'
  AND created_at + INTERVAL '6 hours' <= NOW()
  AND RANDOM() < 0.85;

-- ─── 5. Verify ───────────────────────────────────────────────────────────
SELECT
  l.name,
  (SELECT COUNT(*) FROM active_vehicles WHERE location_id = l.id) AS active_now,
  (SELECT COUNT(*) FROM vehicle_logs    WHERE location_id = l.id AND source = 'demo-v2') AS logs_total,
  CASE
    WHEN (SELECT COUNT(*) FROM active_vehicles WHERE location_id = l.id) >= l.critical_limit THEN 'CRITICAL'
    WHEN (SELECT COUNT(*) FROM active_vehicles WHERE location_id = l.id) >= l.normal_limit  THEN 'HIGH'
    ELSE 'NORMAL'
  END AS expected_status
FROM locations l
WHERE l.is_active = TRUE
  AND l.slug IN (
    'mussoorie','rishikesh','haridwar','nainital','auli',
    'jim-corbett','kedarnath','badrinath','valley-of-flowers','lansdowne'
  )
ORDER BY active_now DESC;
