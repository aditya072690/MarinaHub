import { getConsumerTrips } from "@/actions/profile";
import { getTripReviewMeta } from "@/actions/reviews";
import { AccountPageHeader } from "@/components/consumer/account-page-header";
import { TripCard } from "@/components/consumer/trip-card";
import { TripTabs } from "@/components/consumer/trip-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import type { ConsumerTrip } from "@/types/api";
import { Calendar } from "lucide-react";
import { Suspense } from "react";

export default async function MyTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "past" ? "past" : "upcoming";
  const trips = (await getConsumerTrips(tab)) as ConsumerTrip[];
  const bookingIds = trips.map((t) => t.id);
  const reviewMeta =
    tab === "past" && bookingIds.length > 0
      ? await getTripReviewMeta(bookingIds)
      : {};

  return (
    <div>
      <AccountPageHeader
        title="My Trips"
        description={
          tab === "upcoming"
            ? "Upcoming and active bookings"
            : "Past and completed trips"
        }
      />

      <Suspense fallback={null}>
        <div className="mb-5">
          <TripTabs />
        </div>
      </Suspense>

      {trips.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={tab === "upcoming" ? "No upcoming adventures" : "No past trips yet"}
          description={
            tab === "upcoming"
              ? "Book a boat and your trips will show up here."
              : "Completed trips will appear here after your adventures."
          }
          actionLabel={tab === "upcoming" ? "Find a boat" : undefined}
          actionHref={tab === "upcoming" ? "/search" : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              canReview={reviewMeta[trip.id]?.canReview}
              reviewId={reviewMeta[trip.id]?.reviewId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
