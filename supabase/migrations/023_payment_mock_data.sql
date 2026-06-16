CREATE TYPE stripe_connect_status AS ENUM ('not_connected', 'pending', 'connected', 'restricted');
CREATE TYPE mock_transaction_type AS ENUM ('booking_charge', 'payout', 'refund', 'platform_fee');
CREATE TYPE mock_transaction_status AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE marina_payment_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marina_id           UUID NOT NULL UNIQUE REFERENCES marinas(id) ON DELETE CASCADE,
  stripe_status       stripe_connect_status NOT NULL DEFAULT 'not_connected',
  stripe_account_id   TEXT,
  platform_fee_pct    NUMERIC(5,4) NOT NULL DEFAULT 0.0300,
  connected_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mock_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marina_id       UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type            mock_transaction_type NOT NULL,
  status          mock_transaction_status NOT NULL DEFAULT 'completed',
  amount          NUMERIC(10,2) NOT NULL,
  description     TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mock_transactions_marina ON mock_transactions(marina_id, created_at DESC);

CREATE TRIGGER marina_payment_accounts_updated_at
  BEFORE UPDATE ON marina_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE marina_payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read payment accounts" ON marina_payment_accounts FOR SELECT
  USING (
    marina_id IN (SELECT auth_user_marina_ids())
    AND auth_user_role(marina_id) = 'owner'
  );

CREATE POLICY "Owners manage payment accounts" ON marina_payment_accounts FOR ALL
  USING (
    marina_id IN (SELECT auth_user_marina_ids())
    AND auth_user_role(marina_id) = 'owner'
  )
  WITH CHECK (
    marina_id IN (SELECT auth_user_marina_ids())
    AND auth_user_role(marina_id) = 'owner'
  );

CREATE POLICY "Owners read mock transactions" ON mock_transactions FOR SELECT
  USING (
    marina_id IN (SELECT auth_user_marina_ids())
    AND auth_user_role(marina_id) = 'owner'
  );

CREATE POLICY "Owners insert mock transactions" ON mock_transactions FOR INSERT
  WITH CHECK (
    marina_id IN (SELECT auth_user_marina_ids())
    AND auth_user_role(marina_id) = 'owner'
  );

CREATE OR REPLACE FUNCTION seed_mock_booking_charge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('confirmed', 'checked_in', 'checked_out', 'completed') THEN
    INSERT INTO mock_transactions (marina_id, booking_id, type, status, amount, description)
    VALUES (
      NEW.marina_id,
      NEW.id,
      'booking_charge',
      'completed',
      NEW.total_price,
      format('Booking charge for %s', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER bookings_seed_mock_charge
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION seed_mock_booking_charge();

-- Backfill payment accounts for existing marinas
INSERT INTO marina_payment_accounts (marina_id)
SELECT id FROM marinas
ON CONFLICT (marina_id) DO NOTHING;

-- Backfill mock charges from existing confirmed+ bookings
INSERT INTO mock_transactions (marina_id, booking_id, type, status, amount, description, created_at)
SELECT
  b.marina_id,
  b.id,
  'booking_charge',
  'completed',
  b.total_price,
  format('Booking charge for %s', b.id),
  b.created_at
FROM bookings b
WHERE b.status IN ('confirmed', 'checked_in', 'checked_out', 'completed')
  AND NOT EXISTS (
    SELECT 1 FROM mock_transactions mt
    WHERE mt.booking_id = b.id AND mt.type = 'booking_charge'
  );
