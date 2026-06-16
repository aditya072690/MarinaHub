import { cn } from "@/lib/utils";
import type { WeatherWarning } from "@/lib/weather/warnings";
import { AlertTriangle, CloudRain } from "lucide-react";

export function WeatherAlertBanner({ warnings }: { warnings: WeatherWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((warning) => (
        <div
          key={warning.type}
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
            warning.severity === "amber"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-sky-200 bg-sky-50 text-sky-900"
          )}
        >
          {warning.type === "wind" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CloudRain className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>⚠ {warning.message}</span>
        </div>
      ))}
    </div>
  );
}
