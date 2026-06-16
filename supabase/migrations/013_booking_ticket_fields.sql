CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE bookings
  ADD COLUMN checked_in_at TIMESTAMPTZ,
  ADD COLUMN checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN checked_out_at TIMESTAMPTZ,
  ADD COLUMN checked_out_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN ticket_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

CREATE INDEX idx_bookings_ticket_token ON bookings(ticket_token);

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
    VALUES (NEW.id, NEW.marina_id, OLD.status, NEW.status, NEW.cancelled_by, NEW.source, NEW.cancellation_reason);
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.checked_in_at IS NULL AND NEW.checked_in_at IS NOT NULL THEN
    INSERT INTO booking_status_history (booking_id, marina_id, from_status, to_status, changed_by, source, notes)
    VALUES (NEW.id, NEW.marina_id, NEW.status, NEW.status, NEW.checked_in_by, 'dashboard', 'Guest checked in');
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.checked_out_at IS NULL AND NEW.checked_out_at IS NOT NULL THEN
    INSERT INTO booking_status_history (booking_id, marina_id, from_status, to_status, changed_by, source, notes)
    VALUES (NEW.id, NEW.marina_id, NEW.status, NEW.status, NEW.checked_out_by, 'dashboard', 'Guest checked out');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER bookings_log_status_change
  AFTER INSERT OR UPDATE OF status, checked_in_at, checked_out_at ON bookings
  FOR EACH ROW EXECUTE FUNCTION log_booking_status_change();
