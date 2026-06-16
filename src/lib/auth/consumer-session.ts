import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireConsumerSession(redirectTo = "/account/login") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${redirectTo}?redirect=/account`);
  }

  return user;
}

export async function getConsumerProfile() {
  const supabase = await createClient();
  const [{ data: { user } }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("id, full_name, email, phone, last_booking_at, total_bookings, total_spent, created_at").eq("id", (await supabase.auth.getSession()).data.session?.user.id ?? "").single(),
  ]);

  if (!user) return null;

  return profile;
}

export async function linkCustomerRecords(
  userId: string,
  email: string
): Promise<{ linked: number; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("link_customers_for_user", {
    p_user_id: userId,
    p_email: email,
  });

  if (error) {
    return { linked: 0, error: error.message };
  }

  return { linked: typeof data === "number" ? data : 0 };
}
