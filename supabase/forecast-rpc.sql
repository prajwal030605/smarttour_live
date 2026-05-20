-- =====================================================================
-- RPC for forecast aggregation — sidesteps PostgREST 1000-row cap
-- Run once in Supabase SQL Editor.
-- =====================================================================

CREATE OR REPLACE FUNCTION get_daily_entry_counts(
  loc_id UUID DEFAULT NULL,
  days_back INT DEFAULT 30
)
RETURNS TABLE(entry_date DATE, entry_count BIGINT)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    DATE(created_at) AS entry_date,
    COUNT(*)::BIGINT AS entry_count
  FROM vehicle_logs
  WHERE type = 'entry'
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL
    AND (loc_id IS NULL OR location_id = loc_id)
  GROUP BY DATE(created_at)
  ORDER BY entry_date;
$$;

-- Grant access to the anon role used by the public API
GRANT EXECUTE ON FUNCTION get_daily_entry_counts(UUID, INT) TO anon, authenticated;

-- Force PostgREST to refresh its schema cache so the new RPC is discoverable
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT * FROM get_daily_entry_counts(NULL, 7);
