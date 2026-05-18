-- =====================================================================
-- SmartTour Demo Data Seeder
-- Populates Mussoorie with 30 days of realistic vehicle traffic so the
-- admin dashboard analytics + Holt-Winters forecasting demo has data.
--
-- Pattern:
--   - Weekdays:  60-100 entries/day
--   - Friday:    120-170 entries/day
--   - Sat/Sun:   180-260 entries/day
--   - Slight upward trend (+5%/week) — visible in forecast
--   - Peak hours 10am-4pm
--
-- Run AFTER schema.sql. Safe to re-run (uses source='demo-seed' marker
-- and clears prior demo rows before inserting).
-- =====================================================================

DO $$
DECLARE
  mussoorie_id UUID;
  base_day DATE;
  d INTEGER;
  i INTEGER;
  entry_count INTEGER;
  entry_time TIMESTAMPTZ;
  exit_time TIMESTAMPTZ;
  hr INTEGER;
  mn INTEGER;
  dwell_hours INTEGER;
  plate TEXT;
  vtype TEXT;
  passengers INTEGER;
  dow INTEGER;
  vtypes TEXT[] := ARRAY['Car', 'Bike', 'Bus', 'Auto', 'Car', 'Car'];  -- weighted
  total_entries INTEGER := 0;
  total_exits INTEGER := 0;
