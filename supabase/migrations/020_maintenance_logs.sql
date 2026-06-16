CREATE TYPE maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TABLE maintenance_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marina_id     UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  boat_id       UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  status        maintenance_status NOT NULL DEFAULT 'scheduled',
  scheduled_at  TIMESTAMPTZ NOT NULL,
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_logs_marina ON maintenance_logs(marina_id);
CREATE INDEX idx_maintenance_logs_boat ON maintenance_logs(boat_id);

CREATE TRIGGER maintenance_logs_updated_at
  BEFORE UPDATE ON maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read maintenance logs" ON maintenance_logs FOR SELECT
  USING (marina_id IN (SELECT auth_user_marina_ids()));

CREATE POLICY "Owners and managers manage maintenance logs" ON maintenance_logs FOR ALL
  USING (
    marina_id IN (SELECT auth_user_marina_ids())
    AND auth_user_role(marina_id) IN ('owner', 'manager')
  )
  WITH CHECK (
    marina_id IN (SELECT auth_user_marina_ids())
    AND auth_user_role(marina_id) IN ('owner', 'manager')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_logs;
