-- Step 2: Backfill, constraints, and functions using checked_in / checked_out
-- Runs in a separate migration so new enum values are committed (PostgreSQL 55P04)

-- Backfill existing timestamp-only check-ins
UPDATE bookings
SET status = 'checked_in'
WHERE checked_in_at IS NOT NULL
  AND checked_out_at IS NULL
  AND status = 'confirmed';

-- Overlap constraint: boat occupied during active lifecycle statuses
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    boat_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  ) WHERE (status IN ('pending', 'confirmed', 'checked_in', 'checked_out'));

DROP INDEX IF EXISTS idx_bookings_boat_time;
CREATE INDEX idx_bookings_boat_time ON bookings(boat_id, start_at, end_at)
  WHERE status IN ('pending', 'confirmed', 'checked_in', 'checked_out');

CREATE OR REPLACE FUNCTION is_boat_available(
  p_boat_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE boat_id = p_boat_id
      AND status IN ('pending', 'confirmed', 'checked_in', 'checked_out')
      AND id IS DISTINCT FROM p_exclude_booking_id
      AND tstzrange(start_at, end_at) && tstzrange(p_start, p_end)
  ) AND NOT EXISTS (
    SELECT 1 FROM availability_blocks
    WHERE (boat_id = p_boat_id OR boat_id IS NULL)
      AND marina_id = (SELECT marina_id FROM boats WHERE id = p_boat_id)
      AND tstzrange(start_at, end_at) && tstzrange(p_start, p_end)
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION guard_staff_booking_update()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
BEGIN
  v_role := auth_user_role(OLD.marina_id);

  IF v_role = 'staff' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (
        (OLD.status = 'confirmed' AND NEW.status = 'checked_in')
        OR (OLD.status = 'checked_in' AND NEW.status = 'checked_out')
        OR (OLD.status = 'checked_out' AND NEW.status = 'completed')
      ) THEN
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

CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO booking_status_history (booking_id, marina_id, from_status, to_status, changed_by, source, notes)
    VALUES (NEW.id, NEW.marina_id, NULL, NEW.status, NEW.created_by, NEW.source, 'Booking created');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO booking_status_history (booking_id, marina_id, from_status, to_status, changed_by, source, notes)
    VALUES (
      NEW.id,
      NEW.marina_id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.cancelled_by, NEW.checked_in_by, NEW.checked_out_by),
      NEW.source,
      NEW.cancellation_reason
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS bookings_log_status_change ON bookings;
CREATE TRIGGER bookings_log_status_change
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION log_booking_status_change();

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
    ELSIF NEW.status = 'checked_in' THEN
      PERFORM notify_marina_members(
        NEW.marina_id, 'booking_checked_in',
        format('Guest checked in: %s', v_boat_name),
        format('Guest checked in for booking on %s', v_date),
        'booking', NEW.id
      );
      PERFORM insert_notification_if_new(
        NEW.marina_id,
        (SELECT c.user_id FROM customers c WHERE c.id = NEW.customer_id AND c.user_id IS NOT NULL),
        'booking_checked_in',
        'Enjoy your trip!',
        format('You have been checked in for %s', v_boat_name),
        'booking', NEW.id
      );
    ELSIF NEW.status = 'checked_out' THEN
      PERFORM notify_marina_members(
        NEW.marina_id, 'booking_checked_out',
        format('Guest checked out: %s', v_boat_name),
        format('Guest returned from booking on %s', v_date),
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
