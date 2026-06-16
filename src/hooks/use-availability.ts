"use client";

import {
  getBusinessHoursForDate,
  type BoatAvailabilityResult,
} from "@/lib/availability/fetch-availability";
import { generateHourlySlots, isSlotBookable } from "@/lib/availability/slots";
import { getMarinaDayBounds } from "@/lib/timezone";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

interface UseAvailabilityOptions {
  marinaId: string;
  marinaSlug: string;
  boatId: string;
  minBookingHours: number;
  timezone: string;
  selectedDate?: Date;
  source?: "consumer" | "widget";
  widgetApiKey?: string;
}

async function fetchAvailabilityData(
  options: UseAvailabilityOptions
): Promise<BoatAvailabilityResult> {
  const { start, end } = getMarinaDayBounds(
    options.selectedDate!,
    options.timezone
  );

  const params = new URLSearchParams({
    boat_id: options.boatId,
    start,
    end,
  });

  const url =
    options.source === "widget"
      ? `/api/v1/widget/${options.marinaId}/availability?${params}`
      : `/api/v1/marinas/${options.marinaSlug}/availability?${params}`;

  const headers: HeadersInit = {};
  if (options.source === "widget" && options.widgetApiKey) {
    headers["X-Widget-Key"] = options.widgetApiKey;
  }

  const res = await fetch(url, { headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? "Failed to load availability");
  }

  return data;
}

export function useAvailability(options: UseAvailabilityOptions) {
  const {
    marinaId,
    boatId,
    minBookingHours,
    timezone,
    selectedDate,
    source = "consumer",
    widgetApiKey,
  } = options;

  const enabled =
    !!selectedDate && (source !== "widget" || !!widgetApiKey);

  const query = useQuery({
    queryKey: [
      "availability",
      marinaId,
      boatId,
      selectedDate?.toISOString(),
      source,
    ],
    queryFn: () => fetchAvailabilityData({ ...options, selectedDate }),
    enabled,
    refetchInterval: 30_000,
  });

  const slots = useMemo(() => {
    if (!selectedDate || !query.data) return [];

    const dayHours = getBusinessHoursForDate(
      query.data.business_hours,
      selectedDate,
      timezone
    );

    const generated = generateHourlySlots(
      selectedDate,
      minBookingHours,
      timezone,
      dayHours
    );

    return generated.map((slot) => ({
      ...slot,
      available: isSlotBookable(
        slot.start,
        slot.end,
        query.data.bookings,
        query.data.blocks
      ),
    }));
  }, [selectedDate, query.data, minBookingHours, timezone]);

  return { ...query, slots };
}
