import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WEATHER_ICONS } from "@/lib/weather/icons";
import type { MarinaWeatherForecast } from "@/lib/weather/open-meteo";
import { CloudSun, Droplets, Wind } from "lucide-react";
import { WeatherAlertBanner } from "./weather-alert-banner";
import { WeatherDayCard } from "./weather-day-card";
import { format, isSameDay, parseISO } from "date-fns";

export function WeatherForecastWidget({
  forecast,
  variant = "full",
  highlightDate,
  title = "Weather Forecast",
}: {
  forecast: MarinaWeatherForecast;
  variant?: "full" | "compact" | "strip";
  highlightDate?: string;
  title?: string;
}) {
  const CurrentIcon = WEATHER_ICONS[forecast.current.icon];
  const highlight = highlightDate
    ? forecast.daily.find((d) =>
        isSameDay(parseISO(d.date), parseISO(highlightDate))
      )
    : undefined;

  if (variant === "strip") {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold">{title}</h3>
        <WeatherAlertBanner warnings={forecast.warnings} />
        <div className="grid grid-cols-2 gap-2 overflow-x-auto sm:grid-cols-3">
          {forecast.daily.map((day) => (
            <WeatherDayCard
              key={day.date}
              day={day}
              compact
              highlighted={
                highlightDate
                  ? isSameDay(parseISO(day.date), parseISO(highlightDate))
                  : false
              }
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    const day = highlight ?? forecast.daily[0];
    if (!day) return null;
    const DayIcon = WEATHER_ICONS[day.icon];

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <WeatherAlertBanner warnings={forecast.warnings} />
          <div className="flex items-center gap-4">
            <DayIcon className="h-10 w-10 text-sky-600" />
            <div>
              <p className="font-semibold">
                {format(parseISO(day.date), "EEEE, MMM d")}
              </p>
              <p className="text-sm text-muted-foreground">{day.condition}</p>
              <p className="text-sm">
                {day.highF}° / {day.lowF}° · Wind up to {day.windMaxMph} mph
              </p>
            </div>
          </div>
          <Badge variant="secondary">Lake Conditions: {forecast.lakeConditions}</Badge>
          <p className="text-xs text-muted-foreground">Powered by Open-Meteo</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CloudSun className="h-5 w-5 text-sky-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <WeatherAlertBanner warnings={forecast.warnings} />

        <div className="flex flex-wrap items-center gap-4 rounded-lg bg-slate-50 p-4">
          <CurrentIcon className="h-12 w-12 text-sky-600" />
          <div>
            <p className="text-2xl font-bold">{forecast.current.tempF}°F</p>
            <p className="text-sm text-muted-foreground">
              {forecast.current.condition}
            </p>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Wind className="h-4 w-4" />
              {forecast.current.windMph} mph
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="h-4 w-4" />
              {forecast.current.humidity}%
            </span>
          </div>
          <Badge variant="secondary" className="ml-auto">
            Lake Conditions: {forecast.lakeConditions}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {forecast.daily.map((day) => (
            <WeatherDayCard
              key={day.date}
              day={day}
              highlighted={
                highlightDate
                  ? isSameDay(parseISO(day.date), parseISO(highlightDate))
                  : false
              }
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground">Powered by Open-Meteo</p>
      </CardContent>
    </Card>
  );
}
