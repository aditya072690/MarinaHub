ALTER TABLE customers
  ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN total_bookings INT NOT NULL DEFAULT 0,
  ADD COLUMN total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN last_booking_at TIMESTAMPTZ;

CREATE INDEX idx_customers_user ON customers(user_id);

CREATE OR REPLACE FUNCTION refresh_customer_stats(p_customer_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE customers c SET
    total_bookings = (
      SELECT COUNT(*)::INT FROM bookings b
      WHERE b.customer_id = p_customer_id AND b.status NOT IN ('cancelled')
    ),
    total_spent = (
      SELECT COALESCE(SUM(b.total_price), 0) FROM bookings b
      WHERE b.customer_id = p_customer_id AND b.status IN ('confirmed', 'completed')
    ),
    last_booking_at = (
      SELECT MAX(b.start_at) FROM bookings b
      WHERE b.customer_id = p_customer_id AND b.status NOT IN ('cancelled')
    )
  WHERE c.id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION trigger_refresh_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_customer_stats(OLD.customer_id);
    RETURN OLD;
  END IF;
  PERFORM refresh_customer_stats(NEW.customer_id);
  IF TG_OP = 'UPDATE' AND OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
    PERFORM refresh_customer_stats(OLD.customer_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER bookings_refresh_customer_stats
  AFTER INSERT OR UPDATE OF status, total_price, customer_id OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_customer_stats();

CREATE OR REPLACE VIEW customer_profile_detail AS
SELECT
  c.*,
  (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id AND b.status NOT IN ('cancelled')) AS computed_bookings,
  (SELECT COALESCE(SUM(b.total_price), 0) FROM bookings b WHERE b.customer_id = c.id AND b.status IN ('confirmed', 'completed')) AS computed_spent
FROM customers c;
