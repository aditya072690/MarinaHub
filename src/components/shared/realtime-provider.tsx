"use client";

import { useRealtimeMarina } from "@/hooks/use-realtime-marina";

export function RealtimeProvider({
  marinaId,
  boatId,
  children,
}: {
  marinaId: string;
  boatId?: string;
  children: React.ReactNode;
}) {
  useRealtimeMarina(marinaId, boatId);
  return <>{children}</>;
}
