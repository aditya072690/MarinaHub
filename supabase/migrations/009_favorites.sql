CREATE TABLE favorites (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boat_id    UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  marina_id  UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, boat_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_boat ON favorites(boat_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own favorites" ON favorites FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own favorites" ON favorites FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM boats b WHERE b.id = boat_id AND b.status = 'active')
  );
CREATE POLICY "Users delete own favorites" ON favorites FOR DELETE USING (user_id = auth.uid());
