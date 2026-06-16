import { getPublicAddonCatalog } from "@/actions/addons";
import { WidgetEmbedClient } from "@/components/widget/widget-embed-client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Boat, Marina } from "@/types/database";
import { notFound } from "next/navigation";

export default async function WidgetEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ marinaId: string }>;
  searchParams: Promise<{ confirmed?: string; preview?: string; session_id?: string }>;
}) {
  const { marinaId } = await params;
  const { confirmed, preview } = await searchParams;
  const previewMode = preview === "1";

  const admin = createAdminClient();

  const { data: marinaData } = await admin
    .from("marinas")
    .select("*")
    .eq("id", marinaId)
    .eq("is_active", true)
    .single();

  if (!marinaData) notFound();
  const marina = marinaData as Marina;

  const { data: boatsData } = await admin
    .from("boats")
    .select("*")
    .eq("marina_id", marinaId)
    .eq("status", "active")
    .order("sort_order");

  const { data: widgetConfig } = await admin
    .from("widget_configs")
    .select("*")
    .eq("marina_id", marinaId)
    .maybeSingle();

  let confirmedBooking = null;
  const addonCatalog = await getPublicAddonCatalog(marinaId);

  if (confirmed) {
    const { data: booking } = await admin
      .from("bookings")
      .select("id, start_at, total_price, marina_id, boats(name)")
      .eq("id", confirmed)
      .eq("marina_id", marinaId)
      .single();

    if (booking && booking.marina_id === marinaId) {
      const boat = booking.boats as unknown as { name: string } | { name: string }[] | null;
      const boatName = Array.isArray(boat) ? boat[0]?.name : boat?.name;
      confirmedBooking = {
        id: booking.id,
        start_at: booking.start_at,
        total_price: booking.total_price,
        boats: { name: boatName ?? "Boat" },
      };
    }
  }

  return (
    <WidgetEmbedClient
      marina={marina}
      boats={(boatsData ?? []) as Boat[]}
      widgetConfig={widgetConfig}
      confirmedBooking={confirmedBooking}
      previewMode={previewMode}
      addonCatalog={addonCatalog}
    />
  );
}
