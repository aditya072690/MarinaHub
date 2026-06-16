-- Allow marina teammates to read each other's profiles (team page, notifications)

CREATE POLICY "Marina members read teammate profiles" ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM marina_members mm_self
    JOIN marina_members mm_other ON mm_self.marina_id = mm_other.marina_id
    WHERE mm_self.user_id = auth.uid()
      AND mm_other.user_id = profiles.id
  )
);
