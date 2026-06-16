import { ConsumerNav } from "@/components/consumer/consumer-nav";
import { createClient } from "@/lib/supabase/server";

interface ConsumerHeaderProps {
  variant?: "marketing" | "consumer";
}

export async function ConsumerHeader({ variant = "consumer" }: ConsumerHeaderProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { full_name: string | null; email: string } | null = null;
  let hasMarinaAccess = false;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();
    profile = data;

    const { count } = await supabase
      .from("marina_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    hasMarinaAccess = (count ?? 0) > 0;
  }

  return (
    <ConsumerNav
      variant={variant}
      user={
        user
          ? {
              email: profile?.email ?? user.email ?? "",
              fullName: profile?.full_name ?? null,
              hasMarinaAccess,
            }
          : null
      }
    />
  );
}
