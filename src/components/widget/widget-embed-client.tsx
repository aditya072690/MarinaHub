"use client";

import { formatCurrency } from "@/lib/currency/format";
import { WidgetBookingFlow } from "@/components/widget/widget-booking-flow";
import { WidgetKeyProvider } from "@/components/widget/widget-key-provider";
import { PREVIEW_MESSAGE } from "@/components/widget/widget-theme-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseWidgetTheme, resolveWidgetTheme, type WidgetTheme } from "@/lib/widget/theme";
import type { AddonCatalogItem, Boat, Marina, WidgetConfig } from "@/types/database";
import { format, parseISO } from "date-fns";
import { CheckCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ConfirmedBooking {
  id: string;
  start_at: string;
  total_price: number;
  boats: { name: string };
}

export function WidgetEmbedClient({
  marina,
  boats,
  widgetConfig,
  confirmedBooking,
  previewMode = false,
  addonCatalog = [],
}: {
  marina: Marina;
  boats: Boat[];
  widgetConfig?: WidgetConfig | null;
  confirmedBooking?: ConfirmedBooking | null;
  previewMode?: boolean;
  addonCatalog?: AddonCatalogItem[];
}) {
  const baseTheme = resolveWidgetTheme(marina, widgetConfig ?? null);
  const [previewTheme, setPreviewTheme] = useState<WidgetTheme>(baseTheme);

  useEffect(() => {
    if (!previewMode) return;

    function onMessage(event: MessageEvent) {
      if (event.data?.type === PREVIEW_MESSAGE && event.data.theme) {
        setPreviewTheme(parseWidgetTheme(event.data.theme));
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [previewMode]);

  if (confirmedBooking) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto mb-2 h-10 w-10 text-emerald-600" />
            <CardTitle>Booking Confirmed!</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm">
            <p className="font-medium">{confirmedBooking.boats.name}</p>
            <p className="text-muted-foreground">
              {format(parseISO(confirmedBooking.start_at), "MMM d, h:mm a")}
            </p>
            <p className="mt-2 font-semibold">
              {formatCurrency(Number(confirmedBooking.total_price))}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (previewMode) {
    return (
      <WidgetBookingFlow
        marina={marina}
        boats={boats}
        theme={previewTheme}
        previewMode
        addonCatalog={addonCatalog}
      />
    );
  }

  return (
    <WidgetKeyProvider marinaId={marina.id}>
      {(apiKey, ready) => {
        if (!ready) {
          return (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading widget...
            </div>
          );
        }

        if (!apiKey) {
          return (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Widget authentication required</p>
              <p className="mt-2">
                Embed using the script tag with <code className="text-xs">data-key</code> from
                Dashboard → Widget.
              </p>
            </div>
          );
        }

        return (
          <WidgetBookingFlow
            marina={marina}
            boats={boats}
            theme={baseTheme}
            widgetApiKey={apiKey}
            addonCatalog={addonCatalog}
          />
        );
      }}
    </WidgetKeyProvider>
  );
}
