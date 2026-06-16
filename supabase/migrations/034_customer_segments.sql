-- Customer segmentation snapshots

CREATE TABLE customer_segment_snapshots (
  customer_id         UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  marina_id           UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  segment             customer_segment NOT NULL DEFAULT 'first_time',
  completed_bookings  INT NOT NULL DEFAULT 0,
  total_spent         DECIMAL(10,2) NOT NULL DEFAULT 0,
  last_booking_at     TIMESTAMPTZ,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_segments_marina ON customer_segment_snapshots(marina_id, segment);

ALTER TABLE customer_segment_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_segments_select ON customer_segment_snapshots
  FOR SELECT USING (marina_id IN (SELECT auth_user_marina_ids()));

CREATE OR REPLACE FUNCTION refresh_customer_segments(p_marina_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_vip_bookings INT;
  v_vip_spend NUMERIC;
BEGIN
  IF NOT (p_marina_id = ANY(SELECT auth_user_marina_ids())) THEN
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
GRANT EXECUTE ON FUNCTION refresh_customer_segments TO authenticated;

-- Refresh segment on booking completion
CREATE OR REPLACE FUNCTION refresh_customer_segment_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'checked_out') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM refresh_customer_segments(NEW.marina_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_refresh_customer_segment
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION refresh_customer_segment_on_booking();
