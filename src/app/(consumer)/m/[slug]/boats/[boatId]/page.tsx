import { getPublicAddonCatalog } from "@/actions/addons";
import { getMarinaContactInfo } from "@/actions/marina-contact";
import {
  getBoatRatingStats,
  getBoatReviews,
} from "@/actions/reviews";
import { BoatAmenities } from "@/components/consumer/boat-detail/boat-amenities";
import { BoatAvailabilityPreview } from "@/components/consumer/boat-detail/boat-availability-preview";
import { BoatDetailSidebar } from "@/components/consumer/boat-detail/boat-detail-sidebar";
import { BoatMobileBookBar } from "@/components/consumer/boat-detail/boat-mobile-book-bar";
import { BoatGallery } from "@/components/consumer/boat-detail/boat-gallery";
import { BoatInfoHeader } from "@/components/consumer/boat-detail/boat-info-header";
import { BoatReviewsSection } from "@/components/consumer/boat-detail/boat-reviews-section";
import { MarinaContactCard } from "@/components/consumer/marina-contact-card";
import { RealtimeProvider } from "@/components/shared/realtime-provider";
import { WeatherSection } from "@/components/weather/weather-section";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import type { Boat, Marina } from "@/types/database";
import { notFound } from "next/navigation";

export default async function BoatDetailPage({
  params,
}: {
  params: Promise<{ slug: string; boatId: string }>;
}) {
  const { slug, boatId } = await params;
  const supabase = await createClient();

  const { data: marinaData } = await supabase
    .from("marinas")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!marinaData) notFound();
  const marina = marinaData as Marina;

  const { data: boatData } = await supabase
    .from("boats")
    .select("*")
    .eq("id", boatId)
    .eq("marina_id", marina.id)
    .eq("status", "active")
    .single();

  if (!boatData) notFound();
  const boat = boatData as Boat;

  const session = await getSessionContext();
  const user = session ? { id: session.userId, email: session.email } : null;

  let isFavorited = false;
  let defaultCustomer: {
    full_name: string;
    email: string;
    phone?: string;
  } | undefined;
  let reviewEligibility: { canReview: boolean; bookingId: string | null } | undefined;

  if (user) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("boat_id", boat.id)
      .maybeSingle();
    isFavorited = !!fav;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", user.id)
      .single();

    if (profile) {
      defaultCustomer = {
        full_name: profile.full_name ?? "",
        email: profile.email,
        phone: profile.phone ?? undefined,
      };
    }

    const { data: customers } = await supabase
      .from("customers")
      .select("id")
      .or(`user_id.eq.${user.id},email.eq.${profile?.email ?? ""}`);

    const customerIds = (customers ?? []).map((c) => c.id);
    if (customerIds.length > 0) {
      const { data: eligibleBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("boat_id", boat.id)
        .eq("status", "completed")
        .in("customer_id", customerIds)
        .order("end_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (eligibleBooking) {
        const { data: existingReview } = await supabase
          .from("reviews")
          .select("id")
          .eq("booking_id", eligibleBooking.id)
          .maybeSingle();

        reviewEligibility = {
          canReview: !existingReview,
          bookingId: eligibleBooking.id,
        };
      }
    }
  }

  const images =
    boat.image_urls?.length > 0
      ? boat.image_urls
      : ["https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80"];

  const [addonCatalog, allBoatsData, ratingStats, reviews, contactInfo] =
    await Promise.all([
      getPublicAddonCatalog(marina.id),
      supabase
        .from("boats")
        .select("*")
        .eq("marina_id", marina.id)
        .eq("status", "active")
        .order("sort_order"),
      getBoatRatingStats(boat.id),
      getBoatReviews(boat.id, 20),
      getMarinaContactInfo(marina.id),
    ]);

  const allBoats = (allBoatsData.data ?? []) as Boat[];

  return (
    <RealtimeProvider marinaId={marina.id} boatId={boat.id}>
      <div className="mx-auto max-w-6xl px-4 py-8 pb-24 lg:pb-8">
        <div className="mb-8">
          <BoatGallery images={images} name={boat.name} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-8">
            <BoatInfoHeader
              boat={boat}
              marinaId={marina.id}
              isFavorited={isFavorited}
              isAuthenticated={!!user}
            />

            <BoatAmenities amenities={boat.amenities ?? []} />

            <BoatAvailabilityPreview
              marinaId={marina.id}
              boatId={boat.id}
              minBookingHours={boat.min_booking_hours}
              timezone={marina.timezone}
            />

            <BoatReviewsSection
              stats={ratingStats}
              reviews={reviews}
              boatName={boat.name}
              reviewEligibility={reviewEligibility}
            />

            {contactInfo && (
              <MarinaContactCard
                marina={contactInfo}
                businessHours={
                  contactInfo.business_hours as Record<
                    string,
                    { open?: string; close?: string; closed?: boolean }
                  > | null
                }
              />
            )}

            <WeatherSection marina={marina} />
          </div>

          <BoatDetailSidebar
            boat={boat}
            marinaSlug={slug}
            timezone={marina.timezone}
            defaultCustomer={defaultCustomer}
            addonCatalog={addonCatalog}
            allBoats={allBoats}
          />
        </div>
        <BoatMobileBookBar boat={boat} />
      </div>
    </RealtimeProvider>
  );
}
