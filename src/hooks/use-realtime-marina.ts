"use client";

import { getQueryClient } from "@/lib/query-client";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

/**
 * Single realtime channel per marina — bookings + availability blocks.
 * Uses query invalidation only (no router.refresh) for sub-50ms updates.
 */
export function useRealtimeMarina(
  marinaId: string | undefined,
  boatId?: string
) {
  useEffect(() => {
    if (!marinaId) return;

    const queryClient = getQueryClient();
    const supabase = createClient();

    function invalidateAvailability() {
      queryClient.invalidateQueries({ queryKey: ["availability", marinaId] });
      if (boatId) {
        queryClient.invalidateQueries({
          queryKey: ["availability", marinaId, boatId],
        });
      }
    }

    function onBookingOrBlockChange() {
      queryClient.invalidateQueries({ queryKey: ["bookings", marinaId] });
      queryClient.invalidateQueries({ queryKey: ["analytics", marinaId] });
      queryClient.invalidateQueries({ queryKey: ["payments", marinaId] });
      invalidateAvailability();
    }

    // Use a unique suffix to prevent React StrictMode double-mount from reusing a disconnecting channel
    const channelId = `marina:${marinaId}:sync-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
          filter: `marina_id=eq.${marinaId}`,
        },
        onBookingOrBlockChange
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `marina_id=eq.${marinaId}`,
        },
        onBookingOrBlockChange
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "bookings",
          filter: `marina_id=eq.${marinaId}`,
        },
        onBookingOrBlockChange
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "availability_blocks", filter: `marina_id=eq.${marinaId}` },
        onBookingOrBlockChange
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "availability_blocks", filter: `marina_id=eq.${marinaId}` },
        onBookingOrBlockChange
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "availability_blocks", filter: `marina_id=eq.${marinaId}` },
        onBookingOrBlockChange
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [marinaId, boatId]);
}
