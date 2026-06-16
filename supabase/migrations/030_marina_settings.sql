-- Marina operational settings (1:1 with marinas)

CREATE TYPE pricing_rule_type AS ENUM ('weekday', 'weekend', 'holiday', 'peak_season');
CREATE TYPE audit_log_visibility AS ENUM ('staff', 'owner_only');
CREATE TYPE waitlist_status AS ENUM ('active', 'notified', 'converted', 'expired', 'cancelled');
CREATE TYPE customer_segment AS ENUM ('first_time', 'returning', 'vip');

CREATE TABLE marina_settings (
  marina_id              UUID PRIMARY KEY REFERENCES marinas(id) ON DELETE CASCADE,
  business_hours         JSONB NOT NULL DEFAULT '{
    "mon": {"open": "08:00", "close": "18:00", "closed": false},
    "tue": {"open": "08:00", "close": "18:00", "closed": false},
    "wed": {"open": "08:00", "close": "18:00", "closed": false},
    "thu": {"open": "08:00", "close": "18:00", "closed": false},
    "fri": {"open": "08:00", "close": "18:00", "closed": false},
    "sat": {"open": "07:00", "close": "19:00", "closed": false},
    "sun": {"open": "07:00", "close": "19:00", "closed": false}
  }'::jsonb,
  booking_buffer_minutes   INT NOT NULL DEFAULT 30 CHECK (booking_buffer_minutes >= 0),
  cancellation_policy      JSONB NOT NULL DEFAULT '{
    "free_cancel_hours": 48,
    "partial_refund_hours": 24,
    "partial_refund_pct": 50,
    "policy_text": "Free cancellation up to 48 hours before your booking. 50% refund within 24 hours."
  }'::jsonb,
  tax_rate                 DECIMAL(5,4) NOT NULL DEFAULT 0.0825 CHECK (tax_rate >= 0),
  deposit_pct              DECIMAL(5,2) NOT NULL DEFAULT 25.00 CHECK (deposit_pct >= 0 AND deposit_pct <= 100),
  currency                 TEXT NOT NULL DEFAULT 'USD',
  timezone                 TEXT NOT NULL DEFAULT 'America/New_York',
  segmentation             JSONB NOT NULL DEFAULT '{"vip_min_bookings": 5, "vip_min_spend": 2500}'::jsonb,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by               UUID REFERENCES profiles(id)
);

ALTER TABLE marina_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY marina_settings_select ON marina_settings
  FOR SELECT USING (marina_id IN (SELECT auth_user_marina_ids()));

CREATE POLICY marina_settings_update ON marina_settings
  FOR UPDATE USING (auth_user_role(marina_id) = 'owner')
  WITH CHECK (auth_user_role(marina_id) = 'owner');

-- Backfill from existing marinas
INSERT INTO marina_settings (marina_id, timezone)
SELECT id, timezone FROM marinas
ON CONFLICT (marina_id) DO NOTHING;

-- Add metadata to customers for VIP manual override
ALTER TABLE customers ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
