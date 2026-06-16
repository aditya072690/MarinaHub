"use client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { MarinaSwitcher } from "@/components/dashboard/marina-switcher";
import { getNavItems, isNavActive } from "@/lib/dashboard/nav";
import type { NavItem } from "@/lib/dashboard/nav";
import { gsap } from "@/lib/animations/gsap-init";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/providers/sidebar-provider";
import { useMarina } from "@/providers/marina-provider";
import { useGSAP } from "@gsap/react";
import {
  Anchor,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const NAV_GROUPS: { label: string; hrefs: string[] }[] = [
  {
    label: "Operations",
    hrefs: [
      "/dashboard",
      "/dashboard/boats",
      "/dashboard/bookings",
      "/dashboard/calendar",
    ],
  },
  {
    label: "Customers",
    hrefs: [
      "/dashboard/customers",
      "/dashboard/activity",
      "/dashboard/waitlist",
      "/dashboard/customers/segments",
    ],
  },
  {
    label: "Intelligence",
    hrefs: ["/dashboard/analytics", "/dashboard/payments"],
  },
  {
    label: "Platform",
    hrefs: [
      "/dashboard/audit-logs",
      "/dashboard/widget",
      "/dashboard/notifications",
      "/dashboard/settings",
    ],
  },
];

function groupNavItems(links: NavItem[]) {
  const linkMap = new Map(links.map((link) => [link.href, link]));
  const used = new Set<string>();

  const groups = NAV_GROUPS.map((group) => {
    const items = group.hrefs
      .map((href) => linkMap.get(href))
      .filter((item): item is NavItem => {
        if (!item || used.has(item.href)) return false;
        used.add(item.href);
        return true;
      });
    return { label: group.label, items };
  }).filter((group) => group.items.length > 0);

  const remaining = links.filter((link) => !used.has(link.href));
  if (remaining.length > 0) {
    groups.push({ label: "More", items: remaining });
  }

  return groups;
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

interface SidebarNavProps {
  className?: string;
}

export function SidebarNav({ className }: SidebarNavProps) {
  const { marina, role } = useMarina();
  const { collapsed, toggleCollapsed, setMobileOpen } = useSidebar();
  const pathname = usePathname();
  const links = getNavItems(role);
  const navHrefs = links.map((link) => link.href);
  const groups = groupNavItems(links);
  const avatarInitial = marina.name.trim().charAt(0).toUpperCase() || "M";
  const asideRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const indicator = indicatorRef.current;
      const nav = navRef.current;
      if (!indicator || !nav) return;

      const activeItem = nav.querySelector<HTMLElement>(
        '.sb-item[data-active="true"]'
      );
      if (!activeItem) {
        gsap.to(indicator, { opacity: 0, duration: 0.2 });
        return;
      }

      const navRect = nav.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();

      gsap.to(indicator, {
        top: itemRect.top - navRect.top + nav.scrollTop,
        height: itemRect.height,
        opacity: 1,
        duration: 0.32,
        ease: "power3.out",
      });
    },
    { dependencies: [pathname, collapsed], scope: asideRef }
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setMobileOpen]);

  return (
    <aside
      ref={asideRef}
      className={cn("sidebar", collapsed && "sidebar--collapsed", className)}
      aria-label="Dashboard navigation"
      data-collapsed={collapsed}
    >
      <div className="sb-header">
        <div className="sb-logo-row">
          <div className="sb-logo-icon-wrap">
            <Anchor />
          </div>
          <div className="sb-logo-text-wrap min-w-0">
            <p className="sb-logo-name">MarinaHub</p>
            <p className="sb-logo-marina truncate">{marina.name}</p>
          </div>
          <button
            type="button"
            className="sb-close lg:hidden"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <MarinaSwitcher sidebar />
        <button
          type="button"
          className="sb-collapse-btn hidden lg:inline-flex"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="sb-nav-scroll">
        <nav ref={navRef} className="sb-nav">
          <span ref={indicatorRef} className="sb-active-indicator" aria-hidden />
          {groups.map((group, groupIndex) => (
            <div key={group.label}>
              {groupIndex > 0 && (
                <div className="sb-group-divider" aria-hidden="true" />
              )}
              <div className="sb-group-label">{group.label}</div>
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isNavActive(pathname, href, navHrefs);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn("sb-item", active && "active")}
                    data-active={active}
                    title={collapsed ? label : undefined}
                    onClick={() => {
                      if (window.innerWidth < 1024) setMobileOpen(false);
                    }}
                  >
                    <Icon className="sb-item-icon" />
                    <span className="sb-item-label">{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="sb-user-area">
        <div className="sb-user-card" title={collapsed ? marina.name : undefined}>
          <div className="sb-avatar" aria-hidden="true">
            {avatarInitial}
          </div>
          <div className="sb-user-meta">
            <p className="sb-user-name">{marina.name}</p>
            <p className="sb-user-role">{formatRole(role ?? "member")}</p>
          </div>
        </div>
        <SignOutButton
          variant="ghost"
          className="sb-signout-btn"
          label="Sign out"
          showIcon
        />
      </div>
    </aside>
  );
}
