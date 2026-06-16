-- QA audit fixes: notifications, profile settings, booking_addons security

-- H4: Notify guests on active trips when blocks overlap
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
      AND b.status IN ('pending', 'confirmed', 'checked_in', 'checked_out')
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

-- M1: Persist consumer notification preferences
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{
    "email_notifications": true,
    "booking_reminders": true
  }'::jsonb;

-- M3: Restrict direct booking_addons inserts; use RPC from server actions
DROP POLICY IF EXISTS "Members insert booking addons" ON booking_addons;

CREATE OR REPLACE FUNCTION insert_booking_addons(
  p_booking_id UUID,
  p_rows JSONB
) RETURNS VOID AS $$
DECLARE
  v_marina_id UUID;
  row JSONB;
BEGIN
  SELECT marina_id INTO v_marina_id FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF NOT (v_marina_id = ANY(SELECT auth_user_marina_ids())) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF auth_user_role(v_marina_id) NOT IN ('owner', 'manager', 'staff') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  FOR row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    INSERT INTO booking_addons (
      booking_id, marina_id, addon_id, quantity, unit_price, total_price
    ) VALUES (
      p_booking_id,
      v_marina_id,
      (row->>'addon_id')::UUID,
      COALESCE((row->>'quantity')::INT, 1),
      (row->>'unit_price')::NUMERIC,
      (row->>'total_price')::NUMERIC
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION insert_booking_addons FROM PUBLIC;
GRANT EXECUTE ON FUNCTION insert_booking_addons TO authenticated;
