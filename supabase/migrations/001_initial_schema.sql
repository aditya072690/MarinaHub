-- MarinaHub Initial Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

CREATE TYPE user_role AS ENUM ('owner', 'manager', 'staff');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE block_reason AS ENUM ('maintenance', 'owner_hold', 'weather', 'manual', 'other');
CREATE TYPE boat_status AS ENUM ('active', 'inactive', 'maintenance');

CREATE TABLE marinas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  zip           TEXT,
  country       TEXT DEFAULT 'US',
  timezone      TEXT NOT NULL DEFAULT 'America/New_York',
  logo_url      TEXT,
  primary_color TEXT DEFAULT '#0ea5e9',
  contact_email TEXT,
  contact_phone TEXT,
  settings      JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marinas_slug ON marinas(slug) WHERE is_active = true;

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE marina_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marina_id     UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'staff',
  invited_by    UUID REFERENCES profiles(id),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (marina_id, user_id)
);

CREATE INDEX idx_marina_members_user ON marina_members(user_id);
CREATE INDEX idx_marina_members_marina ON marina_members(marina_id);

CREATE TABLE boats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marina_id       UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  boat_type       TEXT,
  capacity        INT NOT NULL DEFAULT 6,
  hourly_rate     DECIMAL(10,2) NOT NULL,
  daily_rate      DECIMAL(10,2),
  status          boat_status NOT NULL DEFAULT 'active',
  image_urls      TEXT[] DEFAULT '{}',
  amenities       TEXT[] DEFAULT '{}',
  min_booking_hours INT NOT NULL DEFAULT 2,
  sort_order      INT NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_boats_marina ON boats(marina_id);
CREATE INDEX idx_boats_marina_status ON boats(marina_id, status) WHERE status = 'active';

CREATE TABLE customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marina_id     UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (marina_id, email)
);

CREATE INDEX idx_customers_marina_email ON customers(marina_id, email);

CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marina_id       UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  boat_id         UUID NOT NULL REFERENCES boats(id) ON DELETE RESTRICT,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status          booking_status NOT NULL DEFAULT 'pending',
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  total_price     DECIMAL(10,2) NOT NULL,
  deposit_amount  DECIMAL(10,2) DEFAULT 0,
  guest_count     INT NOT NULL DEFAULT 1,
  notes           TEXT,
  source          TEXT NOT NULL DEFAULT 'dashboard',
  created_by      UUID REFERENCES profiles(id),
  cancelled_at    TIMESTAMPTZ,
  cancelled_by    UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookings_time_valid CHECK (end_at > start_at)
);

CREATE INDEX idx_bookings_boat_time ON bookings(boat_id, start_at, end_at)
  WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_bookings_marina_date ON bookings(marina_id, start_at);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(marina_id, status);

ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    boat_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  ) WHERE (status IN ('pending', 'confirmed'));

CREATE TABLE availability_blocks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marina_id     UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  boat_id       UUID REFERENCES boats(id) ON DELETE CASCADE,
  reason        block_reason NOT NULL DEFAULT 'manual',
  start_at      TIMESTAMPTZ NOT NULL,
  end_at        TIMESTAMPTZ NOT NULL,
  notes         TEXT,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT blocks_time_valid CHECK (end_at > start_at)
);

CREATE INDEX idx_blocks_boat_time ON availability_blocks(boat_id, start_at, end_at)
  WHERE boat_id IS NOT NULL;
CREATE INDEX idx_blocks_marina_time ON availability_blocks(marina_id, start_at, end_at);

ALTER TABLE availability_blocks ADD CONSTRAINT blocks_no_overlap_boat
  EXCLUDE USING gist (
    boat_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  ) WHERE (boat_id IS NOT NULL);

CREATE TABLE widget_configs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marina_id     UUID NOT NULL UNIQUE REFERENCES marinas(id) ON DELETE CASCADE,
  allowed_origins TEXT[] DEFAULT '{}',
  theme         JSONB NOT NULL DEFAULT '{}',
  is_enabled    BOOLEAN NOT NULL DEFAULT true,
  api_key_hash  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth_user_marina_ids()
RETURNS SETOF UUID AS $$
  SELECT marina_id FROM marina_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_user_role(p_marina_id UUID)
RETURNS user_role AS $$
  SELECT role FROM marina_members
  WHERE user_id = auth.uid() AND marina_id = p_marina_id
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_boat_available(
  p_boat_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE boat_id = p_boat_id
      AND status IN ('pending', 'confirmed')
      AND id IS DISTINCT FROM p_exclude_booking_id
      AND tstzrange(start_at, end_at) && tstzrange(p_start, p_end)
  ) AND NOT EXISTS (
    SELECT 1 FROM availability_blocks
    WHERE (boat_id = p_boat_id OR boat_id IS NULL)
      AND marina_id = (SELECT marina_id FROM boats WHERE id = p_boat_id)
      AND tstzrange(start_at, end_at) && tstzrange(p_start, p_end)
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marinas_updated_at BEFORE UPDATE ON marinas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER boats_updated_at BEFORE UPDATE ON boats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
