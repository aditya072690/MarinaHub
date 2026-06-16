-- Audit logs and activity feed

CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marina_id    UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  actor_id     UUID REFERENCES profiles(id),
  actor_role   user_role,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    UUID,
  summary      TEXT NOT NULL,
  metadata     JSONB NOT NULL DEFAULT '{}',
  visibility   audit_log_visibility NOT NULL DEFAULT 'staff',
  show_in_feed BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_marina_created ON audit_logs(marina_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(marina_id, entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(marina_id, action);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING (
    marina_id IN (SELECT auth_user_marina_ids())
    AND (
      visibility = 'staff'
      OR auth_user_role(marina_id) = 'owner'
    )
  );

-- Write helper (no direct client INSERT)
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
DECLARE
  v_id UUID;
  v_role user_role;
BEGIN
  v_role := auth_user_role(p_marina_id);

  INSERT INTO audit_logs (
    marina_id, actor_id, actor_role, action, entity_type, entity_id,
    summary, metadata, visibility, show_in_feed
  ) VALUES (
    p_marina_id, auth.uid(), v_role, p_action, p_entity_type, p_entity_id,
    p_summary, p_metadata, p_visibility, p_show_in_feed
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION write_audit_log FROM PUBLIC;
GRANT EXECUTE ON FUNCTION write_audit_log TO authenticated;

-- Activity feed RPC
CREATE OR REPLACE FUNCTION get_marina_activity_feed(
  p_marina_id UUID,
  p_limit INT DEFAULT 50,
  p_cursor TIMESTAMPTZ DEFAULT NULL
) RETURNS SETOF audit_logs AS $$
BEGIN
  IF NOT (p_marina_id = ANY(SELECT auth_user_marina_ids())) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT * FROM audit_logs
  WHERE marina_id = p_marina_id
    AND show_in_feed = true
    AND (
      visibility = 'staff'
      OR auth_user_role(p_marina_id) = 'owner'
    )
    AND (p_cursor IS NULL OR created_at < p_cursor)
  ORDER BY created_at DESC
  LIMIT LEAST(p_limit, 100);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_marina_activity_feed FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_marina_activity_feed TO authenticated;

-- Boat audit triggers
CREATE OR REPLACE FUNCTION audit_boat_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM write_audit_log(
      NEW.marina_id, 'boat.added', 'boat',
      'Added boat ' || NEW.name, NEW.id,
      jsonb_build_object('name', NEW.name, 'hourly_rate', NEW.hourly_rate)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM write_audit_log(
      NEW.marina_id, 'boat.updated', 'boat',
      'Updated boat ' || NEW.name, NEW.id,
      jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM write_audit_log(
      OLD.marina_id, 'boat.deleted', 'boat',
      'Removed boat ' || OLD.name, OLD.id,
      jsonb_build_object('name', OLD.name)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_boats
  AFTER INSERT OR UPDATE OR DELETE ON boats
  FOR EACH ROW EXECUTE FUNCTION audit_boat_changes();

-- Pricing rule audit triggers
CREATE OR REPLACE FUNCTION audit_pricing_rule_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM write_audit_log(
      NEW.marina_id, 'pricing_rule.created', 'pricing_rule',
      'Created ' || NEW.rule_type || ' pricing rule', NEW.id,
      jsonb_build_object('rule_type', NEW.rule_type, 'boat_id', NEW.boat_id)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM write_audit_log(
      NEW.marina_id, 'pricing_rule.updated', 'pricing_rule',
      'Updated ' || NEW.rule_type || ' pricing rule', NEW.id,
      jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM write_audit_log(
      OLD.marina_id, 'pricing_rule.deleted', 'pricing_rule',
      'Deleted ' || OLD.rule_type || ' pricing rule', OLD.id,
      jsonb_build_object('rule_type', OLD.rule_type)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_pricing_rules
  AFTER INSERT OR UPDATE OR DELETE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION audit_pricing_rule_changes();

-- Availability block audit
CREATE OR REPLACE FUNCTION audit_block_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_title := COALESCE(NEW.title, NEW.reason::TEXT);
    PERFORM write_audit_log(
      NEW.marina_id, 'block.created', 'availability_block',
      'Created availability block: ' || v_title, NEW.id,
      jsonb_build_object('reason', NEW.reason, 'start_at', NEW.start_at, 'end_at', NEW.end_at)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_title := COALESCE(OLD.title, OLD.reason::TEXT);
    PERFORM write_audit_log(
      OLD.marina_id, 'block.deleted', 'availability_block',
      'Removed availability block: ' || v_title, OLD.id,
      jsonb_build_object('reason', OLD.reason)
    );
    PERFORM match_waitlist_on_availability(OLD.boat_id, OLD.start_at, OLD.end_at, OLD.marina_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Block trigger created after waitlist migration; placeholder function first
CREATE OR REPLACE FUNCTION match_waitlist_on_availability(
  p_boat_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_marina_id UUID DEFAULT NULL
) RETURNS INT AS $$
BEGIN
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_blocks
  AFTER INSERT OR DELETE ON availability_blocks
  FOR EACH ROW EXECUTE FUNCTION audit_block_changes();

-- Booking status audit (extends existing status history)
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
    PERFORM write_audit_log(
      NEW.marina_id, 'booking.created', 'booking',
      COALESCE(v_customer_name, 'Guest') || ' booked ' || COALESCE(v_boat_name, 'a boat'),
      NEW.id,
      jsonb_build_object('status', NEW.status, 'start_at', NEW.start_at, 'total_price', NEW.total_price)
    );
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

    PERFORM write_audit_log(
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

CREATE TRIGGER trg_audit_booking_status
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION audit_booking_status_change();

-- Enable realtime for audit_logs (ignore if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
