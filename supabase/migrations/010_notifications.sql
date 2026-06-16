CREATE TYPE notification_type AS ENUM (
  'new_booking',
  'booking_cancelled',
  'boat_unavailable',
  'booking_confirmed',
  'booking_reminder_ui_only'
);

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marina_id     UUID REFERENCES marinas(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          notification_type NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  entity_type   TEXT,
  entity_id     UUID,
  metadata      JSONB NOT NULL DEFAULT '{}',
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, read_at NULLS FIRST, created_at DESC);
CREATE INDEX idx_notifications_marina ON notifications(marina_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON notifications FOR SELECT
  USING (recipient_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE
  USING (recipient_id = auth.uid());

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
BEGIN
  INSERT INTO notifications (marina_id, recipient_id, type, title, body, entity_type, entity_id)
  SELECT p_marina_id, mm.user_id, p_type, p_title, p_body, p_entity_type, p_entity_id
  FROM marina_members mm
  WHERE mm.marina_id = p_marina_id AND mm.role = ANY(p_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
      INSERT INTO notifications (marina_id, recipient_id, type, title, body, entity_type, entity_id)
      SELECT NEW.marina_id, c.user_id, 'booking_confirmed',
        'Your trip is confirmed',
        format('Your booking for %s on %s is confirmed', v_boat_name, v_date),
        'booking', NEW.id
      FROM customers c
      WHERE c.id = NEW.customer_id AND c.user_id IS NOT NULL;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM notify_marina_members(
        NEW.marina_id, 'booking_confirmed',
        format('Booking confirmed: %s', v_boat_name),
        format('Booking confirmed for %s', v_date),
        'booking', NEW.id
      );
      INSERT INTO notifications (marina_id, recipient_id, type, title, body, entity_type, entity_id)
      SELECT NEW.marina_id, c.user_id, 'booking_confirmed',
        'Your trip is confirmed',
        format('Your booking for %s on %s is confirmed', v_boat_name, v_date),
        'booking', NEW.id
      FROM customers c
      WHERE c.id = NEW.customer_id AND c.user_id IS NOT NULL;
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

CREATE TRIGGER bookings_notify_event
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION notify_booking_event();

CREATE OR REPLACE FUNCTION notify_boat_unavailable()
RETURNS TRIGGER AS $$
DECLARE
  v_boat_name TEXT;
BEGIN
  IF NEW.boat_id IS NULL THEN RETURN NEW; END IF;

  SELECT name INTO v_boat_name FROM boats WHERE id = NEW.boat_id;

  INSERT INTO notifications (marina_id, recipient_id, type, title, body, entity_type, entity_id)
  SELECT DISTINCT b.marina_id, c.user_id, 'boat_unavailable',
    format('%s temporarily unavailable', v_boat_name),
    format('Your boat %s has a scheduled block that may affect availability', v_boat_name),
    'availability_block', NEW.id
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  WHERE b.boat_id = NEW.boat_id
    AND b.status IN ('pending', 'confirmed')
    AND b.start_at < NEW.end_at AND b.end_at > NEW.start_at
    AND c.user_id IS NOT NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER availability_blocks_notify
  AFTER INSERT ON availability_blocks
  FOR EACH ROW EXECUTE FUNCTION notify_boat_unavailable();
