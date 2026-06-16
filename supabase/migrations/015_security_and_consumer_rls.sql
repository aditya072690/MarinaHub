-- Consumer read/link policies
CREATE POLICY "Consumers read linked customers" ON customers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Consumers read customers by email" ON customers FOR SELECT
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Consumers link own customer records" ON customers FOR UPDATE
  USING (
    user_id IS NULL
    AND email = (SELECT email FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Consumers read own bookings" ON bookings FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE user_id = auth.uid()
         OR email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

-- Staff booking update guard
CREATE OR REPLACE FUNCTION guard_staff_booking_update()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
BEGIN
  v_role := auth_user_role(OLD.marina_id);

  IF v_role = 'staff' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (OLD.status = 'confirmed' AND NEW.status = 'completed') THEN
        RAISE EXCEPTION 'Staff cannot change booking status to %', NEW.status;
      END IF;
    END IF;

    IF NEW.boat_id IS DISTINCT FROM OLD.boat_id
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.start_at IS DISTINCT FROM OLD.start_at
       OR NEW.end_at IS DISTINCT FROM OLD.end_at
       OR NEW.total_price IS DISTINCT FROM OLD.total_price
       OR NEW.marina_id IS DISTINCT FROM OLD.marina_id
       OR NEW.guest_count IS DISTINCT FROM OLD.guest_count
       OR NEW.source IS DISTINCT FROM OLD.source
    THEN
      RAISE EXCEPTION 'Staff cannot modify core booking fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER bookings_staff_update_guard
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION guard_staff_booking_update();

-- Secure customer linking RPC
CREATE OR REPLACE FUNCTION link_customers_for_user(p_user_id UUID, p_email TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_email IS DISTINCT FROM (SELECT email FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Email mismatch';
  END IF;

  UPDATE customers
  SET user_id = p_user_id
  WHERE email = p_email AND user_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION link_customers_for_user FROM PUBLIC;
GRANT EXECUTE ON FUNCTION link_customers_for_user TO authenticated;

-- Favorites marina_id integrity
DROP POLICY IF EXISTS "Users insert own favorites" ON favorites;
CREATE POLICY "Users insert own favorites" ON favorites FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM boats b
      WHERE b.id = boat_id
        AND b.marina_id = favorites.marina_id
        AND b.status = 'active'
    )
  );

-- Notification deduplication helper
CREATE OR REPLACE FUNCTION insert_notification_if_new(
  p_marina_id UUID,
  p_recipient_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF p_recipient_id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE recipient_id = p_recipient_id
      AND type = p_type
      AND entity_type IS NOT DISTINCT FROM p_entity_type
      AND entity_id IS NOT DISTINCT FROM p_entity_id
      AND created_at > now() - interval '5 minutes'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO notifications (marina_id, recipient_id, type, title, body, entity_type, entity_id)
  VALUES (p_marina_id, p_recipient_id, p_type, p_title, p_body, p_entity_type, p_entity_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update notify_marina_members to use dedup
CREATE OR REPLACE FUNCTION notify_marina_members(
  p_marina_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_roles user_role[] DEFAULT ARRAY['owner', 'manager', 'staff']::user_role[]
)
RETURNS VOID AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT mm.user_id
    FROM marina_members mm
    WHERE mm.marina_id = p_marina_id AND mm.role = ANY(p_roles)
  LOOP
    PERFORM insert_notification_if_new(
      p_marina_id, r.user_id, p_type, p_title, p_body, p_entity_type, p_entity_id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update booking notification trigger: staff get new_booking on confirm, not booking_confirmed
CREATE OR REPLACE FUNCTION notify_booking_event()
RETURNS TRIGGER AS $$
DECLARE
  v_boat_name TEXT;
  v_date TEXT;
BEGIN
  SELECT name INTO v_boat_name FROM boats WHERE id = NEW.boat_id;
  v_date := to_char(NEW.start_at AT TIME ZONE 'UTC', 'Mon DD, YYYY');

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' THEN
      PERFORM notify_marina_members(
        NEW.marina_id, 'new_booking',
        'Pending booking needs confirmation',
        format('New pending booking for %s on %s', v_boat_name, v_date),
        'booking', NEW.id,
        ARRAY['owner', 'manager']::user_role[]
      );
    ELSE
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
      -- Only notify owner/manager that pending was confirmed (staff who created already knows)
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

CREATE OR REPLACE FUNCTION notify_boat_unavailable()
RETURNS TRIGGER AS $$
DECLARE
  v_boat_name TEXT;
  r RECORD;
BEGIN
  IF NEW.boat_id IS NULL THEN RETURN NEW; END IF;

  SELECT name INTO v_boat_name FROM boats WHERE id = NEW.boat_id;

  FOR r IN
    SELECT DISTINCT b.marina_id, c.user_id
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    WHERE b.boat_id = NEW.boat_id
      AND b.status IN ('pending', 'confirmed')
      AND b.start_at < NEW.end_at AND b.end_at > NEW.start_at
      AND c.user_id IS NOT NULL
  LOOP
    PERFORM insert_notification_if_new(
      r.marina_id, r.user_id, 'boat_unavailable',
      format('%s temporarily unavailable', v_boat_name),
      format('Your boat %s has a scheduled block that may affect availability', v_boat_name),
      'availability_block', NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
