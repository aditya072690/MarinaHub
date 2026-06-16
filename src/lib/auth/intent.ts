import { cookies } from "next/headers";

export type AuthIntent = "consumer" | "marina";

export const INTENT_COOKIE = "mh_intent";
export const MARINA_COOKIE = "mh_marina";

export async function setAuthIntent(intent: AuthIntent) {
  const cookieStore = await cookies();
  cookieStore.set(INTENT_COOKIE, intent, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(INTENT_COOKIE);
  cookieStore.delete(MARINA_COOKIE);
}

export async function getAuthIntent(): Promise<AuthIntent | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(INTENT_COOKIE)?.value;
  if (value === "consumer" || value === "marina") return value;
  return null;
}

export function parseAuthIntent(value: string | undefined): AuthIntent | null {
  if (value === "consumer" || value === "marina") return value;
  return null;
}

export function isSafeRedirect(path: string | null | undefined): path is string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return false;
  }

  if (path.includes("\\") || path.includes("%5c") || path.includes("%5C")) {
    return false;
  }

  try {
    const resolved = new URL(path, "http://localhost");
    return resolved.host === "localhost" && resolved.pathname === path.split("?")[0];
  } catch {
    return false;
  }
}
