"use client";

import { ConsumerUserMenu } from "@/components/consumer/consumer-user-menu";
import { MarinaHubLogo } from "@/components/consumer/marina-hub-logo";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface ConsumerNavProps {
  variant?: "marketing" | "consumer";
  user: {
    email: string;
    fullName: string | null;
    hasMarinaAccess: boolean;
  } | null;
}

const navLinkBase =
  "relative inline-flex cursor-pointer items-center text-sm font-medium tracking-[0.01em] text-[var(--nav-text-muted)] transition-colors duration-200 ease-in-out hover:text-[var(--nav-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)] rounded-sm";

const navLinkWake =
  "after:absolute after:bottom-[-6px] after:left-0 after:h-0.5 after:w-0 after:bg-[var(--nav-accent)] motion-safe:after:transition-[width] motion-safe:after:duration-[250ms] motion-safe:after:ease-in-out motion-reduce:after:transition-none aria-[current=page]:after:w-full";

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)]";

function NavTextLink({
  href,
  label,
  isActive,
  onNavigate,
  className,
}: {
  href: string;
  label: string;
  isActive: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
      className={cn(navLinkBase, navLinkWake, className)}
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      {label}
    </Link>
  );
}

function SignUpButton({
  onNavigate,
  fullWidth = false,
}: {
  onNavigate?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <Link
      href="/account/signup"
      onClick={onNavigate}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[var(--nav-accent)] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_0_0_transparent] transition-[background-color,box-shadow] duration-200 ease-in-out hover:bg-[var(--nav-accent-hover)] hover:shadow-[0_0_12px_rgba(26,157,196,0.35)]",
        focusRing,
        fullWidth && "w-full"
      )}
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      Sign up
      <span aria-hidden="true">▶</span>
    </Link>
  );
}

function MarinaLoginButton({
  onNavigate,
  fullWidth = false,
  isActive = false,
}: {
  onNavigate?: () => void;
  fullWidth?: boolean;
  isActive?: boolean;
}) {
  return (
    <Link
      href="/marina/login"
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[rgba(26,157,196,0.5)] px-[18px] py-2 text-sm font-semibold text-[var(--nav-accent)] transition-colors duration-200 ease-in-out hover:border-[var(--nav-accent)]",
        focusRing,
        fullWidth && "w-full"
      )}
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      Marina Login
    </Link>
  );
}

function HamburgerButton({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-controls="mobile-nav-drawer"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      onClick={onToggle}
      className={cn(
        "relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm md:hidden",
        focusRing
      )}
    >
      <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
      <span
        className={cn(
          "absolute block h-0.5 w-5 bg-[var(--nav-text)] motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none",
          isOpen ? "translate-y-0 rotate-45" : "-translate-y-1.5"
        )}
      />
      <span
        className={cn(
          "absolute block h-0.5 w-5 bg-[var(--nav-text)] motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none",
          isOpen ? "opacity-0" : "opacity-100"
        )}
      />
      <span
        className={cn(
          "absolute block h-0.5 w-5 bg-[var(--nav-text)] motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none",
          isOpen ? "translate-y-0 -rotate-45" : "translate-y-1.5"
        )}
      />
    </button>
  );
}

export function ConsumerNav({ variant = "consumer", user }: ConsumerNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (headerRef.current && !headerRef.current.contains(target)) {
        setMobileOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [mobileOpen]);

  const exploreLabel = variant === "marketing" ? "Explore" : "Explore boats";
  const exploreHref = "/search";

  const isExploreActive =
    pathname === "/search" || pathname.startsWith("/search/");
  const isSignInActive = pathname === "/account/login";
  const isMarinaLoginActive = pathname === "/marina/login";

  return (
    <header
      ref={headerRef}
      data-main-header
      className="sticky top-0 z-50 h-16 overflow-x-clip border-b border-[var(--nav-border)] bg-[rgba(11,31,58,0.96)] backdrop-blur-[12px] transition-[background,box-shadow] duration-300 ease-in-out"
    >
      <div className="landing-container flex h-full items-center justify-between gap-4 px-5 md:px-8 xl:px-10">
        <MarinaHubLogo />

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-8 md:flex"
        >
          <NavTextLink
            href={exploreHref}
            label={exploreLabel}
            isActive={isExploreActive}
          />
          {user ? (
            <ConsumerUserMenu
              email={user.email}
              fullName={user.fullName}
              hasMarinaAccess={user.hasMarinaAccess}
              navTheme
            />
          ) : (
            <>
              <NavTextLink
                href="/account/login"
                label="Sign in"
                isActive={isSignInActive}
              />
              <SignUpButton />
              {variant === "marketing" && (
                <MarinaLoginButton isActive={isMarinaLoginActive} />
              )}
            </>
          )}
        </nav>

        <HamburgerButton
          isOpen={mobileOpen}
          onToggle={() => setMobileOpen((open) => !open)}
        />
      </div>

      <div
        id="mobile-nav-drawer"
        aria-hidden={!mobileOpen}
        className={cn(
          "overflow-hidden border-t border-[var(--nav-border)] bg-[var(--nav-bg)] md:hidden",
          "motion-safe:transition-[max-height] motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none",
          mobileOpen ? "max-h-96" : "max-h-0"
        )}
      >
        <nav
          aria-label="Main navigation"
          className="flex flex-col gap-4 px-5 py-4"
        >
          <NavTextLink
            href={exploreHref}
            label={exploreLabel}
            isActive={isExploreActive}
            onNavigate={closeMobile}
          />
          {user ? (
            <ConsumerUserMenu
              email={user.email}
              fullName={user.fullName}
              hasMarinaAccess={user.hasMarinaAccess}
              navTheme
            />
          ) : (
            <>
              <NavTextLink
                href="/account/login"
                label="Sign in"
                isActive={isSignInActive}
                onNavigate={closeMobile}
              />
              {variant === "marketing" && (
                <MarinaLoginButton
                  onNavigate={closeMobile}
                  fullWidth
                  isActive={isMarinaLoginActive}
                />
              )}
              <div className="pt-2">
                <SignUpButton onNavigate={closeMobile} fullWidth />
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
