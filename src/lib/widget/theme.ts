import type { Marina, WidgetConfig } from "@/types/database";

export type WidgetButtonStyle = "rounded" | "pill" | "square";

export type WidgetFontFamily = "Inter" | "DM Sans" | "Source Sans 3";

export interface WidgetTheme {
  primary_color: string;
  logo_url: string | null;
  font_family: WidgetFontFamily;
  button_style: WidgetButtonStyle;
  button_text: string;
  accent_color?: string;
  background?: string;
  border_radius?: string;
}

export const DEFAULT_WIDGET_THEME: WidgetTheme = {
  primary_color: "#0ea5e9",
  logo_url: null,
  font_family: "Inter",
  button_style: "rounded",
  button_text: "Book Now",
  background: "#ffffff",
  border_radius: "12px",
};

export const WIDGET_FONT_OPTIONS: { value: WidgetFontFamily; label: string }[] = [
  { value: "Inter", label: "Inter" },
  { value: "DM Sans", label: "DM Sans" },
  { value: "Source Sans 3", label: "Source Sans 3" },
];

export const WIDGET_BUTTON_STYLES: { value: WidgetButtonStyle; label: string }[] = [
  { value: "rounded", label: "Rounded" },
  { value: "pill", label: "Pill" },
  { value: "square", label: "Square" },
];

export function parseWidgetTheme(raw: Record<string, unknown> | null | undefined): WidgetTheme {
  if (!raw) return { ...DEFAULT_WIDGET_THEME };
  return {
    primary_color: (raw.primary_color as string) ?? DEFAULT_WIDGET_THEME.primary_color,
    logo_url: (raw.logo_url as string | null) ?? null,
    font_family: (raw.font_family as WidgetFontFamily) ?? DEFAULT_WIDGET_THEME.font_family,
    button_style: (raw.button_style as WidgetButtonStyle) ?? DEFAULT_WIDGET_THEME.button_style,
    button_text: (raw.button_text as string) ?? DEFAULT_WIDGET_THEME.button_text,
    accent_color: (raw.accent_color as string) ?? (raw.primary_color as string),
    background: (raw.background as string) ?? DEFAULT_WIDGET_THEME.background,
    border_radius: (raw.border_radius as string) ?? DEFAULT_WIDGET_THEME.border_radius,
  };
}

export function resolveWidgetTheme(marina: Marina, config: WidgetConfig | null): WidgetTheme {
  const fromConfig = parseWidgetTheme(config?.theme);
  return {
    ...fromConfig,
    primary_color: fromConfig.primary_color || marina.primary_color || DEFAULT_WIDGET_THEME.primary_color,
    logo_url: fromConfig.logo_url ?? marina.logo_url,
  };
}

export function buttonRadiusClass(style: WidgetButtonStyle): string {
  switch (style) {
    case "pill":
      return "rounded-full";
    case "square":
      return "rounded-none";
    default:
      return "rounded-lg";
  }
}

export function widgetThemeToCssVars(theme: WidgetTheme): Record<string, string> {
  return {
    "--widget-primary": theme.primary_color,
    "--widget-accent": theme.accent_color ?? theme.primary_color,
    "--widget-font": theme.font_family,
    "--widget-radius": theme.border_radius ?? "12px",
    "--widget-bg": theme.background ?? "#ffffff",
  };
}
