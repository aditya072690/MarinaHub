import { MARINA_COOKIE } from "@/lib/auth/intent";
import { cookies } from "next/headers";

export async function setActiveMarinaCookie(marinaId: string) {
  const cookieStore = await cookies();
  cookieStore.set(MARINA_COOKIE, marinaId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
