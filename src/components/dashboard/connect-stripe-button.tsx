"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { connectStatusLabel } from "@/lib/payments/mock-stripe";
import type { StripeConnectStatus } from "@/types/database";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function ConnectStripeButton({
  marinaId,
  status,
  stripeConfigured,
}: {
  marinaId: string;
  status: StripeConnectStatus;
  stripeConfigured: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!stripeConfigured) {
      toast.error("Stripe is not configured on this server");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marinaId }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        toast.error(data?.error ?? "Could not start Stripe onboarding");
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  if (status === "connected") {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">
        Connected Account ✓
      </Badge>
    );
  }

  const label =
    status === "pending" ? "Complete Stripe Setup" : "Connect Stripe";

  return (
    <Button onClick={handleClick} disabled={loading || !stripeConfigured} variant="outline">
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

export function StripeStatusBadge({ status }: { status: StripeConnectStatus }) {
  const variants: Record<StripeConnectStatus, string> = {
    connected: "bg-emerald-600 hover:bg-emerald-600",
    pending: "bg-amber-500 hover:bg-amber-500",
    restricted: "bg-red-600 hover:bg-red-600",
    not_connected: "bg-slate-500 hover:bg-slate-500",
  };
  return (
    <Badge className={variants[status]}>{connectStatusLabel(status)}</Badge>
  );
}
