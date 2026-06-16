-- Allow anonymous/authenticated users to read active add-ons for checkout display
CREATE POLICY "Public read active addon catalog" ON addon_catalog FOR SELECT
  USING (is_active = true);
