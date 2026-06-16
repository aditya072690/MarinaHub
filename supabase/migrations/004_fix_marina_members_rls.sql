-- P0: Close marina_members self-assign owner vulnerability

DROP POLICY IF EXISTS "Users insert own membership" ON marina_members;

-- Atomic marina creation + owner assignment (onboarding only)
CREATE OR REPLACE FUNCTION create_marina_with_owner(
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT 'America/New_York'
) RETURNS UUID AS $$
DECLARE
  v_marina_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO marinas (name, slug, description, city, state, contact_email, contact_phone, timezone)
  VALUES (p_name, p_slug, p_description, p_city, p_state, p_contact_email, p_contact_phone, p_timezone)
  RETURNING id INTO v_marina_id;

  INSERT INTO marina_members (marina_id, user_id, role)
  VALUES (v_marina_id, auth.uid(), 'owner');

  RETURN v_marina_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION create_marina_with_owner FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_marina_with_owner TO authenticated;
