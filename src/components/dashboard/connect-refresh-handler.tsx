"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/** Stripe Connect refresh_url lands here — prompt owner to resume onboarding. */
export function ConnectRefreshHandler() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connect = params.get("connect");

    if (connect === "refresh") {
      toast.info("Stripe session expired — click Connect Stripe to continue setup.");
    } else if (connect === "success") {
      toast.success("Stripe account connected successfully.");
    } else if (connect === "pending") {
      toast.warning("Stripe setup incomplete — finish remaining steps.");
    } else if (connect === "error") {
      toast.error("Could not complete Stripe setup. Please try again.");
    } else if (connect === "forbidden") {
      toast.error("Only marina owners can connect Stripe.");
    }
  }, []);

  return null;
}
