"use client";

import { formatHourlyRate, formatCurrency } from "@/lib/currency/format";
import { BookingWizard } from "@/components/consumer/booking-wizard";
import { WidgetThemedHeader } from "@/components/widget/widget-themed-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RealtimeProvider } from "@/components/shared/realtime-provider";
import { EmptyState } from "@/components/shared/empty-state";
import {
  buttonRadiusClass,
  resolveWidgetTheme,
  widgetThemeToCssVars,
  type WidgetTheme,
} from "@/lib/widget/theme";
import type { AddonCatalogItem, Boat, Marina } from "@/types/database";
import { Ship } from "lucide-react";
import { useState } from "react";

export function WidgetBookingFlow({
  marina,
  boats,
  theme,
  widgetApiKey,
  previewMode = false,
  marinaName,
  addonCatalog = [],
}: {
  marina?: Marina;
  marinaId?: string;
  marinaSlug?: string;
  timezone?: string;
  boats: Boat[];
  theme?: WidgetTheme;
  primaryColor?: string;
  widgetApiKey?: string;
  previewMode?: boolean;
  marinaName?: string;
  addonCatalog?: AddonCatalogItem[];
}) {
  const marinaId = marina?.id ?? "";
  const marinaSlug = marina?.slug ?? "";
  const timezone = marina?.timezone ?? "America/New_York";
  const resolvedTheme =
    theme ??
    (marina
      ? resolveWidgetTheme(marina, null)
      : {
          primary_color: "#0ea5e9",
          logo_url: null,
          font_family: "Inter" as const,
          button_style: "rounded" as const,
          button_text: "Book Now",
        });
  const displayName = marinaName ?? marina?.name ?? "Marina";

  const [selectedBoatId, setSelectedBoatId] = useState(boats[0]?.id ?? "");
  const selectedBoat = boats.find((b) => b.id === selectedBoatId);

  if (boats.length === 0) {
    return (
      <EmptyState
        icon={Ship}
        title="No boats available"
        description="This marina hasn't listed boats for online booking yet."
      />
    );
  }

  return (
    <RealtimeProvider marinaId={marinaId} boatId={selectedBoatId}>
      <div
        className="mx-auto max-w-md"
        style={{
          ...widgetThemeToCssVars(resolvedTheme),
          fontFamily: resolvedTheme.font_family,
          backgroundColor: resolvedTheme.background ?? "#ffffff",
        }}
      >
        <WidgetThemedHeader marinaName={displayName} theme={resolvedTheme} />

        <div className="p-4">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">Select Boat</label>
            <Select
              value={selectedBoatId}
              onValueChange={(v) => setSelectedBoatId(v ?? boats[0]?.id ?? "")}
            >
              <SelectTrigger className={buttonRadiusClass(resolvedTheme.button_style)}>
                <SelectValue placeholder="Choose a boat" />
              </SelectTrigger>
              <SelectContent>
                {boats.map((boat) => (
                  <SelectItem key={boat.id} value={boat.id}>
                    {boat.name} — {formatHourlyRate(Number(boat.hourly_rate))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBoat && !previewMode && widgetApiKey && (
            <BookingWizard
              boat={selectedBoat}
              marinaSlug={marinaSlug}
              timezone={timezone}
              source="widget"
              widgetApiKey={widgetApiKey}
              accentColor={resolvedTheme.primary_color}
              buttonText={resolvedTheme.button_text}
              addonCatalog={addonCatalog}
              allBoats={boats}
            />
          )}

          {selectedBoat && previewMode && (
            <div
              className={`border bg-slate-50 p-6 text-center text-sm text-muted-foreground ${buttonRadiusClass(resolvedTheme.button_style)}`}
            >
              <p className="font-medium text-foreground">Booking preview</p>
              <p className="mt-2">
                {selectedBoat.name} — {formatHourlyRate(Number(selectedBoat.hourly_rate))}
              </p>
              <button
                type="button"
                className={`mt-4 w-full px-4 py-2 text-sm font-medium text-white ${buttonRadiusClass(resolvedTheme.button_style)}`}
                style={{ backgroundColor: resolvedTheme.primary_color }}
              >
                {resolvedTheme.button_text ?? "Continue to booking"}
              </button>
            </div>
          )}
        </div>
      </div>
    </RealtimeProvider>
  );
}
