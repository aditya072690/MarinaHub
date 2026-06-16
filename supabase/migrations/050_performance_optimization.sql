-- Performance optimization: indexes, dashboard_stats cache, staff dashboard RPC
-- Note: CREATE INDEX CONCURRENTLY cannot run inside Supabase migration transactions.

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_marina_status_start
  ON bookings (marina_id, status, start_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_marina_active_start
  ON bookings (marina_id, start_at DESC)
  WHERE status NOT IN ('cancelled', 'no_show');

CREATE INDEX IF NOT EXISTS idx_bookings_customer_start
  ON bookings (customer_id, start_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_marina_upcoming
  ON bookings (marina_id, start_at)
  WHERE status IN ('pending', 'confirmed', 'checked_in')
    AND payment_status IN ('paid', 'pending');

CREATE INDEX IF NOT EXISTS idx_bookings_marina_overlap
  ON bookings (marina_id, start_at, end_at)
  WHERE status NOT IN ('cancelled', 'no_show');

CREATE INDEX IF NOT EXISTS idx_bookings_marina_payment_created
  ON bookings (marina_id, payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_marina_created_id
  ON bookings (marina_id, created_at DESC, id DESC);

-- Boats
CREATE INDEX IF NOT EXISTS idx_boats_marina_sort
  ON boats (marina_id, sort_order)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_boats_marina_status_sort
  ON boats (marina_id, status, sort_order);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_marina_rating
  ON reviews (marina_id)
  INCLUDE (rating);

CREATE INDEX IF NOT EXISTS idx_reviews_marina_recent
  ON reviews (marina_id, created_at DESC)
  INCLUDE (rating, comment, boat_id, user_id);

-- Availability blocks
CREATE INDEX IF NOT EXISTS idx_blocks_marina_wide
  ON availability_blocks (marina_id, start_at, end_at)
  WHERE boat_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_blocks_boat_overlap
  ON availability_blocks (boat_id, start_at, end_at)
  WHERE boat_id IS NOT NULL;

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_marina_unread
  ON notifications (recipient_id, marina_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_marina_created
  ON notifications (recipient_id, marina_id, created_at DESC);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_feed
  ON audit_logs (marina_id, created_at DESC)
  WHERE show_in_feed = true;

CREATE INDEX IF NOT EXISTS idx_audit_logs_marina_action_created
  ON audit_logs (marina_id, action, created_at DESC);

-- Pricing rules
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active_priority
  ON pricing_rules (marina_id, boat_id, rule_type, is_active, priority DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_peak_range
  ON pricing_rules (marina_id, peak_start, peak_end)
  WHERE rule_type = 'peak_season' AND is_active = true;

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_marina_last_booking
  ON customers (marina_id, last_booking_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_customers_marina_created_id
  ON customers (marina_id, created_at DESC, id DESC);

-- Customer segments
CREATE INDEX IF NOT EXISTS idx_segment_snapshots_marina_segment
  ON customer_segment_snapshots (marina_id, segment, total_spent DESC);

-- =============================================================================
-- DASHBOARD STATS CACHE
-- =============================================================================

CREATE TABLE IF NOT EXISTS dashboard_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marina_id       UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  period          TEXT NOT NULL CHECK (period IN ('daily', 'monthly', 'live')),
  period_start    TIMESTAMPTZ NOT NULL,
  total_revenue     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_bookings    INT NOT NULL DEFAULT 0,
  utilization_pct   NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_rating        NUMERIC(3,1),
  review_count      INT NOT NULL DEFAULT 0,
  forecast_30d      JSONB,
  revenue_this_month NUMERIC(12,2) NOT NULL DEFAULT 0,
  upcoming_trips    INT NOT NULL DEFAULT 0,
  total_boats       INT NOT NULL DEFAULT 0,
  monthly_chart     JSONB NOT NULL DEFAULT '[]'::jsonb,
  daily_chart       JSONB NOT NULL DEFAULT '[]'::jsonb,
  popular_boats     JSONB NOT NULL DEFAULT '[]'::jsonb,
  utilization_data  JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (marina_id, period, period_start)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_marina_period
  ON dashboard_stats (marina_id, period, period_start);

ALTER TABLE dashboard_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY dashboard_stats_select ON dashboard_stats
  FOR SELECT TO authenticated
  USING (marina_id = ANY(SELECT auth_user_marina_ids()));

-- =============================================================================
-- REFRESH DASHBOARD STATS (lightweight; charts from single-pass aggregates)
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_dashboard_stats(p_marina_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz TEXT;
  v_now TIMESTAMPTZ := now();
  v_month_start TIMESTAMPTZ;
  v_month_end TIMESTAMPTZ;
  v_total_boats INT;
  v_total_bookings INT;
  v_upcoming INT;
  v_revenue_month NUMERIC(12,2);
  v_revenue_all NUMERIC(12,2);
  v_avg_rating NUMERIC(3,1);
  v_review_count INT;
  v_util_pct NUMERIC(5,2);
  v_monthly_chart JSONB;
  v_daily_chart JSONB;
  v_popular_boats JSONB;
  v_util_data JSONB;
  v_forecast JSONB;
BEGIN
  SELECT timezone INTO v_tz FROM marinas WHERE id = p_marina_id;
  v_tz := COALESCE(v_tz, 'America/New_York');

  v_month_start := date_trunc('month', v_now AT TIME ZONE v_tz) AT TIME ZONE v_tz;
  v_month_end := (date_trunc('month', v_now AT TIME ZONE v_tz) + interval '1 month') AT TIME ZONE v_tz;

  SELECT COUNT(*)::INT INTO v_total_boats
  FROM boats WHERE marina_id = p_marina_id AND status = 'active';

  SELECT COUNT(*)::INT INTO v_total_bookings
  FROM bookings
  WHERE marina_id = p_marina_id AND status NOT IN ('cancelled', 'no_show');

  SELECT COUNT(*)::INT INTO v_upcoming
  FROM bookings
  WHERE marina_id = p_marina_id
    AND status IN ('confirmed', 'pending', 'checked_in')
    AND payment_status IN ('paid', 'pending')
    AND start_at > v_now;

  v_revenue_all := marina_gross_revenue(p_marina_id, NULL, NULL);
  v_revenue_month := marina_gross_revenue(p_marina_id, v_month_start, v_month_end);

  SELECT ROUND(AVG(rating)::numeric, 1), COUNT(*)::INT
  INTO v_avg_rating, v_review_count
  FROM reviews WHERE marina_id = p_marina_id;

  -- Simplified utilization: booked hours / available hours this month
  SELECT COALESCE(
    ROUND(
      100.0 * SUM(EXTRACT(EPOCH FROM (LEAST(b.end_at, v_month_end) - GREATEST(b.start_at, v_month_start))) / 3600.0)
      / NULLIF(v_total_boats * 10 * EXTRACT(DAY FROM v_month_end - v_month_start) * 24, 0),
      2
    ),
    0
  ) INTO v_util_pct
  FROM bookings b
  WHERE b.marina_id = p_marina_id
    AND b.status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'completed')
    AND b.start_at < v_month_end AND b.end_at > v_month_start;

  -- Monthly chart (6 months, single pass)
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'sort_key'), '[]'::jsonb)
  INTO v_monthly_chart
  FROM (
    SELECT jsonb_build_object(
      'month', to_char(m.month_start AT TIME ZONE v_tz, 'Mon YYYY'),
      'sort_key', m.month_start,
      'count', COALESCE(agg.cnt, 0),
      'revenue', COALESCE(agg.rev, 0)
    ) AS row
    FROM (
      SELECT
        ((date_trunc('month', v_now AT TIME ZONE v_tz) AT TIME ZONE v_tz) - (n || ' months')::interval) AS month_start,
        ((date_trunc('month', v_now AT TIME ZONE v_tz) AT TIME ZONE v_tz) - (n || ' months')::interval + interval '1 month') AS month_end
      FROM generate_series(5, 0, -1) AS n
    ) m
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INT AS cnt, marina_gross_revenue(p_marina_id, m.month_start, m.month_end) AS rev
      FROM bookings b
      WHERE b.marina_id = p_marina_id
        AND b.status NOT IN ('cancelled', 'no_show')
        AND b.start_at >= m.month_start AND b.start_at < m.month_end
    ) agg ON true
  ) sub;

  -- Daily chart (30 days)
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'sort_key'), '[]'::jsonb)
  INTO v_daily_chart
  FROM (
    SELECT jsonb_build_object(
      'date', to_char(d.day_start AT TIME ZONE v_tz, 'Mon DD'),
      'sort_key', d.day_start,
      'count', COALESCE(agg.cnt, 0),
      'revenue', COALESCE(agg.rev, 0)
    ) AS row
    FROM (
      SELECT
        ((date_trunc('day', v_now AT TIME ZONE v_tz) AT TIME ZONE v_tz) - (n || ' days')::interval) AS day_start,
        ((date_trunc('day', v_now AT TIME ZONE v_tz) AT TIME ZONE v_tz) - (n || ' days')::interval + interval '1 day') AS day_end
      FROM generate_series(29, 0, -1) AS n
    ) d
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INT AS cnt, marina_gross_revenue(p_marina_id, d.day_start, d.day_end) AS rev
      FROM bookings b
      WHERE b.marina_id = p_marina_id
        AND b.status NOT IN ('cancelled', 'no_show')
        AND b.start_at >= d.day_start AND b.start_at < d.day_end
    ) agg ON true
  ) sub;

  -- Popular boats (90 days)
  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'booking_count')::INT DESC), '[]'::jsonb)
  INTO v_popular_boats
  FROM (
    SELECT jsonb_build_object(
      'id', bt.id,
      'name', bt.name,
      'booking_count', COALESCE(stats.cnt, 0),
      'revenue', marina_boat_gross_revenue(p_marina_id, bt.id, v_now - interval '90 days')
    ) AS row
    FROM boats bt
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INT AS cnt
      FROM bookings b
      WHERE b.boat_id = bt.id
        AND b.marina_id = p_marina_id
        AND b.status NOT IN ('cancelled', 'no_show')
        AND b.start_at >= v_now - interval '90 days'
    ) stats ON true
    WHERE bt.marina_id = p_marina_id AND bt.status = 'active'
    ORDER BY COALESCE(stats.cnt, 0) DESC
    LIMIT 5
  ) sub;

  -- Utilization per boat (current month)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', bt.id,
    'name', bt.name,
    'booked_hours', COALESCE(uh.hours, 0)
  )), '[]'::jsonb)
  INTO v_util_data
  FROM boats bt
  LEFT JOIN LATERAL (
    SELECT SUM(EXTRACT(EPOCH FROM (LEAST(b.end_at, v_month_end) - GREATEST(b.start_at, v_month_start))) / 3600.0) AS hours
    FROM bookings b
    WHERE b.boat_id = bt.id
      AND b.marina_id = p_marina_id
      AND b.status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'completed')
      AND b.start_at < v_month_end AND b.end_at > v_month_start
  ) uh ON true
  WHERE bt.marina_id = p_marina_id AND bt.status = 'active';

  BEGIN
    v_forecast := get_revenue_forecast(p_marina_id, 30);
  EXCEPTION WHEN OTHERS THEN
    v_forecast := NULL;
  END;

  INSERT INTO dashboard_stats (
    marina_id, period, period_start,
    total_revenue, total_bookings, utilization_pct,
    avg_rating, review_count, forecast_30d,
    revenue_this_month, upcoming_trips, total_boats,
    monthly_chart, daily_chart, popular_boats, utilization_data,
    updated_at
  ) VALUES (
    p_marina_id, 'live', v_month_start,
    v_revenue_all, v_total_bookings, v_util_pct,
    v_avg_rating, v_review_count, v_forecast,
    v_revenue_month, v_upcoming, v_total_boats,
    v_monthly_chart, v_daily_chart, v_popular_boats, v_util_data,
    now()
  )
  ON CONFLICT (marina_id, period, period_start) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_bookings = EXCLUDED.total_bookings,
    utilization_pct = EXCLUDED.utilization_pct,
    avg_rating = EXCLUDED.avg_rating,
    review_count = EXCLUDED.review_count,
    forecast_30d = EXCLUDED.forecast_30d,
    revenue_this_month = EXCLUDED.revenue_this_month,
    upcoming_trips = EXCLUDED.upcoming_trips,
    total_boats = EXCLUDED.total_boats,
    monthly_chart = EXCLUDED.monthly_chart,
    daily_chart = EXCLUDED.daily_chart,
    popular_boats = EXCLUDED.popular_boats,
    utilization_data = EXCLUDED.utilization_data,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION refresh_dashboard_stats FROM PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_dashboard_stats TO authenticated, service_role;

