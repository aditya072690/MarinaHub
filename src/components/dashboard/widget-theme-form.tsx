"use client";

import { updateWidgetConfig, uploadWidgetLogo } from "@/actions/widget";
import { WidgetThemePreview } from "@/components/widget/widget-theme-preview";
import {
  DashCard,
  DashCardContent,
  DashCardHeader,
  DashCardTitle,
} from "@/components/dashboard/dash-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gsap } from "@/lib/animations/gsap-init";
import {
  DEFAULT_WIDGET_THEME,
  parseWidgetTheme,
  resolveWidgetTheme,
  WIDGET_BUTTON_STYLES,
  WIDGET_FONT_OPTIONS,
  type WidgetTheme,
} from "@/lib/widget/theme";
import type { Marina, WidgetConfig } from "@/types/database";
import { useGSAP } from "@gsap/react";
import { Loader2, Monitor, Palette, Smartphone } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const THEME_PRESETS: { name: string; theme: Partial<WidgetTheme> }[] = [
  {
    name: "Ocean",
    theme: {
      primary_color: "#1A9DC4",
      button_style: "rounded",
      border_radius: "12px",
    },
  },
  {
    name: "Harbor",
    theme: {
      primary_color: "#0d9488",
      button_style: "pill",
      border_radius: "16px",
    },
  },
  {
    name: "Midnight",
    theme: {
      primary_color: "#0b1f3a",
      button_style: "square",
      border_radius: "4px",
    },
  },
  {
    name: "Sunset",
    theme: {
      primary_color: "#ea580c",
      button_style: "rounded",
      border_radius: "10px",
    },
  },
];

type PreviewDevice = "desktop" | "mobile";

export function WidgetThemeForm({
  marina,
  config,
}: {
  marina: Marina;
  config: WidgetConfig | null;
}) {
  const resolved = resolveWidgetTheme(marina, config);
  const [theme, setTheme] = useState<WidgetTheme>(resolved);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const previewPanelRef = useRef<HTMLDivElement>(null);

  function update<K extends keyof WidgetTheme>(key: K, value: WidgetTheme[K]) {
    setTheme((prev) => ({ ...prev, [key]: value }));
  }

  useGSAP(
    () => {
      const panel = previewPanelRef.current;
      if (!panel) return;

      gsap.fromTo(
        panel,
        { opacity: 0.7, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" }
      );
    },
    { dependencies: [theme, previewDevice] }
  );

  async function handleSave() {
    setSaving(true);
    const result = await updateWidgetConfig(marina.id, {
      theme: theme as unknown as Record<string, unknown>,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Widget appearance saved");
  }

  return (
    <div className="widget-builder-layout" data-dash-animate>
      <DashCard hover={false} className="widget-controls-panel">
        <DashCardHeader>
          <div className="widget-card-heading">
            <div className="widget-card-icon-wrap">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <DashCardTitle className="dash-card-title-lg">
                Brand & Appearance
              </DashCardTitle>
              <p className="dash-card-meta">
                Choose a preset or fine-tune colors, typography, and button style.
              </p>
            </div>
          </div>
        </DashCardHeader>
        <DashCardContent className="space-y-6">
          <div className="widget-preset-grid">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="widget-preset-card"
                onClick={() => setTheme((prev) => ({ ...prev, ...preset.theme }))}
              >
                <span
                  className="widget-preset-swatch"
                  style={{ background: preset.theme.primary_color }}
                />
                <span className="widget-preset-name">{preset.name}</span>
              </button>
            ))}
          </div>

          <div className="widget-field">
            <Label htmlFor="primary_color">Primary color</Label>
            <div className="widget-color-row">
              <input
                id="primary_color"
                type="color"
                value={theme.primary_color}
                onChange={(e) => update("primary_color", e.target.value)}
                className="widget-color-swatch-input"
              />
              <Input
                value={theme.primary_color}
                onChange={(e) => update("primary_color", e.target.value)}
                className="font-mono text-sm dash-input"
              />
            </div>
          </div>

          <div className="widget-field">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              value={theme.logo_url ?? ""}
              onChange={(e) => update("logo_url", e.target.value || null)}
              placeholder="https://..."
              className="dash-input"
            />
            <div className="widget-upload-row">
              <Input
                type="file"
                accept="image/*"
                disabled={uploading}
                className="dash-input"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  const fd = new FormData();
                  fd.append("file", file);
                  const result = await uploadWidgetLogo(marina.id, fd);
                  setUploading(false);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  update("logo_url", result.data);
                  toast.success("Logo uploaded");
                }}
              />
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            </div>
          </div>

          <div className="widget-field-grid">
            <div className="widget-field">
              <Label>Font</Label>
              <Select
                value={theme.font_family}
                onValueChange={(v) =>
                  update("font_family", v as WidgetTheme["font_family"])
                }
              >
                <SelectTrigger className="dash-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDGET_FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="widget-field">
              <Label>Button text</Label>
              <Input
                value={theme.button_text}
                onChange={(e) => update("button_text", e.target.value)}
                placeholder="Book Now"
                className="dash-input"
              />
            </div>
          </div>

          <div className="widget-field">
            <Label>Border radius ({theme.border_radius ?? "12px"})</Label>
            <input
              type="range"
              min={0}
              max={24}
              value={parseInt(theme.border_radius ?? "12", 10) || 12}
              onChange={(e) => update("border_radius", `${e.target.value}px`)}
              className="widget-range"
            />
          </div>

          <div className="widget-field">
            <Label>Button style</Label>
            <div className="widget-style-toggle">
              {WIDGET_BUTTON_STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={cn(
                    "widget-style-btn",
                    theme.button_style === s.value && "widget-style-btn--active"
                  )}
                  onClick={() => update("button_style", s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="widget-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setTheme(
                  parseWidgetTheme(
                    DEFAULT_WIDGET_THEME as unknown as Record<string, unknown>
                  )
                )
              }
            >
              Reset defaults
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save appearance
            </Button>
          </div>
        </DashCardContent>
      </DashCard>

      <div ref={previewPanelRef} className="widget-preview-panel">
        <div className="widget-preview-toolbar">
          <p className="widget-preview-label">Live preview</p>
          <div className="widget-device-toggle" role="group" aria-label="Preview device">
            <button
              type="button"
              className={cn(
                "widget-device-btn",
                previewDevice === "desktop" && "widget-device-btn--active"
              )}
              onClick={() => setPreviewDevice("desktop")}
              aria-pressed={previewDevice === "desktop"}
            >
              <Monitor className="h-4 w-4" />
              Desktop
            </button>
            <button
              type="button"
              className={cn(
                "widget-device-btn",
                previewDevice === "mobile" && "widget-device-btn--active"
              )}
              onClick={() => setPreviewDevice("mobile")}
              aria-pressed={previewDevice === "mobile"}
            >
              <Smartphone className="h-4 w-4" />
              Mobile
            </button>
          </div>
        </div>
        <WidgetThemePreview
          marinaId={marina.id}
          theme={theme}
          device={previewDevice}
        />
      </div>
    </div>
  );
}
