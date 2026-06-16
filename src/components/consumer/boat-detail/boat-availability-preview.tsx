import { getNextAvailableSlot } from "@/lib/availability/next-slot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export async function BoatAvailabilityPreview({
  marinaId,
  boatId,
  minBookingHours,
  timezone,
}: {
  marinaId: string;
  boatId: string;
  minBookingHours: number;
  timezone: string;
}) {
  const next = await getNextAvailableSlot(
    marinaId,
    boatId,
    minBookingHours,
    timezone
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-sky-600" />
          Availability
        </CardTitle>
      </CardHeader>
      <CardContent>
        {next ? (
          <p className="text-sm">
            <span className="text-muted-foreground">Next available: </span>
            <span className="font-medium">{next.label}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No open slots in the next two weeks. Use Book Now to check other
            dates.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
