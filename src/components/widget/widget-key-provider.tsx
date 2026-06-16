"use client";

import { useEffect, useState } from "react";

const STORAGE_PREFIX = "mh_widget_key_";

interface WidgetKeyProviderProps {
  marinaId: string;
  children: (apiKey: string | null, ready: boolean) => React.ReactNode;
}

/**
 * Receives the widget API key from the parent embed script via postMessage.
 * Avoids putting secrets in the iframe URL (logs, Referer leakage).
 */
export function WidgetKeyProvider({ marinaId, children }: WidgetKeyProviderProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storageKey = `${STORAGE_PREFIX}${marinaId}`;
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      setApiKey(stored);
      setReady(true);
    }

    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (
        data?.type === "MARINAHUB_WIDGET_KEY" &&
        data?.marinaId === marinaId &&
        typeof data?.key === "string"
      ) {
        sessionStorage.setItem(storageKey, data.key);
        setApiKey(data.key);
        setReady(true);
      }
    }

    window.addEventListener("message", handleMessage);

    if (window.parent !== window) {
      window.parent.postMessage(
        { type: "MARINAHUB_WIDGET_READY", marinaId },
        "*"
      );
    } else if (!stored) {
      setReady(true);
    }

    return () => window.removeEventListener("message", handleMessage);
  }, [marinaId]);

  return <>{children(apiKey, ready)}</>;
}
