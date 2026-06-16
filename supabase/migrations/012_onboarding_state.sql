CREATE TYPE onboarding_step AS ENUM (
  'marina_details',
  'add_boats',
  'set_availability',
  'launch_widget'
);

CREATE TABLE onboarding_state (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marina_id        UUID NOT NULL UNIQUE REFERENCES marinas(id) ON DELETE CASCADE,
  current_step     onboarding_step NOT NULL DEFAULT 'marina_details',
  completed_steps  onboarding_step[] NOT NULL DEFAULT '{}',
  step_data        JSONB NOT NULL DEFAULT '{}',
  is_complete      BOOLEAN NOT NULL DEFAULT false,
  completed_at     TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read onboarding state" ON onboarding_state FOR SELECT
  USING (marina_id IN (SELECT auth_user_marina_ids()));
CREATE POLICY "Owners manage onboarding state" ON onboarding_state FOR ALL
  USING (auth_user_role(marina_id) = 'owner');

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

  INSERT INTO onboarding_state (marina_id, current_step)
  VALUES (v_marina_id, 'marina_details');

  RETURN v_marina_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION create_marina_with_owner FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_marina_with_owner TO authenticated;
