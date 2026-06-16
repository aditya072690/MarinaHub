"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TripCard } from "@/components/consumer/trip-card";
import type { ConsumerTrip } from "@/types/api";
import { Calendar, History, XCircle } from "lucide-react";

export function BookingHistoryTabs({
  upcoming,
  completed,
  cancelled,
}: {
  upcoming: ConsumerTrip[];
  completed: ConsumerTrip[];
  cancelled: ConsumerTrip[];
}) {
  return (
    <Tabs defaultValue="upcoming">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
        <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="upcoming" className="mt-4 space-y-3">
        {upcoming.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No upcoming adventures"
            description="Book a boat and your trips will show up here."
            actionLabel="Find a boat"
            actionHref="/search"
          />
        ) : (
          upcoming.map((t) => <TripCard key={t.id} trip={t} />)
        )}
      </TabsContent>
      <TabsContent value="completed" className="mt-4 space-y-3">
        {completed.length === 0 ? (
          <EmptyState
            icon={History}
            title="No completed trips yet"
            description="Your past adventures will appear here after you return from the water."
            actionLabel="Book your first trip"
            actionHref="/search"
          />
        ) : (
          completed.map((t) => <TripCard key={t.id} trip={t} />)
        )}
      </TabsContent>
      <TabsContent value="cancelled" className="mt-4 space-y-3">
        {cancelled.length === 0 ? (
          <EmptyState
            icon={XCircle}
            title="No cancelled trips"
            description="Cancelled bookings will be listed here for your records."
          />
        ) : (
          cancelled.map((t) => <TripCard key={t.id} trip={t} />)
        )}
      </TabsContent>
    </Tabs>
  );
}