BEGIN
  SELECT id INTO mussoorie_id FROM locations WHERE slug = 'mussoorie';
  IF mussoorie_id IS NULL THEN
    RAISE EXCEPTION 'Mussoorie not found. Run schema.sql first.';
  END IF;

  RAISE NOTICE 'Seeding Mussoorie (id=%)', mussoorie_id;

  -- Idempotent: clear prior demo data
  DELETE FROM vehicle_logs WHERE location_id = mussoorie_id AND source = 'demo-seed';
  DELETE FROM active_vehicles WHERE location_id = mussoorie_id AND email = 'demo@smarttour.app';

  -- Generate 30 days of historical data (oldest first)
  FOR d IN 0..29 LOOP
    base_day := (CURRENT_DATE - (29 - d))::DATE;
    dow := EXTRACT(DOW FROM base_day);  -- 0=Sun, 6=Sat

    -- Volume by day of week
    IF dow IN (0, 6) THEN
      entry_count := 180 + FLOOR(RANDOM() * 80)::INT;     -- weekend 180-260
    ELSIF dow = 5 THEN
      entry_count := 120 + FLOOR(RANDOM() * 50)::INT;     -- friday 120-170
    ELSE
      entry_count := 60 + FLOOR(RANDOM() * 40)::INT;      -- weekday 60-100
    END IF;

    -- Slight upward trend: +0.7% per day (~+5% per week)
    entry_count := entry_count + FLOOR(d * 0.7)::INT;

    -- Generate entries for this day
    FOR i IN 1..entry_count LOOP
      -- Hour distribution: peak 10am-4pm
      hr := CASE
        WHEN RANDOM() < 0.10 THEN 6 + FLOOR(RANDOM() * 4)::INT     -- 6-10am: 10%
        WHEN RANDOM() < 0.55 THEN 10 + FLOOR(RANDOM() * 6)::INT    -- 10am-4pm: 45%
        WHEN RANDOM() < 0.85 THEN 16 + FLOOR(RANDOM() * 4)::INT    -- 4-8pm: 30%
        ELSE 20 + FLOOR(RANDOM() * 3)::INT                          -- 8-11pm: 15%
      END;
      mn := FLOOR(RANDOM() * 60)::INT;

      entry_time := base_day::TIMESTAMPTZ + (hr || ' hours')::INTERVAL + (mn || ' minutes')::INTERVAL;

      -- Build a plate (Uttarakhand-style: UK + 2 digits + 2 letters + 4 digits)
      plate := 'UK' || LPAD(FLOOR(1 + RANDOM() * 14)::TEXT, 2, '0')
               || CHR(65 + FLOOR(RANDOM() * 26)::INT)
               || CHR(65 + FLOOR(RANDOM() * 26)::INT)
               || LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0');

      vtype := vtypes[1 + FLOOR(RANDOM() * array_length(vtypes, 1))::INT];
      passengers := CASE
        WHEN vtype = 'Bus'  THEN 20 + FLOOR(RANDOM() * 25)::INT
        WHEN vtype = 'Bike' THEN 1 + FLOOR(RANDOM() * 2)::INT
        WHEN vtype = 'Auto' THEN 2 + FLOOR(RANDOM() * 3)::INT
        ELSE 1 + FLOOR(RANDOM() * 4)::INT
      END;

      -- Insert entry
      INSERT INTO vehicle_logs (
        type, location_id, vehicle_type, vehicle_registration_number,
        phone_number, email, latitude, longitude, passenger_count,
        source, created_at
      ) VALUES (
        'entry', mussoorie_id, vtype, plate,
        '9' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0'),
        'demo@smarttour.app',
        30.4598 + (RANDOM() - 0.5) * 0.02,
        78.0644 + (RANDOM() - 0.5) * 0.02,
        passengers,
        'demo-seed',
        entry_time
      );
      total_entries := total_entries + 1;

      -- Most vehicles also exit (within 1-6 hours), except some still active today
      IF d < 29 OR RANDOM() < 0.6 THEN
        dwell_hours := 1 + FLOOR(RANDOM() * 6)::INT;
        exit_time := entry_time + (dwell_hours || ' hours')::INTERVAL;

        -- Don't insert exits in the future
        IF exit_time <= NOW() THEN
          INSERT INTO vehicle_logs (
            type, location_id, vehicle_type, vehicle_registration_number,
            phone_number, email, latitude, longitude, passenger_count,
            source, created_at
          ) VALUES (
            'exit', mussoorie_id, vtype, plate,
            '9' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0'),
            'demo@smarttour.app',
            30.4598 + (RANDOM() - 0.5) * 0.02,
            78.0644 + (RANDOM() - 0.5) * 0.02,
            passengers,
            'demo-seed',
            exit_time
          );
          total_exits := total_exits + 1;
        ELSE
          -- This vehicle is still inside (currently active)
          INSERT INTO active_vehicles (
            location_id, vehicle_registration_number, phone_number, email,
            vehicle_type, passenger_count, latitude, longitude,
            last_heartbeat_at, created_at
          ) VALUES (
            mussoorie_id, plate,
            '9' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0'),
            'demo@smarttour.app',
            vtype, passengers,
            30.4598 + (RANDOM() - 0.5) * 0.02,
            78.0644 + (RANDOM() - 0.5) * 0.02,
            NOW(), entry_time
          ) ON CONFLICT (vehicle_registration_number, location_id) DO NOTHING;
        END IF;
      ELSE
        -- Today's lingering vehicles → also active
        INSERT INTO active_vehicles (
          location_id, vehicle_registration_number, phone_number, email,
          vehicle_type, passenger_count, latitude, longitude,
          last_heartbeat_at, created_at
        ) VALUES (
          mussoorie_id, plate,
          '9' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0'),
          'demo@smarttour.app',
          vtype, passengers,
          30.4598 + (RANDOM() - 0.5) * 0.02,
          78.0644 + (RANDOM() - 0.5) * 0.02,
          NOW(), entry_time
        ) ON CONFLICT (vehicle_registration_number, location_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Done. Inserted % entries and % exits across 30 days.', total_entries, total_exits;
END $$;

-- Verify
SELECT
  DATE(created_at) AS day,
  type,
  COUNT(*) AS count
FROM vehicle_logs
WHERE location_id = (SELECT id FROM locations WHERE slug = 'mussoorie')
  AND source = 'demo-seed'
GROUP BY DATE(created_at), type
ORDER BY day DESC, type
LIMIT 14;
