import { cn } from "@/lib/utils";
import { WEATHER_ICONS } from "@/lib/weather/icons";
import type { MarinaWeatherForecast } from "@/lib/weather/open-meteo";
import { format, parseISO } from "date-fns";

export function WeatherDayCard({
  day,
  highlighted,
  compact,
}: {
  day: MarinaWeatherForecast["daily"][number];
  highlighted?: boolean;
  compact?: boolean;
}) {
  const Icon = WEATHER_ICONS[day.icon];
  const dayLabel = format(parseISO(day.date), compact ? "EEE" : "EEE, MMM d");

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-center",
        highlighted && "border-sky-400 bg-sky-50 ring-1 ring-sky-200"
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{dayLabel}</p>
      <Icon className="mx-auto my-2 h-6 w-6 text-sky-600" />
      <p className="text-sm font-semibold">
        {day.highF}° / {day.lowF}°
      </p>
      {!compact && (
        <>
          <p className="mt-1 text-xs text-muted-foreground">{day.condition}</p>
          <p className="text-xs text-muted-foreground">
            Wind {day.windMaxMph} mph · {day.precipProbPct}% rain
          </p>
        </>
      )}
    </div>
  );
}
