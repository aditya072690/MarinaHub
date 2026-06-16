import {
  buildDirectionsUrl,
  buildMailtoUrl,
  buildTelUrl,
} from "@/lib/maps/directions-url";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";

const DAY_LABELS: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

type HoursDay = { open?: string; close?: string; closed?: boolean };

function formatHours(hours: Record<string, HoursDay> | null): string[] {
  if (!hours) return [];
  return Object.entries(DAY_LABELS).map(([key, label]) => {
    const day = hours[key];
    if (!day || day.closed) return `${label}: Closed`;
    return `${label}: ${day.open ?? "—"} – ${day.close ?? "—"}`;
  });
}

export function MarinaContactCard({
  marina,
  businessHours,
}: {
  marina: {
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
  businessHours?: Record<string, HoursDay> | null;
}) {
  const addressLine = [marina.address, marina.city, marina.state, marina.zip]
    .filter(Boolean)
    .join(", ");
  const hoursLines = formatHours(businessHours ?? null);
  const directionsUrl = buildDirectionsUrl({
    lat: marina.lat,
    lng: marina.lng,
    address: marina.address,
    city: marina.city,
    state: marina.state,
    zip: marina.zip,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-sky-600" />
          Marina Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-semibold">{marina.name}</p>
          {addressLine && (
            <p className="mt-1 text-sm text-muted-foreground">{addressLine}</p>
          )}
        </div>

        {marina.contact_phone && (
          <p className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            {marina.contact_phone}
          </p>
        )}

        {marina.contact_email && (
          <p className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {marina.contact_email}
          </p>
        )}

        {hoursLines.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Hours
            </p>
            <ul className="space-y-0.5 text-sm text-muted-foreground">
              {hoursLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {marina.contact_phone && (
            <a
              href={buildTelUrl(marina.contact_phone)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Call Marina
            </a>
          )}
          {marina.contact_email && (
            <a
              href={buildMailtoUrl(marina.contact_email)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Email Marina
            </a>
          )}
          {marina.lat != null && marina.lng != null && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "sm" }), "inline-flex items-center gap-2")}
            >
              <Navigation className="h-4 w-4" />
              Get Directions
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
