-- Verify performance indexes from migrations 050 + 054.
-- Run in Supabase SQL editor after applying migrations.

SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('notifications', 'audit_logs', 'bookings', 'dashboard_stats')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Notifications bell: expect Index Scan on unread count
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*)
FROM notifications
WHERE recipient_id = '00000000-0000-4000-8000-000000000001'::uuid
  AND marina_id = '00000000-0000-4000-8000-000000000002'::uuid
  AND read_at IS NULL;

-- Notifications list: expect Index Scan on recipient/marina/created_at
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, type, title, body, read_at, created_at, marina_id, entity_type, entity_id
FROM notifications
WHERE recipient_id = '00000000-0000-4000-8000-000000000001'::uuid
  AND marina_id = '00000000-0000-4000-8000-000000000002'::uuid
ORDER BY created_at DESC
LIMIT 10;

-- Activity feed source query pattern
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, marina_id, actor_id, actor_role, action, entity_type, entity_id, summary, metadata, visibility, show_in_feed, created_at
FROM audit_logs
WHERE marina_id = '00000000-0000-4000-8000-000000000002'::uuid
  AND show_in_feed = true
ORDER BY created_at DESC
LIMIT 10;
