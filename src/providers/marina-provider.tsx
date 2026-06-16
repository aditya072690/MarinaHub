"use client";

import type { Marina, MarinaMember, UserRole } from "@/types/database";
import { createContext, useContext } from "react";

interface MarinaContextValue {
  marina: Marina;
  role: UserRole;
  userId: string;
  memberships: (MarinaMember & { marinas: Marina })[];
}

const MarinaContext = createContext<MarinaContextValue | null>(null);

export function MarinaProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: MarinaContextValue;
}) {
  return (
    <MarinaContext.Provider value={value}>{children}</MarinaContext.Provider>
  );
}

export function useMarina() {
  const ctx = useContext(MarinaContext);
  if (!ctx) throw new Error("useMarina must be used within MarinaProvider");
  return ctx;
}
