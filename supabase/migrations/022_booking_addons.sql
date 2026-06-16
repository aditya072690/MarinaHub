CREATE TABLE addon_catalog (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marina_id     UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (marina_id, slug)
);

CREATE TABLE booking_addons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  marina_id     UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  addon_id      UUID NOT NULL REFERENCES addon_catalog(id),
  quantity      INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price    NUMERIC(10,2) NOT NULL,
  total_price   NUMERIC(10,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_addons_booking ON booking_addons(booking_id);
CREATE INDEX idx_addon_catalog_marina ON addon_catalog(marina_id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS addons_total NUMERIC(10,2) NOT NULL DEFAULT 0;

UPDATE bookings SET base_price = total_price WHERE base_price IS NULL;

CREATE TRIGGER addon_catalog_updated_at
  BEFORE UPDATE ON addon_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE addon_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read addon catalog" ON addon_catalog FOR SELECT
  USING (marina_id IN (SELECT auth_user_marina_ids()));

CREATE POLICY "Owners and managers manage addon catalog" ON addon_catalog FOR ALL
  USING (
    marina_id IN (SELECT auth_user_marina_ids())
    AND auth_user_role(marina_id) IN ('owner', 'manager')
  )
  WITH CHECK (
    marina_id IN (SELECT auth_user_marina_ids())
    AND auth_user_role(marina_id) IN ('owner', 'manager')
  );

CREATE POLICY "Members read booking addons" ON booking_addons FOR SELECT
  USING (marina_id IN (SELECT auth_user_marina_ids()));

CREATE POLICY "Consumers read own booking addons" ON booking_addons FOR SELECT
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE c.user_id = auth.uid()
         OR c.email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Members insert booking addons" ON booking_addons FOR INSERT
  WITH CHECK (marina_id IN (SELECT auth_user_marina_ids()));
