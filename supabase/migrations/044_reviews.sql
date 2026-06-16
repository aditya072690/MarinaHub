-- Reviews & ratings

CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boat_id     UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  marina_id   UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT CHECK (comment IS NULL OR char_length(comment) <= 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reviews_boat_created_idx ON reviews (boat_id, created_at DESC);
CREATE INDEX reviews_marina_created_idx ON reviews (marina_id, created_at DESC);
CREATE INDEX reviews_user_idx ON reviews (user_id);

CREATE OR REPLACE FUNCTION validate_review_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_customer customers%ROWTYPE;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = NEW.booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status <> 'completed' THEN
    RAISE EXCEPTION 'Reviews are only allowed for completed bookings';
  END IF;

  IF v_booking.boat_id <> NEW.boat_id THEN
    RAISE EXCEPTION 'Review boat does not match booking';
  END IF;

  IF v_booking.marina_id <> NEW.marina_id THEN
    RAISE EXCEPTION 'Review marina does not match booking';
  END IF;

  SELECT * INTO v_customer FROM customers WHERE id = v_booking.customer_id;
  IF NOT FOUND OR v_customer.user_id IS NULL OR v_customer.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'Only the booking customer may submit a review';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM boats b
    WHERE b.id = NEW.boat_id AND b.marina_id = NEW.marina_id
  ) THEN
    RAISE EXCEPTION 'Boat does not belong to marina';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_validate_eligibility
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION validate_review_eligibility();

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE VIEW boat_rating_stats AS
SELECT
  boat_id,
  marina_id,
  COUNT(*)::INT AS review_count,
  ROUND(AVG(rating)::NUMERIC, 1) AS avg_rating
FROM reviews
GROUP BY boat_id, marina_id;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY reviews_public_read ON reviews
  FOR SELECT USING (true);

CREATE POLICY reviews_insert_own ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY reviews_update_own ON reviews
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY reviews_delete_own ON reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Allow reading reviewer display names on public review cards
CREATE POLICY "Public read reviewer profile names" ON profiles FOR SELECT
  USING (id IN (SELECT user_id FROM reviews));
