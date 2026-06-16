-- Fix revenue showing ₹0 when bookings exist but payment_status was never set (demo / manual bookings).

-- Backfill paid status for revenue-eligible bookings
UPDATE bookings
SET
  payment_status = 'paid',
  paid_at = COALESCE(paid_at, start_at, created_at)
WHERE status IN ('confirmed', 'checked_in', 'checked_out', 'completed')
  AND payment_status = 'unpaid';

-- Timestamp used for month-bucket revenue (paid ledger vs trip date for manual/demo)
CREATE OR REPLACE FUNCTION booking_revenue_at(b bookings)
RETURNS TIMESTAMPTZ
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN b.payment_status = 'paid' THEN COALESCE(b.paid_at, b.created_at)
    ELSE b.start_at
  END;
$$;

REVOKE ALL ON FUNCTION booking_revenue_at FROM PUBLIC;
GRANT EXECUTE ON FUNCTION booking_revenue_at TO authenticated;

-- Count booking revenue for non-Stripe marinas even when payment_status is still unpaid
CREATE OR REPLACE FUNCTION marina_gross_revenue(
  p_marina_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
  WITH stripe_live AS (
    SELECT COALESCE(
      (
        SELECT mpa.stripe_onboarding_complete
        FROM marina_payment_accounts mpa
        WHERE mpa.marina_id = p_marina_id
      ),
      false
    ) AS connected
  )
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
      CROSS JOIN stripe_live sl
      WHERE b.marina_id = p_marina_id
        AND b.status IN ('confirmed', 'checked_in', 'checked_out', 'completed')
        AND (
          b.payment_status = 'paid'
          OR NOT sl.connected
        )
        AND (p_from IS NULL OR booking_revenue_at(b) >= p_from)
        AND (p_to IS NULL OR booking_revenue_at(b) < p_to)
        AND NOT EXISTS (
          SELECT 1 FROM payment_transactions pt2
          WHERE pt2.booking_id = b.id
            AND pt2.type = 'checkout'
            AND pt2.status = 'succeeded'
        )
    ), 0);
$$;

REVOKE ALL ON FUNCTION marina_gross_revenue FROM PUBLIC;
GRANT EXECUTE ON FUNCTION marina_gross_revenue TO authenticated;

-- Refresh cached dashboard stats after backfill
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM marinas LOOP
    PERFORM refresh_dashboard_stats(r.id);
  END LOOP;
END $$;
