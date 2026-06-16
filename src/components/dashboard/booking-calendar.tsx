"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  DEFAULT_TIMEZONE,
  formatInMarinaTimezone,
  getMarinaCellBounds,
  isSameMarinaCalendarDay,
} from "@/lib/timezone";
import type { AvailabilityBlock, Boat, BookingWithRelations } from "@/types/database";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Ship } from "lucide-react";
import { useMemo, useState } from "react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 border-amber-300 text-amber-900",
  confirmed: "bg-sky-100 border-sky-300 text-sky-900",
  cancelled: "bg-slate-100 border-slate-300 text-slate-500 line-through",
  completed: "bg-emerald-100 border-emerald-300 text-emerald-900",
  no_show: "bg-red-100 border-red-300 text-red-900",
};

const blockColors = "bg-orange-100 border-orange-300 text-orange-900";

function overlaps(
  cellStart: Date,
  cellEnd: Date,
  rangeStart: Date,
  rangeEnd: Date
) {
  return rangeStart < cellEnd && rangeEnd > cellStart;
}

export function BookingCalendar({
  boats,
  bookings,
  blocks,
  timezone = DEFAULT_TIMEZONE,
}: {
  boats: Boat[];
  bookings: BookingWithRelations[];
  blocks: AvailabilityBlock[];
  timezone?: string;
}) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const hours = [8, 10, 12, 14, 16, 18];

  const { bookingsByBoat, marinaWideBlocks, blocksByBoat } = useMemo(() => {
    const bookingsByBoat = new Map<string, BookingWithRelations[]>();
    const blocksByBoat = new Map<string, AvailabilityBlock[]>();
    const marinaWideBlocks: AvailabilityBlock[] = [];

    for (const booking of bookings) {
      const list = bookingsByBoat.get(booking.boat_id) ?? [];
      list.push(booking);
      bookingsByBoat.set(booking.boat_id, list);
    }

    for (const block of blocks) {
      if (!block.boat_id) {
        marinaWideBlocks.push(block);
      } else {
        const list = blocksByBoat.get(block.boat_id) ?? [];
        list.push(block);
        blocksByBoat.set(block.boat_id, list);
      }
    }

    return { bookingsByBoat, marinaWideBlocks, blocksByBoat };
  }, [bookings, blocks]);

  function getEventsForCell(boatId: string, day: Date, hour: number) {
    const { cellStart, cellEnd } = getMarinaCellBounds(day, hour, timezone);

    const boatBookings = bookingsByBoat.get(boatId) ?? [];
    const cellBookings = boatBookings.filter((b) => {
      const start = parseISO(b.start_at);
      const end = parseISO(b.end_at);
      return overlaps(cellStart, cellEnd, start, end);
    });

    const boatBlocks = blocksByBoat.get(boatId) ?? [];
    const relevantBlocks = [...marinaWideBlocks, ...boatBlocks];

    const cellBlocks = relevantBlocks.filter((bl) => {
      const start = parseISO(bl.start_at);
      const end = parseISO(bl.end_at);
      return (
        overlaps(cellStart, cellEnd, start, end) &&
        isSameMarinaCalendarDay(bl.start_at, day, timezone)
      );
    });

    return { cellBookings, cellBlocks };
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Booking Calendar</CardTitle>
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[180px] text-center text-sm font-medium">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="mb-2 grid grid-cols-8 gap-1">
            <div className="p-2 text-xs font-medium text-muted-foreground">Boat / Time</div>
            {days.map((day) => (
              <div key={day.toISOString()} className="p-2 text-center text-xs font-medium">
                <div>{format(day, "EEE")}</div>
                <div className="text-muted-foreground">{format(day, "MMM d")}</div>
              </div>
            ))}
          </div>

          {boats.map((boat) => (
            <div key={boat.id} className="mb-4 border-t pt-2">
              <p className="mb-2 text-sm font-semibold">{boat.name}</p>
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 gap-1">
                  <div className="flex items-center p-1 text-xs text-muted-foreground">
                    {hour}:00
                  </div>
                  {days.map((day) => {
                    const { cellBookings, cellBlocks } = getEventsForCell(
                      boat.id,
                      day,
                      hour
                    );
                    return (
                      <div
                        key={`${boat.id}-${day.toISOString()}-${hour}`}
                        className="min-h-[40px] rounded border border-dashed border-slate-200 p-0.5"
                      >
                        {cellBookings.map((b) => (
                          <div
                            key={b.id}
                            className={`mb-0.5 rounded border px-1 py-0.5 text-[10px] ${statusColors[b.status]}`}
                            title={`${b.customers?.full_name} – ${formatInMarinaTimezone(b.start_at, timezone, "h:mm a")}`}
                          >
                            {b.customers?.full_name?.split(" ")[0]}
                          </div>
                        ))}
                        {cellBlocks.map((bl) => (
                          <div
                            key={bl.id}
                            className={`mb-0.5 rounded border px-1 py-0.5 text-[10px] ${blockColors}`}
                          >
                            {bl.reason}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}

          {boats.length === 0 && (
            <EmptyState
              icon={Ship}
              title="Calendar needs boats"
              description="Add boats to your fleet to see availability on the calendar."
              actionLabel="Add boats"
              actionHref="/dashboard/boats"
              className="border-0 py-8"
            />
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(statusColors).map(([status, color]) => (
            <Badge key={status} variant="outline" className={color}>
              {status}
            </Badge>
          ))}
          <Badge variant="outline" className={blockColors}>
            blocked
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
