-- Default platform currency to INR (Indian Rupees)

UPDATE marina_settings SET currency = 'INR' WHERE currency = 'USD';

ALTER TABLE marina_settings ALTER COLUMN currency SET DEFAULT 'INR';

UPDATE payment_transactions SET currency = 'inr' WHERE currency = 'usd';

ALTER TABLE payment_transactions ALTER COLUMN currency SET DEFAULT 'inr';
