-- Step 1: Add enum values only (must commit before use — see 019_booking_status_checkin_apply.sql)

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'checked_in' AFTER 'confirmed';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'checked_out' AFTER 'checked_in';

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'booking_checked_in';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'booking_checked_out';
