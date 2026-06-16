import type { AuthError } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export function isRefreshTokenNotFound(error: AuthError | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "refresh_token_not_found" ||
    error.message.toLowerCase().includes("refresh token not found")
  );
}

/** Clears a stale Supabase session when the refresh token is invalid. */
export async function clearStaleSupabaseSession(
  supabase: SupabaseClient
): Promise<void> {
  await supabase.auth.signOut();
}
