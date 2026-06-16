"use client";

import { signOut } from "@/actions/sign-out";
import { switchAuthContext } from "@/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { prefersReducedMotion } from "@/lib/animations/prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Heart, LogOut, Ship, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

interface ConsumerUserMenuProps {
  email: string;
  fullName: string | null;
  hasMarinaAccess: boolean;
  navTheme?: boolean;
}

export function ConsumerUserMenu({
  email,
  fullName,
  hasMarinaAccess,
  navTheme = false,
}: ConsumerUserMenuProps) {
  const router = useRouter();
  const avatarRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!avatarRef.current || prefersReducedMotion()) return;
      gsap.from(avatarRef.current, {
        scale: 0.8,
        opacity: 0,
        duration: 0.35,
        ease: "back.out(1.6)",
        delay: 0.2,
      });
    },
    { scope: avatarRef }
  );

  const displayName = fullName?.trim() || email || "Account";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({
            variant: navTheme ? "ghost" : "outline",
            size: "sm",
          }),
          "gap-2 pl-1.5",
          navTheme &&
            "border border-[rgba(26,157,196,0.35)] text-[var(--nav-text)] hover:bg-white/5 hover:text-[var(--nav-text)] focus-visible:ring-[var(--nav-accent)] focus-visible:ring-offset-[var(--nav-bg)]"
        )}
      >
        <span ref={avatarRef} className="inline-flex">
          <Avatar className="h-6 w-6">
            <AvatarFallback
              className={cn(
                "text-xs",
                navTheme
                  ? "bg-marina-sky/25 text-marina-sky"
                  : "bg-sky-100 text-sky-700"
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        </span>
        <span className="hidden max-w-[120px] truncate min-[480px]:inline">
          {fullName ?? "Account"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{fullName ?? "My Account"}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => router.push("/account")}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/account/trips")}>
            Upcoming Trips
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/account/favorites")}>
            <Heart className="mr-2 h-4 w-4" />
            Favorites
          </DropdownMenuItem>
          {hasMarinaAccess && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => switchAuthContext("marina")}>
                <Ship className="mr-2 h-4 w-4" />
                Marina Dashboard
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
