-- Include checked_in / checked_out in analytics revenue (align with payments dashboard)
-- Restores full RPC shape from 017 (total_boats, utilization, timezone buckets)

CREATE OR REPLACE FUNCTION get_marina_analytics_summary(p_marina_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz TEXT;
  v_now TIMESTAMPTZ := now();
  v_month_start TIMESTAMPTZ;
  v_month_end TIMESTAMPTZ;
  v_ninety_days_ago TIMESTAMPTZ := v_now - interval '90 days';
  v_operating_hours INT := 10;
  v_revenue_statuses booking_status[] := ARRAY['confirmed', 'checked_in', 'checked_out', 'completed']::booking_status[];
  v_result JSONB;
BEGIN
  IF NOT (p_marina_id = ANY(SELECT auth_user_marina_ids())) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF auth_user_role(p_marina_id) NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT timezone, COALESCE((settings->>'operating_hours')::INT, 10)
  INTO v_tz, v_operating_hours
  FROM marinas WHERE id = p_marina_id;

  v_tz := COALESCE(v_tz, 'America/New_York');

  v_month_start := date_trunc('month', v_now AT TIME ZONE v_tz) AT TIME ZONE v_tz;
  v_month_end := (date_trunc('month', v_now AT TIME ZONE v_tz) + interval '1 month') AT TIME ZONE v_tz;

  SELECT jsonb_build_object(
    'total_boats', (
      SELECT COUNT(*)::INT FROM boats
      WHERE marina_id = p_marina_id AND status = 'active'
    ),
    'total_bookings', (
      SELECT COUNT(*)::INT FROM bookings
      WHERE marina_id = p_marina_id AND status NOT IN ('cancelled', 'no_show')
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(total_price), 0) FROM bookings
      WHERE marina_id = p_marina_id AND status = ANY(v_revenue_statuses)
    ),
    'revenue_this_month', (
      SELECT COALESCE(SUM(total_price), 0) FROM bookings
      WHERE marina_id = p_marina_id
        AND status = ANY(v_revenue_statuses)
        AND start_at >= v_month_start AND start_at < v_month_end
    ),
    'upcoming_trips', (
      SELECT COUNT(*)::INT FROM bookings
      WHERE marina_id = p_marina_id
        AND status IN ('confirmed', 'pending', 'checked_in', 'checked_out')
        AND start_at > v_now
    ),
    'monthly_bookings', (
      SELECT COALESCE(jsonb_agg(row ORDER BY row->>'sort_key'), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'month', to_char(m.month_start AT TIME ZONE v_tz, 'Mon YYYY'),
          'sort_key', m.month_start,
          'count', (
            SELECT COUNT(*)::INT FROM bookings b
            WHERE b.marina_id = p_marina_id
              AND b.status NOT IN ('cancelled', 'no_show')
              AND b.start_at >= m.month_start AND b.start_at < m.month_end
          ),
          'revenue', (
            SELECT COALESCE(SUM(b.total_price), 0) FROM bookings b
            WHERE b.marina_id = p_marina_id
              AND b.status = ANY(v_revenue_statuses)
              AND b.start_at >= m.month_start AND b.start_at < m.month_end
          )
        ) AS row
        FROM (
          SELECT
            ((date_trunc('month', v_now AT TIME ZONE v_tz) AT TIME ZONE v_tz) - (n || ' months')::interval) AS month_start,
            ((date_trunc('month', v_now AT TIME ZONE v_tz) AT TIME ZONE v_tz) - (n || ' months')::interval + interval '1 month') AS month_end
          FROM generate_series(5, 0, -1) AS n
        ) m
      ) sub
    ),
    'daily_bookings', (
      SELECT COALESCE(jsonb_agg(row ORDER BY row->>'sort_key'), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'date', to_char(d.day_start AT TIME ZONE v_tz, 'Mon DD'),
          'sort_key', d.day_start,
          'count', (
            SELECT COUNT(*)::INT FROM bookings b
            WHERE b.marina_id = p_marina_id
              AND b.status NOT IN ('cancelled', 'no_show')
              AND b.start_at >= d.day_start AND b.start_at < d.day_end
          ),
          'revenue', (
            SELECT COALESCE(SUM(b.total_price), 0) FROM bookings b
            WHERE b.marina_id = p_marina_id
              AND b.status = ANY(v_revenue_statuses)
              AND b.start_at >= d.day_start AND b.start_at < d.day_end
          )
        ) AS row
        FROM (
          SELECT
            ((date_trunc('day', v_now AT TIME ZONE v_tz) AT TIME ZONE v_tz) - (n || ' days')::interval) AS day_start,
            ((date_trunc('day', v_now AT TIME ZONE v_tz) AT TIME ZONE v_tz) - (n || ' days')::interval + interval '1 day') AS day_end
          FROM generate_series(29, 0, -1) AS n
        ) d
      ) sub
    ),
    'popular_boats', (
      SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'booking_count')::INT DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'id', bt.id,
          'name', bt.name,
          'booking_count', COALESCE(stats.cnt, 0),
          'revenue', COALESCE(stats.rev, 0)
        ) AS row
        FROM boats bt
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::INT AS cnt,
                 COALESCE(SUM(b.total_price) FILTER (WHERE b.status = ANY(v_revenue_statuses)), 0) AS rev
          FROM bookings b
          WHERE b.boat_id = bt.id
            AND b.marina_id = p_marina_id
            AND b.status NOT IN ('cancelled', 'no_show')
            AND b.start_at >= v_ninety_days_ago
        ) stats ON true
        WHERE bt.marina_id = p_marina_id AND bt.status = 'active'
        ORDER BY COALESCE(stats.cnt, 0) DESC
        LIMIT 5
      ) sub
    ),
    'utilization_bookings', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'boat_id', b.boat_id,
        'start_at', b.start_at,
        'end_at', b.end_at,
        'status', b.status
      )), '[]'::jsonb)
      FROM bookings b
      WHERE b.marina_id = p_marina_id
        AND b.status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'completed')
        AND b.start_at < v_month_end AND b.end_at > v_month_start
    ),
    'utilization_blocks', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'boat_id', ab.boat_id,
        'start_at', ab.start_at,
        'end_at', ab.end_at
      )), '[]'::jsonb)
      FROM availability_blocks ab
      WHERE ab.marina_id = p_marina_id
        AND ab.start_at < v_month_end AND ab.end_at > v_month_start
    ),
    'boats', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name)), '[]'::jsonb)
      FROM boats WHERE marina_id = p_marina_id AND status = 'active'
    ),
    'operating_hours', v_operating_hours
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION get_marina_analytics_summary FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_marina_analytics_summary TO authenticated;
