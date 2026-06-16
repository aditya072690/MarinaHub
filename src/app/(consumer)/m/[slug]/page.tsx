import { getMarinaReviewsForProfile } from "@/actions/reviews";
import { MarinaProfile } from "@/components/consumer/marina-profile";
import { getDemoWidgetKey } from "@/lib/demo/widget-keys";
import { RealtimeProvider } from "@/components/shared/realtime-provider";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function MarinaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: marina } = await supabase
    .from("marinas")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!marina) notFound();

  const { data: boats } = await supabase
    .from("boats")
    .select("*")
    .eq("marina_id", marina.id)
    .eq("status", "active")
    .order("sort_order");

  const session = await getSessionContext();
  const user = session ? { id: session.userId } : null;

  let favoriteIds: string[] = [];
  if (user) {
    const { data: favs } = await supabase
      .from("favorites")
      .select("boat_id")
      .eq("user_id", user.id);
    favoriteIds = (favs ?? []).map((f) => f.boat_id);
  }

  const widgetApiKey = getDemoWidgetKey(slug);

  const { data: widgetConfig } = await supabase
    .from("widget_configs")
    .select("*")
    .eq("marina_id", marina.id)
    .maybeSingle();

  const reviewData = await getMarinaReviewsForProfile(marina.id);

  return (
    <RealtimeProvider marinaId={marina.id}>
      <MarinaProfile
        marina={marina}
        boats={boats ?? []}
        favoriteIds={favoriteIds}
        isAuthenticated={!!user}
        widgetApiKey={widgetApiKey}
        widgetConfig={widgetConfig}
        reviews={reviewData.reviews}
        avgRating={reviewData.avgRating}
        reviewCount={reviewData.reviewCount}
      />
    </RealtimeProvider>
  );
}
