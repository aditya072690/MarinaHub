"use client";

import { WidgetThemeForm } from "@/components/dashboard/widget-theme-form";
import { generateWidgetKey, updateWidgetConfig } from "@/actions/widget";
import { DashCard, DashCardContent, DashCardHeader, DashCardTitle } from "@/components/dashboard/dash-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Marina, WidgetConfig } from "@/types/database";
import { Code2, Copy, Key, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function WidgetConfigPanel({
  marina,
  config,
}: {
  marina: Marina;
  config: WidgetConfig | null;
}) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const embedCode = `<script
  src="${appUrl}/widget/embed.js"
  data-marina="${marina.id}"
  data-key="YOUR_API_KEY"
  data-app-url="${appUrl}"
></script>`;

  async function handleGenerateKey() {
    setGenerating(true);
    const result = await generateWidgetKey(marina.id);
    setGenerating(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setApiKey(result.data.apiKey);
    toast.success("API key generated — copy it now, it won't be shown again.");
  }

  async function handleSaveOrigins(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const origins = (fd.get("origins") as string)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const result = await updateWidgetConfig(marina.id, { allowed_origins: origins });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Widget config saved");
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="dash-page widget-builder-page" data-dash-page>
      <div className="dash-page-header-row" data-dash-animate>
        <div className="dash-page-header">
          <h1 className="dash-page-title">Booking Widget</h1>
          <p className="dash-page-subtitle">
            Customize appearance and embed on your website
          </p>
        </div>
      </div>

      <WidgetThemeForm marina={marina} config={config} />

      <div className="widget-builder-grid widget-builder-grid--secondary" data-dash-animate>
        <DashCard hover={false}>
          <DashCardHeader>
            <div className="widget-card-heading">
              <div className="widget-card-icon-wrap">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <DashCardTitle className="dash-card-title-lg">API Key</DashCardTitle>
                <p className="dash-card-meta">
                  Generate an API key for secure widget embedding on external sites.
                </p>
              </div>
            </div>
          </DashCardHeader>
          <DashCardContent>
            <Button onClick={handleGenerateKey} disabled={generating}>
              <Key className="mr-2 h-4 w-4" />
              {config ? "Regenerate API Key" : "Generate API Key"}
            </Button>
            {apiKey ? (
              <div className="widget-api-key-banner">
                <p className="font-medium">Your API key (save now)</p>
                <code className="break-all text-xs">{apiKey}</code>
              </div>
            ) : null}
          </DashCardContent>
        </DashCard>

        <DashCard hover={false}>
          <DashCardHeader>
            <div className="widget-card-heading">
              <div className="widget-card-icon-wrap">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <DashCardTitle className="dash-card-title-lg">Allowed Origins</DashCardTitle>
                <p className="dash-card-meta">Comma-separated domains allowed to embed your widget.</p>
              </div>
            </div>
          </DashCardHeader>
          <DashCardContent>
            <form onSubmit={handleSaveOrigins} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="widget-origins">Domains</Label>
                <Input
                  id="widget-origins"
                  name="origins"
                  placeholder="https://partner.com, https://www.partner.com"
                  defaultValue={config?.allowed_origins?.join(", ") ?? ""}
                  className="dash-input"
                />
              </div>
              <Button type="submit" variant="outline">
                Save Origins
              </Button>
            </form>
          </DashCardContent>
        </DashCard>
      </div>

      <DashCard hover={false} data-dash-animate>
        <DashCardHeader>
          <div className="widget-card-heading">
            <div className="widget-card-icon-wrap">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <DashCardTitle className="dash-card-title-lg">Embed Code</DashCardTitle>
              <p className="dash-card-meta">
                Paste this script tag on any page where you want the booking widget.
              </p>
            </div>
          </div>
        </DashCardHeader>
        <DashCardContent>
          <div className="widget-embed-wrap">
            <pre className="widget-embed-code">{embedCode}</pre>
            <Button
              size="icon"
              variant="ghost"
              className="widget-embed-copy"
              onClick={() => copyToClipboard(embedCode)}
              aria-label="Copy embed code"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DashCardContent>
      </DashCard>
    </div>
  );
}
