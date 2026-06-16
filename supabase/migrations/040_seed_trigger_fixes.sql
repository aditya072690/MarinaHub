-- Allow trigger/system inserts (service role, auth.uid() NULL) to refresh segments

CREATE OR REPLACE FUNCTION refresh_customer_segments(p_marina_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_vip_bookings INT;
  v_vip_spend NUMERIC;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (p_marina_id = ANY(SELECT auth_user_marina_ids())) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT
    COALESCE((segmentation->>'vip_min_bookings')::INT, 5),
    COALESCE((segmentation->>'vip_min_spend')::NUMERIC, 2500)
  INTO v_vip_bookings, v_vip_spend
  FROM marina_settings WHERE marina_id = p_marina_id;

  INSERT INTO customer_segment_snapshots (customer_id, marina_id, segment, completed_bookings, total_spent, last_booking_at, computed_at)
  SELECT
    c.id,
    c.marina_id,
    CASE
      WHEN COALESCE(c.metadata->>'vip', 'false') = 'true' THEN 'vip'::customer_segment
      WHEN stats.completed >= v_vip_bookings OR stats.spent >= v_vip_spend THEN 'vip'::customer_segment
      WHEN stats.completed >= 1 THEN 'returning'::customer_segment
      ELSE 'first_time'::customer_segment
    END,
    COALESCE(stats.completed, 0),
    COALESCE(stats.spent, 0),
    stats.last_at,
    now()
  FROM customers c
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE b.status IN ('completed', 'checked_out')) AS completed,
      COALESCE(SUM(b.total_price) FILTER (WHERE b.status IN ('completed', 'checked_out')), 0) AS spent,
      MAX(b.start_at) FILTER (WHERE b.status IN ('completed', 'checked_out', 'confirmed', 'checked_in')) AS last_at
    FROM bookings b WHERE b.customer_id = c.id
  ) stats ON true
  WHERE c.marina_id = p_marina_id
  ON CONFLICT (customer_id) DO UPDATE SET
    segment = EXCLUDED.segment,
    completed_bookings = EXCLUDED.completed_bookings,
    total_spent = EXCLUDED.total_spent,
    last_booking_at = EXCLUDED.last_booking_at,
    computed_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION refresh_customer_segments FROM PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_customer_segments TO authenticated, service_role;
