-- Waitlist system

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'waitlist_available';

CREATE TABLE waitlist_entries (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marina_id             UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  boat_id               UUID REFERENCES boats(id) ON DELETE SET NULL,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  guest_email           TEXT,
  guest_name            TEXT,
  guest_phone           TEXT,
  desired_start_at      TIMESTAMPTZ NOT NULL,
  desired_end_at        TIMESTAMPTZ NOT NULL,
  guest_count           INT NOT NULL DEFAULT 1 CHECK (guest_count > 0),
  status                waitlist_status NOT NULL DEFAULT 'active',
  notified_at           TIMESTAMPTZ,
  converted_booking_id  UUID REFERENCES bookings(id) ON DELETE SET NULL,
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_contact CHECK (
    customer_id IS NOT NULL OR (guest_email IS NOT NULL AND guest_name IS NOT NULL)
  ),
  CONSTRAINT waitlist_time_valid CHECK (desired_end_at > desired_start_at)
);

CREATE INDEX idx_waitlist_lookup ON waitlist_entries(marina_id, boat_id, status, desired_start_at);
CREATE INDEX idx_waitlist_active ON waitlist_entries(marina_id, status) WHERE status = 'active';

ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY waitlist_staff_select ON waitlist_entries
  FOR SELECT USING (marina_id IN (SELECT auth_user_marina_ids()));

CREATE POLICY waitlist_staff_update ON waitlist_entries
  FOR UPDATE USING (marina_id IN (SELECT auth_user_marina_ids()))
  WITH CHECK (marina_id IN (SELECT auth_user_marina_ids()));

CREATE POLICY waitlist_consumer_select ON waitlist_entries
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
        OR email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

-- Public join via RPC
CREATE OR REPLACE FUNCTION join_waitlist(
  p_marina_id UUID,
  p_boat_id UUID,
  p_desired_start TIMESTAMPTZ,
  p_desired_end TIMESTAMPTZ,
  p_guest_count INT,
  p_guest_name TEXT,
  p_guest_email TEXT,
  p_guest_phone TEXT DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO waitlist_entries (
    marina_id, boat_id, customer_id,
    guest_name, guest_email, guest_phone,
    desired_start_at, desired_end_at, guest_count
  ) VALUES (
    p_marina_id, p_boat_id, p_customer_id,
    p_guest_name, p_guest_email, p_guest_phone,
    p_desired_start, p_desired_end, p_guest_count
  ) RETURNING id INTO v_id;

  PERFORM write_audit_log(
    p_marina_id, 'waitlist.joined', 'waitlist_entry',
    p_guest_name || ' joined waitlist', v_id,
    jsonb_build_object('boat_id', p_boat_id, 'start', p_desired_start, 'end', p_desired_end)
  );

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION join_waitlist FROM PUBLIC;
GRANT EXECUTE ON FUNCTION join_waitlist TO authenticated, anon;

-- Match waitlist when slot opens (replaces placeholder)
CREATE OR REPLACE FUNCTION match_waitlist_on_availability(
  p_boat_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_marina_id UUID DEFAULT NULL
) RETURNS INT AS $$
DECLARE
  v_marina_id UUID;
  v_entry waitlist_entries%ROWTYPE;
  v_recipient UUID;
  v_boat_name TEXT;
  v_count INT := 0;
BEGIN
  IF p_boat_id IS NOT NULL THEN
    SELECT marina_id, name INTO v_marina_id, v_boat_name FROM boats WHERE id = p_boat_id;
  ELSE
    v_marina_id := p_marina_id;
  END IF;

  IF v_marina_id IS NULL THEN RETURN 0; END IF;

  IF p_boat_id IS NOT NULL AND NOT is_boat_available(p_boat_id, p_start, p_end) THEN
    RETURN 0;
  END IF;

  FOR v_entry IN
    SELECT * FROM waitlist_entries
    WHERE marina_id = v_marina_id
      AND status = 'active'
      AND (boat_id IS NULL OR boat_id = p_boat_id)
      AND tstzrange(desired_start_at, desired_end_at) && tstzrange(p_start, p_end)
    ORDER BY created_at ASC
    LIMIT 1
  LOOP
    UPDATE waitlist_entries
    SET status = 'notified', notified_at = now()
    WHERE id = v_entry.id;

    IF v_entry.customer_id IS NOT NULL THEN
      SELECT user_id INTO v_recipient FROM customers WHERE id = v_entry.customer_id;
    END IF;

    IF v_recipient IS NOT NULL THEN
      INSERT INTO notifications (marina_id, recipient_id, type, title, body, entity_type, entity_id, metadata)
      VALUES (
        v_marina_id,
        v_recipient,
        'waitlist_available',
        'A slot opened up!',
        COALESCE(v_boat_name, 'Your preferred boat') || ' may be available for your requested dates.',
        'waitlist_entry',
        v_entry.id,
        jsonb_build_object('boat_id', p_boat_id, 'start', p_start, 'end', p_end)
      );
    END IF;

    PERFORM write_audit_log(
      v_marina_id, 'waitlist.notified', 'waitlist_entry',
      COALESCE(v_entry.guest_name, 'Customer') || ' notified — slot available',
      v_entry.id,
      jsonb_build_object('boat_id', p_boat_id)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION match_waitlist_on_availability FROM PUBLIC;
GRANT EXECUTE ON FUNCTION match_waitlist_on_availability TO authenticated;
