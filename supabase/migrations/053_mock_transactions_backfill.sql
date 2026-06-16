-- Backfill mock_transactions from revenue-eligible bookings (demo / manual payments)

INSERT INTO mock_transactions (marina_id, booking_id, type, status, amount, description, created_at)
SELECT
  b.marina_id,
  b.id,
  'booking_charge',
  'completed',
  b.total_price,
  format('Booking charge for %s', b.id),
  COALESCE(b.paid_at, b.created_at)
FROM bookings b
WHERE b.status IN ('confirmed', 'checked_in', 'checked_out', 'completed')
  AND NOT EXISTS (
    SELECT 1 FROM mock_transactions mt
    WHERE mt.booking_id = b.id AND mt.type = 'booking_charge'
  );

-- Re-seed mock charges when new bookings are inserted (idempotent)
CREATE OR REPLACE FUNCTION seed_mock_booking_charge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('confirmed', 'checked_in', 'checked_out', 'completed')
     AND NOT EXISTS (
       SELECT 1 FROM mock_transactions mt
       WHERE mt.booking_id = NEW.id AND mt.type = 'booking_charge'
     ) THEN
    INSERT INTO mock_transactions (marina_id, booking_id, type, status, amount, description, created_at)
    VALUES (
      NEW.marina_id,
      NEW.id,
      'booking_charge',
      'completed',
      NEW.total_price,
      format('Booking charge for %s', NEW.id),
      COALESCE(NEW.paid_at, NEW.created_at)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
