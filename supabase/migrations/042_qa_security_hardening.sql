-- QA security hardening: revoke anon access to SECURITY DEFINER RPCs
-- Server routes use service_role / authenticated clients only.

REVOKE EXECUTE ON FUNCTION write_audit_log FROM anon;
REVOKE EXECUTE ON FUNCTION resolve_booking_price FROM anon;
REVOKE EXECUTE ON FUNCTION suggest_alternative_boats FROM anon;

-- Ensure authenticated staff retain access where needed
GRANT EXECUTE ON FUNCTION resolve_booking_price TO authenticated;
GRANT EXECUTE ON FUNCTION suggest_alternative_boats TO authenticated;
GRANT EXECUTE ON FUNCTION write_audit_log TO authenticated;
