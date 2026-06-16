-- Stripe Connect Express: payment status on bookings, payment_transactions ledger

CREATE TYPE payment_status AS ENUM ('unpaid', 'pending', 'paid', 'failed', 'refunded');

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status payment_status NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_stripe_session
  ON bookings(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
  ON bookings(marina_id, payment_status);

-- Backfill existing confirmed bookings as paid (pre-Stripe demo data)
UPDATE bookings
SET payment_status = 'paid', paid_at = COALESCE(paid_at, created_at)
WHERE status IN ('confirmed', 'checked_in', 'checked_out', 'completed')
  AND payment_status = 'unpaid';

ALTER TABLE marina_payment_accounts
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE payment_transaction_type AS ENUM (
  'checkout', 'refund', 'payout', 'platform_fee', 'adjustment'
);

CREATE TYPE payment_transaction_status AS ENUM ('pending', 'succeeded', 'failed');

CREATE TABLE payment_transactions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marina_id                UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  booking_id               UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type                     payment_transaction_type NOT NULL,
  status                   payment_transaction_status NOT NULL DEFAULT 'pending',
  amount_cents             INTEGER NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'usd',
  platform_fee_cents       INTEGER NOT NULL DEFAULT 0,
  stripe_session_id        TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id         TEXT,
  stripe_payout_id         TEXT,
  stripe_event_id          TEXT UNIQUE,
  description              TEXT,
  metadata                 JSONB NOT NULL DEFAULT '{}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_tx_marina ON payment_transactions(marina_id, created_at DESC);
CREATE INDEX idx_payment_tx_booking ON payment_transactions(booking_id);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read payment transactions" ON payment_transactions FOR SELECT
  USING (
    marina_id IN (SELECT auth_user_marina_ids())
    AND auth_user_role(marina_id) = 'owner'
  );

-- Remove mock auto-charge trigger (real payments via webhook)
DROP TRIGGER IF EXISTS bookings_seed_mock_charge ON bookings;
DROP FUNCTION IF EXISTS seed_mock_booking_charge();

CREATE OR REPLACE FUNCTION confirm_booking_payment(
  p_booking_id UUID,
  p_marina_id UUID,
  p_session_id TEXT,
  p_payment_intent_id TEXT,
  p_amount_cents INTEGER,
  p_platform_fee_cents INTEGER,
  p_stripe_event_id TEXT,
  p_stripe_charge_id TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM payment_transactions WHERE stripe_event_id = p_stripe_event_id) THEN
    RETURN false;
  END IF;

  UPDATE bookings
  SET status = 'confirmed',
      payment_status = 'paid',
      stripe_session_id = COALESCE(stripe_session_id, p_session_id),
      stripe_payment_intent_id = p_payment_intent_id,
      paid_at = now()
  WHERE id = p_booking_id
    AND marina_id = p_marina_id
    AND payment_status IN ('unpaid', 'pending');

  INSERT INTO payment_transactions (
    marina_id, booking_id, type, status,
    amount_cents, platform_fee_cents,
    stripe_session_id, stripe_payment_intent_id, stripe_charge_id,
    stripe_event_id, description
  ) VALUES (
    p_marina_id, p_booking_id, 'checkout', 'succeeded',
    p_amount_cents, p_platform_fee_cents,
    p_session_id, p_payment_intent_id, p_stripe_charge_id,
    p_stripe_event_id,
    format('Booking payment %s', LEFT(p_booking_id::text, 8))
  );

  RETURN true;
END;
$$;
