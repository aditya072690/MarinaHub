import type { WidgetTheme } from "@/lib/widget/theme";
import { buttonRadiusClass, widgetThemeToCssVars } from "@/lib/widget/theme";
import Image from "next/image";

export function WidgetThemedHeader({
  marinaName,
  theme,
}: {
  marinaName: string;
  theme: WidgetTheme;
}) {
  return (
    <div
      className="border-b px-4 py-3"
      style={{
        ...widgetThemeToCssVars(theme),
        fontFamily: theme.font_family,
        backgroundColor: theme.background ?? "#ffffff",
      }}
    >
      <div className="flex items-center gap-3">
        {theme.logo_url ? (
          <Image
            src={theme.logo_url}
            alt=""
            width={36}
            height={36}
            className="rounded-lg object-cover"
            unoptimized
          />
        ) : (
          <div
            className={`flex h-9 w-9 items-center justify-center text-sm font-bold text-white ${buttonRadiusClass(theme.button_style)}`}
            style={{ backgroundColor: theme.primary_color }}
          >
            {marinaName.charAt(0)}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold" style={{ color: theme.primary_color }}>
            {marinaName}
          </p>
          <p className="text-xs text-muted-foreground">Book online</p>
        </div>
      </div>
    </div>
  );
}
