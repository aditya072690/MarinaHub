"use client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { prefersReducedMotion } from "@/lib/animations/prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Heart, Settings, Ship, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef } from "react";
import type { LucideIcon } from "lucide-react";

gsap.registerPlugin(useGSAP);

const accountLinks: {
  href: string;
  label: string;
  exact?: boolean;
  icon: LucideIcon;
}[] = [
  { href: "/account/trips", label: "My Trips", icon: Ship },
  { href: "/account/favorites", label: "Favorites", icon: Heart },
  { href: "/account", label: "Profile", exact: true, icon: User },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

function isLinkActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function useActiveHref(pathname: string) {
  return (
    accountLinks.find((link) =>
      isLinkActive(pathname, link.href, link.exact)
    )?.href ?? accountLinks[0].href
  );
}

function DesktopNavLink({
  href,
  label,
  icon: Icon,
  active,
  linkRef,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  linkRef: (el: HTMLAnchorElement | null) => void;
}) {
  return (
    <Link
      ref={linkRef}
      href={href}
      className={cn(
        "account-nav-item relative z-10 flex items-center gap-2.5 rounded-r-md px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "font-semibold text-marina-navy"
          : "text-slate-600 hover:bg-slate-50"
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          active ? "text-marina-teal opacity-100" : "opacity-70"
        )}
        aria-hidden
      />
      <span>{label}</span>
    </Link>
  );
}

function MobileNavLink({
  href,
  label,
  icon: Icon,
  active,
  linkRef,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  linkRef: (el: HTMLAnchorElement | null) => void;
  onNavigate: (href: string, el: HTMLAnchorElement) => void;
}) {
  return (
    <Link
      ref={linkRef}
      href={href}
      onClick={(e) => onNavigate(href, e.currentTarget)}
      className={cn(
        "account-nav-item relative z-10 flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "border-marina-teal/30 bg-marina-navy font-semibold text-white"
          : "border-marina-border bg-white text-slate-600 hover:bg-slate-50"
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          active ? "text-marina-teal" : "opacity-70"
        )}
        aria-hidden
      />
      <span>{label}</span>
    </Link>
  );
}

export function AccountSidebarMobileTabs() {
  const pathname = usePathname();
  const mobileTabBarRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const setLinkRef = useCallback(
    (href: string) => (el: HTMLAnchorElement | null) => {
      linkRefs.current[href] = el;
    },
    []
  );

  const handleMobileTabNavigate = useCallback(
    (_href: string, tabEl: HTMLAnchorElement) => {
      const tabBar = mobileTabBarRef.current;
      if (!tabBar) return;

      if (!prefersReducedMotion()) {
        gsap.to(tabBar, {
          scrollLeft: tabEl.offsetLeft - 16,
          duration: 0.3,
          ease: "power2.out",
        });
      } else {
        tabBar.scrollLeft = tabEl.offsetLeft - 16;
      }
    },
    []
  );

  return (
    <div className="col-span-1 row-start-1 border-b border-marina-border bg-white lg:hidden">
      <div
        ref={mobileTabBarRef}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-4 py-3 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Account navigation"
      >
        {accountLinks.map((link) => (
          <MobileNavLink
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            active={isLinkActive(pathname, link.href, link.exact)}
            linkRef={setLinkRef(link.href)}
            onNavigate={handleMobileTabNavigate}
          />
        ))}
      </div>
    </div>
  );
}

export function AccountSidebarDesktop() {
  const pathname = usePathname();
  const activeHref = useActiveHref(pathname);
  const desktopNavRef = useRef<HTMLElement>(null);
  const desktopIndicatorRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const setLinkRef = useCallback(
    (href: string) => (el: HTMLAnchorElement | null) => {
      linkRefs.current[href] = el;
    },
    []
  );

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".account-nav-item", {
        x: -12,
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
        stagger: 0.06,
      });
    },
    { scope: desktopNavRef }
  );

  useGSAP(
    () => {
      const el = linkRefs.current[activeHref];
      const indicator = desktopIndicatorRef.current;
      if (!el || !indicator) return;

      const props = {
        y: el.offsetTop,
        height: el.offsetHeight,
        width: "100%",
      };

      if (prefersReducedMotion()) {
        gsap.set(indicator, props);
        return;
      }

      gsap.to(indicator, {
        ...props,
        duration: 0.3,
        ease: "power2.inOut",
      });
    },
    { dependencies: [activeHref] }
  );

  return (
    <aside className="relative hidden bg-white lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:self-stretch lg:border-r lg:border-marina-border">
      <nav
        ref={desktopNavRef}
        className="relative flex flex-1 flex-col p-4"
        aria-label="Account navigation"
      >
        <div
          ref={desktopIndicatorRef}
          className="pointer-events-none absolute left-0 right-0 rounded-r-md border-l-[3px] border-marina-teal bg-teal-50"
          aria-hidden
        />
        <div className="flex flex-col gap-0.5">
          {accountLinks.map((link) => (
            <DesktopNavLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={isLinkActive(pathname, link.href, link.exact)}
              linkRef={setLinkRef(link.href)}
            />
          ))}
        </div>
        <div className="mt-auto border-t border-marina-border pt-4">
          <SignOutButton
            variant="outline"
            size="sm"
            className="w-full border-marina-border text-slate-600 hover:bg-slate-50 hover:text-marina-navy"
          />
        </div>
      </nav>
    </aside>
  );
}

export function AccountMobileSignOut() {
  return (
    <div className="border-t border-marina-border px-4 pb-4 pt-6 sm:px-6 lg:hidden">
      <SignOutButton
        variant="outline"
        size="sm"
        className="w-full border-marina-border text-slate-600 hover:bg-slate-50 hover:text-marina-navy"
      />
    </div>
  );
}