-- Trigger on bookings
CREATE OR REPLACE FUNCTION trg_bookings_refresh_dashboard_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_dashboard_stats(OLD.marina_id);
    RETURN OLD;
  END IF;
  PERFORM refresh_dashboard_stats(NEW.marina_id);
  IF TG_OP = 'UPDATE' AND OLD.marina_id IS DISTINCT FROM NEW.marina_id THEN
    PERFORM refresh_dashboard_stats(OLD.marina_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_refresh_dashboard_stats ON bookings;
CREATE TRIGGER bookings_refresh_dashboard_stats
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trg_bookings_refresh_dashboard_stats();

-- Trigger on reviews (rating stats only)
CREATE OR REPLACE FUNCTION trg_reviews_refresh_dashboard_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_dashboard_stats(OLD.marina_id);
    RETURN OLD;
  END IF;
  PERFORM refresh_dashboard_stats(NEW.marina_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_refresh_dashboard_stats ON reviews;
CREATE TRIGGER reviews_refresh_dashboard_stats
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION trg_reviews_refresh_dashboard_stats();

-- =============================================================================
-- STAFF DASHBOARD SUMMARY RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION get_staff_dashboard_summary(p_marina_id UUID, p_timezone TEXT DEFAULT 'America/New_York')
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_today_start TIMESTAMPTZ;
  v_today_end TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  IF NOT (p_marina_id = ANY(SELECT auth_user_marina_ids())) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_today_start := date_trunc('day', v_now AT TIME ZONE p_timezone) AT TIME ZONE p_timezone;
  v_today_end := v_today_start + interval '1 day';

  SELECT jsonb_build_object(
    'todays_count', (
      SELECT COUNT(*)::INT FROM bookings
      WHERE marina_id = p_marina_id
        AND status IN ('pending', 'confirmed')
        AND start_at >= v_today_start AND start_at < v_today_end
    ),
    'pending_count', (
      SELECT COUNT(*)::INT FROM bookings
      WHERE marina_id = p_marina_id AND status = 'pending'
    ),
    'upcoming', (
      SELECT COALESCE(jsonb_agg(row ORDER BY row->>'start_at'), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'id', b.id,
          'start_at', b.start_at,
          'status', b.status
        ) AS row
        FROM bookings b
        WHERE b.marina_id = p_marina_id
          AND b.status IN ('pending', 'confirmed')
          AND b.start_at > v_now
        ORDER BY b.start_at ASC
        LIMIT 5
      ) sub
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION get_staff_dashboard_summary FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_staff_dashboard_summary TO authenticated;

-- Marina rating aggregate (replaces full-table JS scan)
CREATE OR REPLACE FUNCTION get_marina_rating_aggregate(p_marina_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'avg_rating', ROUND(AVG(rating)::numeric, 1),
    'review_count', COUNT(*)::INT
  )
  FROM reviews
  WHERE marina_id = p_marina_id;
$$;

REVOKE ALL ON FUNCTION get_marina_rating_aggregate FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_marina_rating_aggregate TO authenticated;
