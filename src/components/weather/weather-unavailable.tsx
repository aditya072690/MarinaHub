import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudOff } from "lucide-react";

export function WeatherUnavailable({
  title = "Weather Forecast",
  compact = false,
  strip = false,
}: {
  title?: string;
  compact?: boolean;
  strip?: boolean;
}) {
  if (strip) {
    return (
      <div className="flex items-start gap-3 text-sm text-muted-foreground">
        <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Weather forecast unavailable. Contact the marina before departure.</p>
      </div>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 py-4 text-sm text-muted-foreground">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Weather forecast unavailable for your trip date. Contact the marina
            before departure.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CloudOff className="h-5 w-5 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Weather forecast is temporarily unavailable. Please contact the marina
          before departure for current lake conditions.
        </p>
      </CardContent>
    </Card>
  );
}
