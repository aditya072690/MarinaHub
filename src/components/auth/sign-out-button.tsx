"use client";

import { signOut } from "@/actions/sign-out";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, LogOut } from "lucide-react";
import { useState } from "react";

export function SignOutButton({
  variant = "ghost",
  size = "sm",
  className,
  label = "Sign out",
  showIcon = true,
}: {
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: string;
  showIcon?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await signOut();
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={loading}
      className={cn("gap-1.5", className)}
      onClick={handleSignOut}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        showIcon && <LogOut className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
