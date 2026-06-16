import { unstable_cache } from "next/cache";
import { weatherCodeToIcon, weatherCodeToLabel, type WeatherIconKey } from "./icons";
import { computeLakeConditions, computeWeatherWarnings } from "./warnings";

export interface MarinaWeatherForecast {
  current: {
    tempF: number;
    humidity: number;
    windMph: number;
    windGustMph: number;
    weatherCode: number;
    condition: string;
    icon: WeatherIconKey;
    precipitationMm: number;
  };
  daily: Array<{
    date: string;
    highF: number;
    lowF: number;
    windMaxMph: number;
    precipProbPct: number;
    weatherCode: number;
    condition: string;
    icon: WeatherIconKey;
  }>;
  warnings: ReturnType<typeof computeWeatherWarnings>;
  lakeConditions: string;
  fetchedAt: string;
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
    precipitation?: number;
  };
  current_weather?: {
    temperature?: number;
    weathercode?: number;
    windspeed?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
    weather_code?: number[];
  };
}

async function fetchOpenMeteo(
  lat: number,
  lng: number,
  timezone: string
): Promise<MarinaWeatherForecast | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current:
        "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,precipitation",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
      forecast_days: "3",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      timezone: timezone || "auto",
    });

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      {
        headers: { "User-Agent": "MarinaHub/1.0" },
        next: { revalidate: 1800 },
      }
    );

    if (!res.ok) return null;

    const data = (await res.json()) as OpenMeteoResponse;
    const currentCode =
      data.current?.weather_code ?? data.current_weather?.weathercode ?? 0;
    const currentTemp =
      data.current?.temperature_2m ?? data.current_weather?.temperature ?? 0;
    const currentWind =
      data.current?.wind_speed_10m ?? data.current_weather?.windspeed ?? 0;

    const daily = (data.daily?.time ?? []).slice(0, 3).map((date, i) => {
      const code = data.daily?.weather_code?.[i] ?? 0;
      return {
        date,
        highF: Math.round(data.daily?.temperature_2m_max?.[i] ?? 0),
        lowF: Math.round(data.daily?.temperature_2m_min?.[i] ?? 0),
        windMaxMph: Math.round(data.daily?.wind_speed_10m_max?.[i] ?? 0),
        precipProbPct: Math.round(
          data.daily?.precipitation_probability_max?.[i] ?? 0
        ),
        weatherCode: code,
        condition: weatherCodeToLabel(code),
        icon: weatherCodeToIcon(code),
      };
    });

    const forecast: MarinaWeatherForecast = {
      current: {
        tempF: Math.round(currentTemp),
        humidity: Math.round(data.current?.relative_humidity_2m ?? 0),
        windMph: Math.round(currentWind),
        windGustMph: Math.round(data.current?.wind_gusts_10m ?? currentWind),
        weatherCode: currentCode,
        condition: weatherCodeToLabel(currentCode),
        icon: weatherCodeToIcon(currentCode),
        precipitationMm: data.current?.precipitation ?? 0,
      },
      daily,
      warnings: [],
      lakeConditions: "Good",
      fetchedAt: new Date().toISOString(),
    };

    forecast.warnings = computeWeatherWarnings(forecast);
    forecast.lakeConditions = computeLakeConditions(forecast);

    return forecast;
  } catch {
    return null;
  }
}

export async function getWeather(
  lat: number,
  lng: number,
  timezone = "auto"
): Promise<MarinaWeatherForecast | null> {
  const cached = unstable_cache(
    () => fetchOpenMeteo(lat, lng, timezone),
    [`weather-${lat.toFixed(4)}-${lng.toFixed(4)}-${timezone}`],
    { revalidate: 1800, tags: [`weather-${lat}-${lng}`] }
  );
  return cached();
}

export async function getMarinaWeather(marina: {
  id: string;
  lat?: number | null;
  lng?: number | null;
  timezone?: string;
}): Promise<MarinaWeatherForecast | null> {
  if (marina.lat == null || marina.lng == null) return null;
  const cached = unstable_cache(
    () => fetchOpenMeteo(marina.lat!, marina.lng!, marina.timezone ?? "auto"),
    [`weather-marina-${marina.id}`],
    { revalidate: 1800, tags: [`weather-marina-${marina.id}`] }
  );
  return cached();
}
