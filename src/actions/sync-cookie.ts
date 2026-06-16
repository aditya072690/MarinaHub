"use server";

import { setActiveMarinaCookie } from "@/lib/auth/cookies";

/** Write mh_marina cookie only — membership is validated at login / marina switch. */
export async function syncActiveMarinaCookie(marinaId: string) {
  await setActiveMarinaCookie(marinaId);
}
