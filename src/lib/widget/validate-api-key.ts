import { createAdminClient } from "@/lib/supabase/admin";
import { marinaIdParamSchema } from "@/lib/validations/api.schema";
import bcrypt from "bcryptjs";

export interface WidgetAuthConfig {
  theme: Record<string, unknown>;
  allowed_origins: string[];
}

export type WidgetAuthResult =
  | { ok: true; config: WidgetAuthConfig }
  | { ok: false; error: string; status: number };

function isOriginAllowed(
  allowedOrigins: string[],
  request: Request
): boolean {
  if (!allowedOrigins.length) return true;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  return allowedOrigins.some((allowed) => {
    if (origin && (origin === allowed || origin.startsWith(allowed))) return true;
    if (referer && referer.startsWith(allowed)) return true;
    return false;
  });
}

/**
 * Validates widget API key via service role (never expose api_key_hash to anon client).
 */
export async function validateWidgetApiKey(
  marinaId: string,
  apiKey: string | null,
  request?: Request
): Promise<WidgetAuthResult> {
  const idParsed = marinaIdParamSchema.safeParse({ marinaId });
  if (!idParsed.success) {
    return { ok: false, error: "Invalid marina ID", status: 400 };
  }

  if (!apiKey?.trim()) {
    return { ok: false, error: "API key required", status: 401 };
  }

  const admin = createAdminClient();
  const { data: config, error } = await admin
    .from("widget_configs")
    .select("api_key_hash, is_enabled, allowed_origins, theme")
    .eq("marina_id", marinaId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Widget configuration error", status: 500 };
  }

  if (!config?.is_enabled) {
    return { ok: false, error: "Widget disabled", status: 403 };
  }

  const valid = await bcrypt.compare(apiKey, config.api_key_hash);
  if (!valid) {
    return { ok: false, error: "Invalid API key", status: 401 };
  }

  if (request && config.allowed_origins?.length > 0) {
    if (!isOriginAllowed(config.allowed_origins, request)) {
      return { ok: false, error: "Origin not allowed", status: 403 };
    }
  }

  return {
    ok: true,
    config: {
      theme: (config.theme as Record<string, unknown>) ?? {},
      allowed_origins: config.allowed_origins ?? [],
    },
  };
}
