-- Marina geo coordinates for maps and weather

ALTER TABLE marinas
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS display_hours JSONB;

ALTER TABLE marinas DROP CONSTRAINT IF EXISTS marinas_lat_range;
ALTER TABLE marinas ADD CONSTRAINT marinas_lat_range
  CHECK (lat IS NULL OR (lat >= -90 AND lat <= 90));

ALTER TABLE marinas DROP CONSTRAINT IF EXISTS marinas_lng_range;
ALTER TABLE marinas ADD CONSTRAINT marinas_lng_range
  CHECK (lng IS NULL OR (lng >= -180 AND lng <= 180));

-- Managers may update marina profile fields (contact, location)
CREATE POLICY "Managers update marina" ON marinas FOR UPDATE
  USING (auth_user_role(id) IN ('owner', 'manager'));

-- Demo coordinates (Lake Murray / Charleston / Table Rock Lake)
UPDATE marinas SET lat = 34.0397, lng = -81.1520 WHERE slug = 'state-park-marina';
UPDATE marinas SET lat = 32.7874, lng = -79.9400 WHERE slug = 'the-harbor';
UPDATE marinas SET lat = 36.6178, lng = -93.3040 WHERE slug = 'big-cedar-marina';
UPDATE marinas SET lat = 34.0054, lng = -81.1969 WHERE slug = 'lake-murray-marina';
