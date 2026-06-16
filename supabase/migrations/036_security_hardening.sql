-- Harden SECURITY DEFINER RPCs against cross-marina abuse

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
  -- Authenticated callers must be members; NULL auth.uid() allowed for anon/system RPC paths
  IF auth.uid() IS NOT NULL AND NOT (p_marina_id = ANY(SELECT auth_user_marina_ids())) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

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
GRANT EXECUTE ON FUNCTION write_audit_log TO authenticated, anon;

-- Only callable from triggers / service role (revoke direct authenticated abuse)
REVOKE ALL ON FUNCTION match_waitlist_on_availability FROM authenticated;
GRANT EXECUTE ON FUNCTION match_waitlist_on_availability TO service_role;

-- Validate boat belongs to marina + prevent duplicate active waitlist entries
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

  PERFORM write_audit_log(
    p_marina_id, 'waitlist.joined', 'waitlist_entry',
    p_guest_name || ' joined waitlist', v_id,
    jsonb_build_object('boat_id', p_boat_id, 'start', p_desired_start, 'end', p_desired_end)
  );

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Pricing rules: enforce boat marina match on write
DROP POLICY IF EXISTS pricing_rules_write ON pricing_rules;
CREATE POLICY pricing_rules_write ON pricing_rules
  FOR ALL USING (auth_user_role(marina_id) IN ('owner', 'manager'))
  WITH CHECK (
    auth_user_role(marina_id) IN ('owner', 'manager')
    AND (
      boat_id IS NULL
      OR boat_id IN (SELECT id FROM boats WHERE marina_id = pricing_rules.marina_id)
    )
  );
