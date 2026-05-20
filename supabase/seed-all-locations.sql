-- =====================================================================
-- SmartTour — All-Locations Demo Seed (showcase-ready)
-- Populates every active location with:
--   • 30 days of weekend-weighted vehicle_logs (so Holt-Winters has data)
--   • Currently-active vehicles tuned for VISIBLE STATUS VARIETY:
--       ▸ 1 critical (red)   — Kedarnath
--       ▸ 4 high     (amber) — Haridwar, Mussoorie, Rishikesh, Nainital
--       ▸ 5 normal   (green) — Badrinath, Valley of Flowers, Auli, Jim Corbett, Lansdowne
--
-- Safe to re-run (uses source='demo-v2' marker to clear prior demo rows first).
-- Total inserts: ~50,000 vehicle_logs + ~10,500 active_vehicles
-- =====================================================================

DO $$
DECLARE
  loc RECORD;
  base_day DATE;
  d INT;
  i INT;
  hr INT;
  mn INT;
  dwell_hours INT;
  dow INT;
  daily_volume INT;
  active_target INT;
  entry_time TIMESTAMPTZ;
  exit_time TIMESTAMPTZ;
  plate TEXT;
  vtype TEXT;
  passengers INT;
  vtypes TEXT[] := ARRAY['Car','Car','Car','Bike','Bus','Auto'];  -- weighted
  total_logs INT := 0;
  total_active INT := 0;
