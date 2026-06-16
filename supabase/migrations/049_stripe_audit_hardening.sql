-- Audit hardening: notification deferral, analytics revenue alignment, payment currency

ALTER TABLE payment_transactions
  ALTER COLUMN currency SET DEFAULT 'inr';

UPDATE payment_transactions SET currency = 'inr' WHERE currency = 'usd';

-- Gross revenue: Stripe ledger + paid bookings without a checkout transaction (pre-Stripe backfill)
CREATE OR REPLACE FUNCTION marina_gross_revenue(
  p_marina_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE((
      SELECT SUM(pt.amount_cents)::NUMERIC / 100
      FROM payment_transactions pt
      WHERE pt.marina_id = p_marina_id
        AND pt.type = 'checkout'
        AND pt.status = 'succeeded'
        AND (p_from IS NULL OR pt.created_at >= p_from)
        AND (p_to IS NULL OR pt.created_at < p_to)
    ), 0)
    + COALESCE((
      SELECT SUM(b.total_price)
      FROM bookings b
      WHERE b.marina_id = p_marina_id
        AND b.status IN ('confirmed', 'checked_in', 'checked_out', 'completed')
        AND b.payment_status = 'paid'
        AND (p_from IS NULL OR COALESCE(b.paid_at, b.created_at) >= p_from)
        AND (p_to IS NULL OR COALESCE(b.paid_at, b.created_at) < p_to)
        AND NOT EXISTS (
          SELECT 1 FROM payment_transactions pt2
          WHERE pt2.booking_id = b.id
            AND pt2.type = 'checkout'
            AND pt2.status = 'succeeded'
        )
    ), 0);
$$;

CREATE OR REPLACE FUNCTION marina_boat_gross_revenue(
  p_marina_id UUID,
  p_boat_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE((
      SELECT SUM(pt.amount_cents)::NUMERIC / 100
      FROM payment_transactions pt
      JOIN bookings b ON b.id = pt.booking_id
      WHERE pt.marina_id = p_marina_id
        AND b.boat_id = p_boat_id
        AND pt.type = 'checkout'
        AND pt.status = 'succeeded'
        AND (p_from IS NULL OR pt.created_at >= p_from)
    ), 0)
    + COALESCE((
      SELECT SUM(b.total_price)
      FROM bookings b
      WHERE b.marina_id = p_marina_id
        AND b.boat_id = p_boat_id
        AND b.status IN ('confirmed', 'checked_in', 'checked_out', 'completed')
        AND b.payment_status = 'paid'
        AND (p_from IS NULL OR b.start_at >= p_from)
        AND NOT EXISTS (
          SELECT 1 FROM payment_transactions pt2
          WHERE pt2.booking_id = b.id
            AND pt2.type = 'checkout'
            AND pt2.status = 'succeeded'
        )
    ), 0);
$$;

CREATE OR REPLACE FUNCTION confirm_booking_payment(
  p_booking_id UUID,
  p_marina_id UUID,
  p_session_id TEXT,
  p_payment_intent_id TEXT,
  p_amount_cents INTEGER,
  p_platform_fee_cents INTEGER,
  p_stripe_event_id TEXT,
  p_stripe_charge_id TEXT DEFAULT NULL,
  p_currency TEXT DEFAULT 'inr'
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM payment_transactions WHERE stripe_event_id = p_stripe_event_id) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE id = p_booking_id
      AND marina_id = p_marina_id
      AND payment_status = 'paid'
  ) THEN
    RETURN true;
  END IF;

  UPDATE bookings
  SET status = 'confirmed',
      payment_status = 'paid',
      stripe_session_id = COALESCE(stripe_session_id, p_session_id),
      stripe_payment_intent_id = p_payment_intent_id,
      paid_at = now()
  WHERE id = p_booking_id
    AND marina_id = p_marina_id
    AND payment_status IN ('unpaid', 'pending');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO payment_transactions (
    marina_id, booking_id, type, status, currency,
    amount_cents, platform_fee_cents,
    stripe_session_id, stripe_payment_intent_id, stripe_charge_id,
    stripe_event_id, description
  ) VALUES (
    p_marina_id, p_booking_id, 'checkout', 'succeeded', LOWER(COALESCE(p_currency, 'inr')),
    p_amount_cents, p_platform_fee_cents,
    p_session_id, p_payment_intent_id, p_stripe_charge_id,
    p_stripe_event_id,
    format('Booking payment %s', LEFT(p_booking_id::text, 8))
  );

  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    RETURN true;
END;
$$;

-- Defer staff alerts for online checkout until payment confirms (consumer/widget unpaid pending)
CREATE OR REPLACE FUNCTION notify_booking_event()
RETURNS TRIGGER AS $$
DECLARE
  v_boat_name TEXT;
  v_date TEXT;
  v_skip_pending_insert BOOLEAN;
BEGIN
  SELECT name INTO v_boat_name FROM boats WHERE id = NEW.boat_id;
  v_date := to_char(NEW.start_at AT TIME ZONE 'UTC', 'Mon DD, YYYY');

  v_skip_pending_insert :=
    NEW.status = 'pending'
    AND NEW.payment_status IN ('unpaid', 'pending')
    AND COALESCE(NEW.source, '') IN ('consumer', 'widget');

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' AND NOT v_skip_pending_insert THEN
      PERFORM notify_marina_members(
        NEW.marina_id, 'new_booking',
        'Pending booking needs confirmation',
        format('New pending booking for %s on %s', v_boat_name, v_date),
        'booking', NEW.id,
        ARRAY['owner', 'manager']::user_role[]
      );
    ELSIF NEW.status <> 'pending' THEN
      PERFORM notify_marina_members(
        NEW.marina_id, 'new_booking',
        format('New booking: %s', v_boat_name),
        format('New booking on %s', v_date),
        'booking', NEW.id
      );
    END IF;

    IF NEW.status = 'confirmed' THEN
      PERFORM insert_notification_if_new(
        NEW.marina_id,
        (SELECT c.user_id FROM customers c WHERE c.id = NEW.customer_id AND c.user_id IS NOT NULL),
        'booking_confirmed',
        'Your trip is confirmed',
        format('Your booking for %s on %s is confirmed', v_boat_name, v_date),
        'booking', NEW.id
      );
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM notify_marina_members(
        NEW.marina_id, 'new_booking',
        format('Booking confirmed: %s', v_boat_name),
        format('Booking confirmed for %s', v_date),
        'booking', NEW.id,
        ARRAY['owner', 'manager']::user_role[]
      );
      PERFORM insert_notification_if_new(
        NEW.marina_id,
        (SELECT c.user_id FROM customers c WHERE c.id = NEW.customer_id AND c.user_id IS NOT NULL),
        'booking_confirmed',
        'Your trip is confirmed',
        format('Your booking for %s on %s is confirmed', v_boat_name, v_date),
        'booking', NEW.id
      );
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM notify_marina_members(
        NEW.marina_id, 'booking_cancelled',
        format('Booking cancelled: %s', v_boat_name),
        format('Booking on %s was cancelled', v_date),
        'booking', NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Analytics: align revenue with payment ledger + paid bookings fallback
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
    'total_revenue', marina_gross_revenue(p_marina_id, NULL, NULL),
    'revenue_this_month', marina_gross_revenue(p_marina_id, v_month_start, v_month_end),
    'upcoming_trips', (
      SELECT COUNT(*)::INT FROM bookings
      WHERE marina_id = p_marina_id
        AND status IN ('confirmed', 'pending', 'checked_in', 'checked_out')
        AND payment_status IN ('paid', 'pending')
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
          'revenue', marina_gross_revenue(p_marina_id, m.month_start, m.month_end)
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
          'revenue', marina_gross_revenue(p_marina_id, d.day_start, d.day_end)
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
          'revenue', marina_boat_gross_revenue(p_marina_id, bt.id, v_ninety_days_ago)
        ) AS row
        FROM boats bt
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::INT AS cnt
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

REVOKE ALL ON FUNCTION marina_gross_revenue FROM PUBLIC;
GRANT EXECUTE ON FUNCTION marina_gross_revenue TO authenticated;
REVOKE ALL ON FUNCTION marina_boat_gross_revenue FROM PUBLIC;
GRANT EXECUTE ON FUNCTION marina_boat_gross_revenue TO authenticated;
