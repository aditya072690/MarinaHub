-- Stripe payment idempotency: prevent duplicate ledger rows; release slots on expired checkout

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_tx_checkout_booking
  ON payment_transactions(booking_id)
  WHERE type = 'checkout' AND status = 'succeeded' AND booking_id IS NOT NULL;

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
DECLARE
  v_updated INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM payment_transactions WHERE stripe_event_id = p_stripe_event_id) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE id = p_booking_id
      AND marina_id = p_marina_id
      AND payment_status = 'paid'
  ) THEN
    RETURN true;
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

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN false;
  END IF;

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
EXCEPTION
  WHEN unique_violation THEN
    RETURN true;
END;
$$;
