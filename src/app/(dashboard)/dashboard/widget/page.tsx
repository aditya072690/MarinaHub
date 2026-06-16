import { WidgetConfigPanel } from "@/components/dashboard/widget-config";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function WidgetPage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");
  if (session.activeRole !== "owner") redirect("/dashboard");

  const supabase = await createClient();
  const { data: config } = await supabase
    .from("widget_configs")
    .select("*")
    .eq("marina_id", session.activeMarina.id)
    .maybeSingle();

  return (
    <WidgetConfigPanel
      marina={session.activeMarina}
      config={config}
    />
  );
}
