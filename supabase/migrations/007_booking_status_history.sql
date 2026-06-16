CREATE TABLE booking_status_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  marina_id    UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  from_status  booking_status,
  to_status    booking_status NOT NULL,
  changed_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role   user_role,
  source       TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_status_history_booking ON booking_status_history(booking_id, created_at);
CREATE INDEX idx_booking_status_history_marina ON booking_status_history(marina_id, created_at DESC);

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
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read booking history" ON booking_status_history FOR SELECT
  USING (marina_id IN (SELECT auth_user_marina_ids()));
