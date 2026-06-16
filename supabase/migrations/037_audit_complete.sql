-- Complete audit log coverage: internal writer for triggers + missing event triggers

CREATE OR REPLACE FUNCTION write_audit_log_internal(
  p_marina_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_summary TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_visibility audit_log_visibility DEFAULT 'staff',
  p_show_in_feed BOOLEAN DEFAULT true,
  p_actor_id UUID DEFAULT NULL,
  p_actor_role user_role DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_logs (
    marina_id, actor_id, actor_role, action, entity_type, entity_id,
    summary, metadata, visibility, show_in_feed
  ) VALUES (
    p_marina_id,
    COALESCE(p_actor_id, auth.uid()),
    COALESCE(p_actor_role, auth_user_role(p_marina_id)),
    p_action, p_entity_type, p_entity_id,
    p_summary, p_metadata, p_visibility, p_show_in_feed
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION write_audit_log_internal FROM PUBLIC;

-- Repoint existing triggers to internal writer (safe when auth context missing)
CREATE OR REPLACE FUNCTION audit_boat_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM write_audit_log_internal(
      NEW.marina_id, 'boat.added', 'boat',
      'Added boat ' || NEW.name, NEW.id,
      jsonb_build_object('name', NEW.name, 'hourly_rate', NEW.hourly_rate)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM write_audit_log_internal(
      NEW.marina_id, 'boat.updated', 'boat',
      'Updated boat ' || NEW.name, NEW.id,
      jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM write_audit_log_internal(
      OLD.marina_id, 'boat.deleted', 'boat',
      'Removed boat ' || OLD.name, OLD.id,
      jsonb_build_object('name', OLD.name)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION audit_pricing_rule_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM write_audit_log_internal(
      NEW.marina_id, 'pricing_rule.created', 'pricing_rule',
      'Created ' || NEW.rule_type || ' pricing rule', NEW.id,
      jsonb_build_object('rule_type', NEW.rule_type, 'boat_id', NEW.boat_id)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM write_audit_log_internal(
      NEW.marina_id, 'pricing_rule.updated', 'pricing_rule',
      'Updated ' || NEW.rule_type || ' pricing rule', NEW.id,
      jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM write_audit_log_internal(
      OLD.marina_id, 'pricing_rule.deleted', 'pricing_rule',
      'Deleted ' || OLD.rule_type || ' pricing rule', OLD.id,
      jsonb_build_object('rule_type', OLD.rule_type)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION audit_block_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_title := COALESCE(NEW.title, NEW.reason::TEXT);
    PERFORM write_audit_log_internal(
      NEW.marina_id, 'block.created', 'availability_block',
      'Created availability block: ' || v_title, NEW.id,
      jsonb_build_object('reason', NEW.reason, 'start_at', NEW.start_at, 'end_at', NEW.end_at)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_title := COALESCE(NEW.title, NEW.reason::TEXT);
    PERFORM write_audit_log_internal(
      NEW.marina_id, 'block.updated', 'availability_block',
      'Updated availability block: ' || v_title, NEW.id,
      jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_title := COALESCE(OLD.title, OLD.reason::TEXT);
    PERFORM write_audit_log_internal(
      OLD.marina_id, 'block.deleted', 'availability_block',
      'Removed availability block: ' || v_title, OLD.id,
      jsonb_build_object('reason', OLD.reason)
    );
    PERFORM match_waitlist_on_availability(OLD.boat_id, OLD.start_at, OLD.end_at, OLD.marina_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_audit_blocks ON availability_blocks;
CREATE TRIGGER trg_audit_blocks
  AFTER INSERT OR UPDATE OR DELETE ON availability_blocks
  FOR EACH ROW EXECUTE FUNCTION audit_block_changes();

CREATE OR REPLACE FUNCTION audit_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_boat_name TEXT;
  v_customer_name TEXT;
  v_summary TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_boat_name FROM boats WHERE id = NEW.boat_id;
    SELECT full_name INTO v_customer_name FROM customers WHERE id = NEW.customer_id;
    PERFORM write_audit_log_internal(
      NEW.marina_id, 'booking.created', 'booking',
      COALESCE(v_customer_name, 'Guest') || ' booked ' || COALESCE(v_boat_name, 'a boat'),
      NEW.id,
      jsonb_build_object('status', NEW.status, 'start_at', NEW.start_at, 'total_price', NEW.total_price)
    );
    PERFORM convert_waitlist_on_booking(NEW);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT name INTO v_boat_name FROM boats WHERE id = NEW.boat_id;
    SELECT full_name INTO v_customer_name FROM customers WHERE id = NEW.customer_id;

    v_summary := CASE NEW.status
      WHEN 'cancelled' THEN COALESCE(v_customer_name, 'Booking') || ' cancelled ' || COALESCE(v_boat_name, 'boat')
      WHEN 'checked_in' THEN COALESCE(v_customer_name, 'Guest') || ' checked in to ' || COALESCE(v_boat_name, 'boat')
      WHEN 'checked_out' THEN COALESCE(v_customer_name, 'Guest') || ' checked out of ' || COALESCE(v_boat_name, 'boat')
      ELSE 'Booking status changed to ' || NEW.status
    END;

    PERFORM write_audit_log_internal(
      NEW.marina_id,
      'booking.' || NEW.status,
      'booking',
      v_summary,
      NEW.id,
      jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status)
    );

    IF NEW.status = 'cancelled' THEN
      PERFORM match_waitlist_on_availability(NEW.boat_id, NEW.start_at, NEW.end_at, NEW.marina_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Non-status booking field changes (reschedule, repricing)
CREATE OR REPLACE FUNCTION audit_booking_field_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_boat_name TEXT;
  v_changes TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF TG_OP != 'UPDATE' OR NEW.status IS DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.boat_id IS DISTINCT FROM OLD.boat_id THEN
    v_changes := array_append(v_changes, 'boat');
  END IF;
  IF NEW.start_at IS DISTINCT FROM OLD.start_at OR NEW.end_at IS DISTINCT FROM OLD.end_at THEN
    v_changes := array_append(v_changes, 'schedule');
  END IF;
  IF NEW.total_price IS DISTINCT FROM OLD.total_price THEN
    v_changes := array_append(v_changes, 'price');
  END IF;

  IF array_length(v_changes, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_boat_name FROM boats WHERE id = NEW.boat_id;

  PERFORM write_audit_log_internal(
    NEW.marina_id, 'booking.updated', 'booking',
    'Updated booking for ' || COALESCE(v_boat_name, 'boat') || ' (' || array_to_string(v_changes, ', ') || ')',
    NEW.id,
    jsonb_build_object(
      'fields', v_changes,
      'before', jsonb_build_object(
        'boat_id', OLD.boat_id, 'start_at', OLD.start_at, 'end_at', OLD.end_at, 'total_price', OLD.total_price
      ),
      'after', jsonb_build_object(
        'boat_id', NEW.boat_id, 'start_at', NEW.start_at, 'end_at', NEW.end_at, 'total_price', NEW.total_price
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_audit_booking_fields ON bookings;
CREATE TRIGGER trg_audit_booking_fields
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION audit_booking_field_changes();

-- Maintenance logs
CREATE OR REPLACE FUNCTION audit_maintenance_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_boat_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_boat_name FROM boats WHERE id = NEW.boat_id;
    PERFORM write_audit_log_internal(
      NEW.marina_id, 'maintenance.created', 'maintenance_log',
      'Scheduled maintenance for ' || COALESCE(v_boat_name, 'boat'), NEW.id,
      jsonb_build_object('status', NEW.status, 'scheduled_at', NEW.scheduled_at)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT name INTO v_boat_name FROM boats WHERE id = NEW.boat_id;
    PERFORM write_audit_log_internal(
      NEW.marina_id, 'maintenance.updated', 'maintenance_log',
      'Updated maintenance for ' || COALESCE(v_boat_name, 'boat'), NEW.id,
      jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    SELECT name INTO v_boat_name FROM boats WHERE id = OLD.boat_id;
    PERFORM write_audit_log_internal(
      OLD.marina_id, 'maintenance.deleted', 'maintenance_log',
      'Removed maintenance log for ' || COALESCE(v_boat_name, 'boat'), OLD.id,
      jsonb_build_object('status', OLD.status)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_audit_maintenance ON maintenance_logs;
CREATE TRIGGER trg_audit_maintenance
  AFTER INSERT OR UPDATE OR DELETE ON maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION audit_maintenance_changes();

-- Marina holidays
CREATE OR REPLACE FUNCTION audit_marina_holiday_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM write_audit_log_internal(
      NEW.marina_id, 'marina_holiday.created', 'marina_holiday',
      'Added holiday: ' || NEW.name || ' (' || NEW.date || ')', NEW.id,
      jsonb_build_object('date', NEW.date, 'is_recurring', NEW.is_recurring)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM write_audit_log_internal(
      NEW.marina_id, 'marina_holiday.updated', 'marina_holiday',
      'Updated holiday: ' || NEW.name, NEW.id,
      jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM write_audit_log_internal(
      OLD.marina_id, 'marina_holiday.deleted', 'marina_holiday',
      'Removed holiday: ' || OLD.name, OLD.id,
      jsonb_build_object('date', OLD.date)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_audit_marina_holidays ON marina_holidays;
CREATE TRIGGER trg_audit_marina_holidays
  AFTER INSERT OR UPDATE OR DELETE ON marina_holidays
  FOR EACH ROW EXECUTE FUNCTION audit_marina_holiday_changes();

-- Waitlist status changes
CREATE OR REPLACE FUNCTION audit_waitlist_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_guest TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_guest := COALESCE(NEW.guest_name, 'Guest');

  PERFORM write_audit_log_internal(
    NEW.marina_id,
    'waitlist.' || NEW.status,
    'waitlist_entry',
    CASE NEW.status
      WHEN 'cancelled' THEN v_guest || ' cancelled waitlist request'
      WHEN 'converted' THEN v_guest || ' converted waitlist to booking'
      WHEN 'expired' THEN v_guest || ' waitlist request expired'
      WHEN 'notified' THEN v_guest || ' notified — slot available'
      ELSE v_guest || ' waitlist status: ' || NEW.status
    END,
    NEW.id,
    jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status, 'boat_id', NEW.boat_id),
    'staff',
    NEW.status IN ('notified', 'converted', 'cancelled')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_audit_waitlist ON waitlist_entries;
CREATE TRIGGER trg_audit_waitlist
  AFTER UPDATE OF status ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION audit_waitlist_changes();

-- Team member added
CREATE OR REPLACE FUNCTION audit_marina_member_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
  v_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT email, full_name INTO v_email, v_name FROM profiles WHERE id = NEW.user_id;
    PERFORM write_audit_log_internal(
      NEW.marina_id, 'team.member_invited', 'marina_member',
      'Team member added: ' || COALESCE(v_name, v_email, 'user'),
      NEW.id,
      jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role, 'email', v_email),
      'owner_only',
      false
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    SELECT email, full_name INTO v_email, v_name FROM profiles WHERE id = NEW.user_id;
    PERFORM write_audit_log_internal(
      NEW.marina_id, 'team.member_role_changed', 'marina_member',
      'Changed role for ' || COALESCE(v_name, v_email) || ' to ' || NEW.role,
      NEW.id,
      jsonb_build_object('from_role', OLD.role, 'to_role', NEW.role),
      'owner_only',
      false
    );
  ELSIF TG_OP = 'DELETE' THEN
    SELECT email, full_name INTO v_email, v_name FROM profiles WHERE id = OLD.user_id;
    PERFORM write_audit_log_internal(
      OLD.marina_id, 'team.member_removed', 'marina_member',
      'Removed team member: ' || COALESCE(v_name, v_email, 'user'),
      OLD.id,
      jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role),
      'owner_only',
      false
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_audit_marina_members ON marina_members;
CREATE TRIGGER trg_audit_marina_members
  AFTER INSERT OR UPDATE OR DELETE ON marina_members
  FOR EACH ROW EXECUTE FUNCTION audit_marina_member_changes();

-- Customer VIP flag changes (metadata)
CREATE OR REPLACE FUNCTION audit_customer_vip_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (NEW.metadata->>'vip') IS DISTINCT FROM (OLD.metadata->>'vip') THEN
    PERFORM write_audit_log_internal(
      NEW.marina_id, 'customer.vip_flagged', 'customer',
      CASE WHEN NEW.metadata->>'vip' = 'true'
        THEN NEW.full_name || ' marked as VIP'
        ELSE 'VIP flag removed for ' || NEW.full_name
      END,
      NEW.id,
      jsonb_build_object('vip', NEW.metadata->>'vip'),
      'staff',
      false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_audit_customer_vip ON customers;
CREATE TRIGGER trg_audit_customer_vip
  AFTER UPDATE OF metadata ON customers
  FOR EACH ROW EXECUTE FUNCTION audit_customer_vip_changes();

-- Convert waitlist when matching booking is created
CREATE OR REPLACE FUNCTION convert_waitlist_on_booking(p_booking bookings)
RETURNS VOID AS $$
DECLARE
  v_entry waitlist_entries%ROWTYPE;
  v_email TEXT;
BEGIN
  SELECT lower(email) INTO v_email FROM customers WHERE id = p_booking.customer_id;

  FOR v_entry IN
    UPDATE waitlist_entries
    SET status = 'converted', converted_booking_id = p_booking.id
    WHERE marina_id = p_booking.marina_id
      AND status IN ('active', 'notified')
      AND boat_id = p_booking.boat_id
      AND tstzrange(desired_start_at, desired_end_at) && tstzrange(p_booking.start_at, p_booking.end_at)
      AND (
        customer_id = p_booking.customer_id
        OR (v_email IS NOT NULL AND lower(guest_email) = v_email)
      )
    RETURNING *
  LOOP
    NULL;
  END LOOP;

  UPDATE waitlist_entries
  SET status = 'expired'
  WHERE marina_id = p_booking.marina_id
    AND status = 'active'
    AND boat_id = p_booking.boat_id
    AND tstzrange(desired_start_at, desired_end_at) && tstzrange(p_booking.start_at, p_booking.end_at)
    AND id NOT IN (
      SELECT id FROM waitlist_entries
      WHERE converted_booking_id = p_booking.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- join_waitlist: use internal writer (anon-safe)
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
  v_boat_marina UUID;
BEGIN
  IF p_boat_id IS NOT NULL THEN
    SELECT marina_id INTO v_boat_marina FROM boats WHERE id = p_boat_id;
    IF v_boat_marina IS NULL OR v_boat_marina != p_marina_id THEN
      RAISE EXCEPTION 'Boat does not belong to marina';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM waitlist_entries
    WHERE marina_id = p_marina_id
      AND status = 'active'
      AND lower(guest_email) = lower(p_guest_email)
      AND boat_id IS NOT DISTINCT FROM p_boat_id
      AND tstzrange(desired_start_at, desired_end_at) && tstzrange(p_desired_start, p_desired_end)
  ) THEN
    RAISE EXCEPTION 'You are already on the waitlist for this time slot';
  END IF;

  INSERT INTO waitlist_entries (
    marina_id, boat_id, customer_id,
    guest_name, guest_email, guest_phone,
    desired_start_at, desired_end_at, guest_count
  ) VALUES (
    p_marina_id, p_boat_id, p_customer_id,
    p_guest_name, p_guest_email, p_guest_phone,
    p_desired_start, p_desired_end, p_guest_count
  ) RETURNING id INTO v_id;

  PERFORM write_audit_log_internal(
    p_marina_id, 'waitlist.joined', 'waitlist_entry',
    p_guest_name || ' joined waitlist', v_id,
    jsonb_build_object('boat_id', p_boat_id, 'start', p_desired_start, 'end', p_desired_end)
  );

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- match_waitlist_on_availability: use internal writer
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

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION match_waitlist_on_availability FROM PUBLIC;
GRANT EXECUTE ON FUNCTION match_waitlist_on_availability TO service_role;

-- App-layer write_audit_log delegates to internal after auth check
CREATE OR REPLACE FUNCTION write_audit_log(
  p_marina_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_summary TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_visibility audit_log_visibility DEFAULT 'staff',
  p_show_in_feed BOOLEAN DEFAULT true
) RETURNS UUID AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (p_marina_id = ANY(SELECT auth_user_marina_ids())) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN write_audit_log_internal(
    p_marina_id, p_action, p_entity_type, p_summary,
    p_entity_id, p_metadata, p_visibility, p_show_in_feed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION write_audit_log FROM PUBLIC;
GRANT EXECUTE ON FUNCTION write_audit_log TO authenticated, anon;
