"use client";

import { WidgetBookingFlow } from "@/components/widget/widget-booking-flow";
import { resolveWidgetTheme } from "@/lib/widget/theme";
import type { Boat, Marina, WidgetConfig } from "@/types/database";

export function MarinaBookingWidget({
  marina,
  boats,
  widgetConfig,
  widgetApiKey,
}: {
  marina: Marina;
  boats: Boat[];
  widgetConfig?: WidgetConfig | null;
  widgetApiKey?: string | null;
}) {
  const theme = resolveWidgetTheme(marina, widgetConfig ?? null);

  return (
    <WidgetBookingFlow
      marina={marina}
      boats={boats}
      theme={theme}
      widgetApiKey={widgetApiKey ?? undefined}
    />
  );
}
