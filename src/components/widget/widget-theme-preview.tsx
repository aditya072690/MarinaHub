"use client";

import type { WidgetTheme } from "@/lib/widget/theme";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

const PREVIEW_MESSAGE = "MARINAHUB_THEME_PREVIEW";

export function WidgetThemePreview({
  marinaId,
  theme,
  device = "desktop",
}: {
  marinaId: string;
  theme: WidgetTheme;
  device?: "desktop" | "mobile";
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const timer = setTimeout(() => {
      iframe.contentWindow?.postMessage(
        { type: PREVIEW_MESSAGE, theme },
        appUrl
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [theme, appUrl]);

  return (
    <div
      className={cn(
        "widget-preview-frame",
        device === "mobile" && "widget-preview-frame--mobile"
      )}
    >
      <div className="widget-preview-chrome">
        <span className="widget-preview-dot" />
        <span className="widget-preview-dot" />
        <span className="widget-preview-dot" />
      </div>
      <iframe
        ref={iframeRef}
        src={`${appUrl}/embed/${marinaId}?preview=1`}
        title="Widget preview"
        className="widget-preview-iframe"
        onLoad={() => {
          iframeRef.current?.contentWindow?.postMessage(
            { type: PREVIEW_MESSAGE, theme },
            appUrl
          );
        }}
      />
    </div>
  );
}

export { PREVIEW_MESSAGE };
