-- Role reference metadata (marina_members.role remains source of truth)
CREATE TABLE roles (
  id            TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  description   TEXT,
  permissions   JSONB NOT NULL DEFAULT '{}',
  sort_order    INT NOT NULL DEFAULT 0
);

INSERT INTO roles (id, display_name, description, permissions, sort_order) VALUES
(
  'owner',
  'Owner',
  'Full marina access including team, settings, and widget',
  '{
    "dashboard:view": true,
    "bookings:read": true,
    "bookings:create": true,
    "bookings:confirm": true,
    "bookings:cancel": true,
    "bookings:complete": true,
    "bookings:checkin": true,
    "boats:write": true,
    "blocks:write": true,
    "customers:write": true,
    "analytics:view": true,
    "team:manage": true,
    "settings:manage": true,
    "widget:manage": true,
    "onboarding:write": true,
    "email_templates:view": true
  }'::jsonb,
  1
),
(
  'manager',
  'Manager',
  'Manage boats, bookings, availability, and customers',
  '{
    "dashboard:view": true,
    "bookings:read": true,
    "bookings:create": true,
    "bookings:confirm": true,
    "bookings:cancel": true,
    "bookings:complete": true,
    "bookings:checkin": true,
    "boats:write": true,
    "blocks:write": true,
    "customers:write": true,
    "analytics:view": true,
    "email_templates:view": true
  }'::jsonb,
  2
),
(
  'staff',
  'Staff',
  'View bookings, create pending bookings, check-in and check-out guests',
  '{
    "dashboard:view": true,
    "bookings:read": true,
    "bookings:create": true,
    "bookings:complete": true,
    "bookings:checkin": true,
    "customers:read": true
  }'::jsonb,
  3
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read roles" ON roles FOR SELECT TO authenticated USING (true);
