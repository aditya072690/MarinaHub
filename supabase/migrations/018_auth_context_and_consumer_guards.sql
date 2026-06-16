-- Consumer trip query index
CREATE INDEX IF NOT EXISTS idx_customers_user_email
  ON customers(user_id, email);

-- Tighten profile update WITH CHECK (policy may already exist from 002)
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Auto-link customer to auth user when booking is created while logged in
CREATE OR REPLACE FUNCTION link_customer_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    UPDATE customers
    SET user_id = auth.uid()
    WHERE id = NEW.customer_id
      AND user_id IS NULL
      AND email = (SELECT email FROM profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS bookings_link_customer_on_insert ON bookings;
CREATE TRIGGER bookings_link_customer_on_insert
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION link_customer_on_booking();
