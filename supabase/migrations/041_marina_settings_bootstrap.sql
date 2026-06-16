-- Auto-create marina_settings when a marina is inserted; backfill any missing rows
-- Defaults: Indian timezone (IST), INR currency, 18% GST

CREATE OR REPLACE FUNCTION ensure_marina_settings_row()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO marina_settings (
    marina_id,
    timezone,
    currency,
    tax_rate,
    deposit_pct,
    segmentation
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.timezone, 'Asia/Kolkata'),
    'INR',
    0.18,
    25.00,
    '{"vip_min_bookings": 5, "vip_min_spend": 50000}'::jsonb
  )
  ON CONFLICT (marina_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_ensure_marina_settings ON marinas;
CREATE TRIGGER trg_ensure_marina_settings
  AFTER INSERT ON marinas
  FOR EACH ROW EXECUTE FUNCTION ensure_marina_settings_row();

INSERT INTO marina_settings (
  marina_id,
  timezone,
  currency,
  tax_rate,
  deposit_pct,
  segmentation
)
SELECT
  id,
  COALESCE(timezone, 'Asia/Kolkata'),
  'INR',
  0.18,
  25.00,
  '{"vip_min_bookings": 5, "vip_min_spend": 50000}'::jsonb
FROM marinas
ON CONFLICT (marina_id) DO NOTHING;
