-- Fix get_marina_activity_feed return type mismatch from 054 (enum columns vs TEXT).
-- Use SETOF audit_logs with an explicit column list (not SELECT *).

DROP FUNCTION IF EXISTS get_marina_activity_feed(UUID, INT, TIMESTAMPTZ);

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
  SELECT
    al.id,
    al.marina_id,
    al.actor_id,
    al.actor_role,
    al.action,
    al.entity_type,
    al.entity_id,
    al.summary,
    al.metadata,
    al.visibility,
    al.show_in_feed,
    al.created_at
  FROM audit_logs al
  WHERE al.marina_id = p_marina_id
    AND al.show_in_feed = true
    AND (
      al.visibility = 'staff'
      OR auth_user_role(p_marina_id) = 'owner'
    )
    AND (p_cursor IS NULL OR al.created_at < p_cursor)
  ORDER BY al.created_at DESC
  LIMIT LEAST(p_limit, 100);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_marina_activity_feed FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_marina_activity_feed TO authenticated;
