-- Dashboard performance indexes (Supabase migrations run in a transaction — no CONCURRENTLY)

CREATE INDEX IF NOT EXISTS idx_notifications_marina_created
  ON notifications (marina_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_marina_unread
  ON notifications (marina_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_bell_covering
  ON notifications (recipient_id, marina_id, created_at DESC)
  INCLUDE (id, type, title, body, read_at, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_marina_created
  ON audit_logs (marina_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_feed_visibility
  ON audit_logs (marina_id, created_at DESC)
  INCLUDE (id, action, summary, entity_type, entity_id, actor_id, actor_role, visibility)
  WHERE show_in_feed = true;

CREATE INDEX IF NOT EXISTS idx_bookings_marina_created
  ON bookings (marina_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_marina_status
  ON bookings (marina_id, status);

CREATE INDEX IF NOT EXISTS idx_dashboard_stats_live
  ON dashboard_stats (marina_id, updated_at DESC)
  WHERE period = 'live';

CREATE INDEX IF NOT EXISTS idx_bookings_marina_start_status
  ON bookings (marina_id, start_at ASC)
  WHERE status IN ('confirmed', 'pending');

-- Narrow activity feed RPC columns (avoid SELECT *)
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
