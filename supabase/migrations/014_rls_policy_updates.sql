-- Backfill customer stats for existing data
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT customer_id FROM bookings LOOP
    PERFORM refresh_customer_stats(r.customer_id);
  END LOOP;
END $$;

-- Backfill onboarding_state for existing marinas without one
INSERT INTO onboarding_state (marina_id, current_step, is_complete, completed_at)
SELECT m.id, 'launch_widget', true, now()
FROM marinas m
WHERE NOT EXISTS (SELECT 1 FROM onboarding_state os WHERE os.marina_id = m.id);
