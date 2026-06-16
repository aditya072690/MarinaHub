"use client";

import { DashboardPageAnimator } from "@/components/dashboard/dashboard-page-animator";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import type { NotificationsBellData } from "@/lib/data/notifications-bell";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { gsap } from "@/lib/animations/gsap-init";
import { SidebarProvider, useSidebar } from "@/providers/sidebar-provider";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

function DashboardShellInner({
  children,
  showConsumerSwitch,
  initialNotifications,
}: {
  children: React.ReactNode;
  showConsumerSwitch?: boolean;
  initialNotifications: NotificationsBellData;
}) {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const sidebarRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    sidebarRef.current = document.querySelector(".sidebar");
  }, []);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    const overlay = document.querySelector(".sb-overlay");
    const hamburger = document.querySelector(".sb-hamburger");
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!(sidebar instanceof HTMLElement)) return;

    if (mobileOpen) {
      sidebar.classList.add("sidebar-open");
      overlay?.classList.add("sb-overlay-visible");
      if (overlay instanceof HTMLElement) overlay.style.display = "block";
      hamburger?.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      sidebar.setAttribute("role", "dialog");
      sidebar.setAttribute("aria-modal", "true");

      if (!prefersReducedMotion) {
        gsap.fromTo(
          sidebar,
          { x: "-100%" },
          { x: 0, duration: 0.42, ease: "power3.inOut" }
        );
        if (overlay instanceof HTMLElement) {
          gsap.fromTo(
            overlay,
            { opacity: 0 },
            { opacity: 1, duration: 0.35, ease: "power2.out" }
          );
        }
        gsap.from(".sb-item", {
          x: -12,
          opacity: 0,
          duration: 0.28,
          stagger: 0.03,
          ease: "power2.out",
          delay: 0.1,
        });
      }
    } else {
      sidebar.classList.remove("sidebar-open");
      overlay?.classList.remove("sb-overlay-visible");
      if (overlay instanceof HTMLElement) overlay.style.display = "none";
      hamburger?.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      sidebar.removeAttribute("role");
      sidebar.removeAttribute("aria-modal");

      if (!prefersReducedMotion && window.innerWidth < 1024) {
        gsap.set(sidebar, { x: "-100%" });
      } else {
        gsap.set(sidebar, { clearProps: "transform" });
      }
    }
  }, [mobileOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setMobileOpen]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion || window.innerWidth < 1024) return;

    let frame2 = 0;
    let timeline: gsap.core.Timeline | undefined;

    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        if (!document.querySelector(".sidebar")) return;

        timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
        timeline
          .from(".sidebar", {
            x: -20,
            opacity: 0,
            duration: 0.5,
            immediateRender: false,
          })
          .from(
            ".sb-header",
            { opacity: 0, y: -10, duration: 0.35, immediateRender: false },
            0.2
          )
          .from(
            ".sb-group-label",
            {
              opacity: 0,
              x: -8,
              duration: 0.25,
              stagger: 0.08,
              immediateRender: false,
            },
            0.3
          )
          .from(
            ".sb-item",
            {
              opacity: 0,
              x: -12,
              duration: 0.3,
              stagger: 0.04,
              immediateRender: false,
            },
            0.35
          )
          .from(
            ".sb-user-area",
            { opacity: 0, y: 10, duration: 0.3, immediateRender: false },
            0.55
          );
      });
    });

    return () => {
      cancelAnimationFrame(frame1);
      if (frame2) cancelAnimationFrame(frame2);
      timeline?.kill();
    };
  }, []);

  return (
    <div
      className={cn(
        "dashboard-shell flex h-screen overflow-hidden bg-slate-50",
        mobileOpen && "dashboard-shell--mobile-nav-open"
      )}
    >
      <div
        className={cn("sb-overlay", mobileOpen && "sb-overlay-visible")}
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
      />
      <SidebarNav />

      <main className="dashboard-main flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="dash-content-wrap">
            <DashboardTopBar
              showConsumerSwitch={showConsumerSwitch}
              initialNotifications={initialNotifications}
            />
            <DashboardPageAnimator>{children}</DashboardPageAnimator>
          </div>
        </div>
      </main>
    </div>
  );
}

export function DashboardShell({
  children,
  showConsumerSwitch = false,
  initialNotifications,
}: {
  children: React.ReactNode;
  showConsumerSwitch?: boolean;
  initialNotifications: NotificationsBellData;
}) {
  return (
    <SidebarProvider>
      <DashboardShellInner
        showConsumerSwitch={showConsumerSwitch}
        initialNotifications={initialNotifications}
      >
        {children}
      </DashboardShellInner>
    </SidebarProvider>
  );
}
