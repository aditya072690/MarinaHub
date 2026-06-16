ALTER TABLE marinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marina_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Members read their marinas" ON marinas FOR SELECT
  USING (id IN (SELECT auth_user_marina_ids()));
CREATE POLICY "Public read active marinas" ON marinas FOR SELECT USING (is_active = true);
CREATE POLICY "Owners update marina" ON marinas FOR UPDATE USING (auth_user_role(id) = 'owner');
CREATE POLICY "Authenticated insert marina" ON marinas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members read team" ON marina_members FOR SELECT
  USING (marina_id IN (SELECT auth_user_marina_ids()));
CREATE POLICY "Owners manage team" ON marina_members FOR ALL
  USING (auth_user_role(marina_id) = 'owner');
CREATE POLICY "Users read own membership" ON marina_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own membership" ON marina_members FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members read boats" ON boats FOR SELECT
  USING (marina_id IN (SELECT auth_user_marina_ids()));
CREATE POLICY "Public read active boats" ON boats FOR SELECT USING (status = 'active');
CREATE POLICY "Owner Manager CRUD boats" ON boats FOR ALL
  USING (auth_user_role(marina_id) IN ('owner', 'manager'));

CREATE POLICY "Members read customers" ON customers FOR SELECT
  USING (marina_id IN (SELECT auth_user_marina_ids()));
CREATE POLICY "Members insert customers" ON customers FOR INSERT
  WITH CHECK (marina_id IN (SELECT auth_user_marina_ids()));
CREATE POLICY "Owner Manager update customers" ON customers FOR UPDATE
  USING (auth_user_role(marina_id) IN ('owner', 'manager'));

CREATE POLICY "Members read bookings" ON bookings FOR SELECT
  USING (marina_id IN (SELECT auth_user_marina_ids()));
CREATE POLICY "Owner Manager full booking CRUD" ON bookings FOR ALL
  USING (auth_user_role(marina_id) IN ('owner', 'manager'));
CREATE POLICY "Staff read bookings" ON bookings FOR SELECT
  USING (auth_user_role(marina_id) = 'staff');
CREATE POLICY "Staff insert bookings" ON bookings FOR INSERT
  WITH CHECK (auth_user_role(marina_id) = 'staff');
CREATE POLICY "Staff update bookings" ON bookings FOR UPDATE
  USING (auth_user_role(marina_id) = 'staff');

CREATE POLICY "Members read blocks" ON availability_blocks FOR SELECT
  USING (marina_id IN (SELECT auth_user_marina_ids()));
CREATE POLICY "Owner Manager manage blocks" ON availability_blocks FOR ALL
  USING (auth_user_role(marina_id) IN ('owner', 'manager'));

CREATE POLICY "Owners manage widget config" ON widget_configs FOR ALL
  USING (auth_user_role(marina_id) = 'owner');
