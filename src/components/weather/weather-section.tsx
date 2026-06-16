import { getMarinaWeather } from "@/lib/weather/open-meteo";
import { WeatherForecastWidget } from "./weather-forecast-widget";
import { WeatherUnavailable } from "./weather-unavailable";

export async function WeatherSection({
  marina,
  variant = "full",
  highlightDate,
  title = "Weather Forecast",
}: {
  marina: {
    id: string;
    lat?: number | null;
    lng?: number | null;
    timezone?: string;
  };
  variant?: "full" | "compact" | "strip";
  highlightDate?: string;
  title?: string;
}) {
  const hasCoords = marina.lat != null && marina.lng != null;
  if (!hasCoords) return null;

  const forecast = await getMarinaWeather(marina).catch(() => null);

  if (forecast) {
    return (
      <WeatherForecastWidget
        forecast={forecast}
        variant={variant}
        highlightDate={highlightDate}
        title={title}
      />
    );
  }

  return <WeatherUnavailable title={title} compact={variant === "compact"} strip={variant === "strip"} />;
}