BEGIN
  RAISE NOTICE 'Starting all-locations seed...';

  -- Clear all prior demo-v2 data so re-runs are idempotent
  DELETE FROM vehicle_logs WHERE source = 'demo-v2';
  DELETE FROM active_vehicles WHERE email = 'demo-v2@smarttour.app';

  FOR loc IN (
    SELECT id, slug, name, normal_limit, high_limit, critical_limit,
           max_capacity, center_lat, center_lon
    FROM locations
    WHERE is_active = TRUE
      AND slug IN (
        'mussoorie','rishikesh','haridwar','nainital','auli',
        'jim-corbett','kedarnath','badrinath','valley-of-flowers','lansdowne'
      )
  )
  LOOP
    -- Per-location daily volume baseline (weekday mean)
    --   Scaled so weekend (1.6x) tops out near normal_limit
    daily_volume := CASE loc.slug
      WHEN 'haridwar'          THEN 350
      WHEN 'rishikesh'         THEN 200
      WHEN 'mussoorie'         THEN 140
      WHEN 'nainital'          THEN 110
      WHEN 'badrinath'         THEN 140
      WHEN 'kedarnath'         THEN 90
      WHEN 'auli'              THEN 55
      WHEN 'jim-corbett'       THEN 45
      WHEN 'valley-of-flowers' THEN 30
      WHEN 'lansdowne'         THEN 45
      ELSE 60
    END;

    -- Current "active vehicles" count — TUNED FOR STATUS VARIETY
    --   Want a vibrant mix of red / amber / green on the advisory board
    active_target := CASE loc.slug
      WHEN 'kedarnath'         THEN 2700   -- > critical_limit 2500 → CRITICAL (red)
      WHEN 'haridwar'          THEN 5500   -- > 5000 → HIGH (amber)
      WHEN 'mussoorie'         THEN 2200   -- > 2000 → HIGH (amber)
      WHEN 'rishikesh'         THEN 3500   -- > 3000 → HIGH (amber)
      WHEN 'nainital'          THEN 1700   -- > 1500 → HIGH (amber)
      WHEN 'badrinath'         THEN 1500   -- < 2000 → NORMAL (green)
      WHEN 'valley-of-flowers' THEN 350    -- < 400  → NORMAL (green)
      WHEN 'auli'              THEN 600    -- < 800  → NORMAL (green)
      WHEN 'jim-corbett'       THEN 450    -- < 600  → NORMAL (green)
      WHEN 'lansdowne'         THEN 400    -- < 600  → NORMAL (green)
      ELSE 500
    END;

    RAISE NOTICE '  → %: % active targeted (daily volume=%)', loc.name, active_target, daily_volume;

    -- ─── PART 1: 30 days of historical entries + exits ────────────────
    FOR d IN 0..29 LOOP
      base_day := (CURRENT_DATE - (29 - d))::DATE;
      dow := EXTRACT(DOW FROM base_day);

      -- Weekend factor + small upward trend
      DECLARE
        day_volume INT;
      BEGIN
        day_volume := daily_volume;
        IF dow IN (0, 6)      THEN day_volume := (day_volume * 16) / 10;       -- Sat/Sun
        ELSIF dow = 5         THEN day_volume := (day_volume * 13) / 10;       -- Fri
        END IF;
        day_volume := day_volume + (d / 4);  -- trend: ~+25% across the month

        FOR i IN 1..day_volume LOOP
          -- Hour distribution (peak 10am-4pm)
          hr := CASE
            WHEN RANDOM() < 0.10 THEN 6  + FLOOR(RANDOM() * 4)::INT
            WHEN RANDOM() < 0.55 THEN 10 + FLOOR(RANDOM() * 6)::INT
            WHEN RANDOM() < 0.85 THEN 16 + FLOOR(RANDOM() * 4)::INT
            ELSE                       20 + FLOOR(RANDOM() * 3)::INT
          END;
          mn := FLOOR(RANDOM() * 60)::INT;
          entry_time := base_day::TIMESTAMPTZ + (hr || ' hours')::INTERVAL + (mn || ' minutes')::INTERVAL;

          plate := 'UK' || LPAD(FLOOR(1 + RANDOM() * 14)::TEXT, 2, '0')
                   || CHR(65 + FLOOR(RANDOM() * 26)::INT)
                   || CHR(65 + FLOOR(RANDOM() * 26)::INT)
                   || LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0');

          vtype := vtypes[1 + FLOOR(RANDOM() * array_length(vtypes, 1))::INT];
          passengers := CASE
            WHEN vtype = 'Bus'  THEN 20 + FLOOR(RANDOM() * 25)::INT
            WHEN vtype = 'Bike' THEN 1  + FLOOR(RANDOM() * 2)::INT
            WHEN vtype = 'Auto' THEN 2  + FLOOR(RANDOM() * 3)::INT
            ELSE                     1  + FLOOR(RANDOM() * 4)::INT
          END;

          INSERT INTO vehicle_logs (
            type, location_id, vehicle_type, vehicle_registration_number,
            phone_number, email, latitude, longitude, passenger_count,
            source, created_at
          ) VALUES (
            'entry', loc.id, vtype, plate,
            '9' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0'),
            'demo-v2@smarttour.app',
            loc.center_lat + (RANDOM() - 0.5) * 0.02,
            loc.center_lon + (RANDOM() - 0.5) * 0.02,
            passengers, 'demo-v2', entry_time
          );
          total_logs := total_logs + 1;

          -- Most vehicles also exit (within 1-6 hours)
          dwell_hours := 1 + FLOOR(RANDOM() * 6)::INT;
          exit_time := entry_time + (dwell_hours || ' hours')::INTERVAL;
          IF exit_time <= NOW() AND RANDOM() < 0.85 THEN
            INSERT INTO vehicle_logs (
              type, location_id, vehicle_type, vehicle_registration_number,
              phone_number, email, latitude, longitude, passenger_count,
              source, created_at
            ) VALUES (
              'exit', loc.id, vtype, plate,
              '9' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0'),
              'demo-v2@smarttour.app',
              loc.center_lat + (RANDOM() - 0.5) * 0.02,
              loc.center_lon + (RANDOM() - 0.5) * 0.02,
              passengers, 'demo-v2', exit_time
            );
            total_logs := total_logs + 1;
          END IF;
        END LOOP;
      END;
    END LOOP;

    -- ─── PART 2: Currently-active vehicles to populate status board ────
    FOR i IN 1..active_target LOOP
      plate := 'UK' || LPAD(FLOOR(1 + RANDOM() * 14)::TEXT, 2, '0')
               || CHR(65 + FLOOR(RANDOM() * 26)::INT)
               || CHR(65 + FLOOR(RANDOM() * 26)::INT)
               || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0')
               || '-' || i::TEXT;  -- guarantee uniqueness

      vtype := vtypes[1 + FLOOR(RANDOM() * array_length(vtypes, 1))::INT];
      passengers := CASE
        WHEN vtype = 'Bus'  THEN 20 + FLOOR(RANDOM() * 25)::INT
        WHEN vtype = 'Bike' THEN 1  + FLOOR(RANDOM() * 2)::INT
        WHEN vtype = 'Auto' THEN 2  + FLOOR(RANDOM() * 3)::INT
        ELSE                     1  + FLOOR(RANDOM() * 4)::INT
      END;

      INSERT INTO active_vehicles (
        location_id, vehicle_registration_number, phone_number, email,
        vehicle_type, passenger_count, latitude, longitude,
        last_heartbeat_at, created_at
      ) VALUES (
        loc.id, plate,
        '9' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0'),
        'demo-v2@smarttour.app',
        vtype, passengers,
        loc.center_lat + (RANDOM() - 0.5) * 0.02,
        loc.center_lon + (RANDOM() - 0.5) * 0.02,
        NOW() - (FLOOR(RANDOM() * 30) || ' minutes')::INTERVAL,
        NOW() - (FLOOR(RANDOM() * 6) || ' hours')::INTERVAL
      ) ON CONFLICT (vehicle_registration_number, location_id) DO NOTHING;
      total_active := total_active + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'DONE. % vehicle_logs + % active_vehicles inserted.', total_logs, total_active;
END $$;

-- ─── Verification queries ───────────────────────────────────────────────
SELECT l.name,
       (SELECT COUNT(*) FROM active_vehicles WHERE location_id = l.id) AS active_now,
       l.normal_limit, l.high_limit, l.critical_limit,
       CASE
         WHEN (SELECT COUNT(*) FROM active_vehicles WHERE location_id = l.id) >= l.critical_limit THEN 'CRITICAL'
         WHEN (SELECT COUNT(*) FROM active_vehicles WHERE location_id = l.id) >= l.normal_limit  THEN 'HIGH'
         ELSE 'NORMAL'
       END AS status
FROM locations l
WHERE l.is_active = TRUE
ORDER BY active_now DESC;

SELECT 'Logs per location (30 days)' AS metric;
SELECT l.name, COUNT(vl.id) AS log_count
FROM locations l
LEFT JOIN vehicle_logs vl ON vl.location_id = l.id AND vl.source = 'demo-v2'
WHERE l.is_active = TRUE
GROUP BY l.name
ORDER BY log_count DESC;
