-- Missing Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session ON bookings(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_payment_intent ON bookings(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_marina_payment_accounts_stripe_account ON marina_payment_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_event ON payment_transactions(stripe_event_id);

-- Composite/Partial Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_marina_status ON bookings(marina_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_marina_created_desc ON bookings(marina_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_boat_created_desc ON reviews(boat_id, created_at DESC);

-- Partial indexes
CREATE INDEX IF NOT EXISTS idx_bookings_active ON bookings(marina_id) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id) WHERE read_at IS NULL;
