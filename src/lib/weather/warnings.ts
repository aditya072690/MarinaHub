import { isRainCode } from "./icons";
import type { MarinaWeatherForecast } from "./open-meteo";

export interface WeatherWarning {
  type: "wind" | "rain";
  message: string;
  severity: "amber" | "blue";
}

const WIND_THRESHOLD_MPH = 15;
const RAIN_PROB_THRESHOLD = 50;

export function computeWeatherWarnings(forecast: MarinaWeatherForecast): WeatherWarning[] {
  const warnings: WeatherWarning[] = [];

  const highWind =
    forecast.current.windMph > WIND_THRESHOLD_MPH ||
    forecast.daily.some((d) => d.windMaxMph > WIND_THRESHOLD_MPH);

  if (highWind) {
    warnings.push({
      type: "wind",
      message:
        "High Winds Expected — Please contact the marina before departure",
      severity: "amber",
    });
  }

  const rainExpected =
    forecast.daily.some((d) => d.precipProbPct > RAIN_PROB_THRESHOLD) ||
    (forecast.current.precipitationMm > 0 &&
      isRainCode(forecast.current.weatherCode));

  if (rainExpected) {
    warnings.push({
      type: "rain",
      message: "Rain Expected — Booking remains active",
      severity: "blue",
    });
  }

  return warnings;
}

export function computeLakeConditions(forecast: MarinaWeatherForecast): string {
  const maxWind = Math.max(
    forecast.current.windMph,
    ...forecast.daily.map((d) => d.windMaxMph)
  );
  const maxPrecip = Math.max(...forecast.daily.map((d) => d.precipProbPct));

  if (maxWind > WIND_THRESHOLD_MPH || maxPrecip > RAIN_PROB_THRESHOLD) {
    return "Rough";
  }
  if (maxWind >= 10 || maxPrecip >= 30) {
    return "Moderate chop";
  }
  return "Calm";
}
