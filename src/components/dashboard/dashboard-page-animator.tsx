"use client";

import gsap from "gsap";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function toElements(nodes: NodeListOf<Element>): HTMLElement[] {
  return Array.from(nodes).filter(
    (node): node is HTMLElement => node instanceof HTMLElement
  );
}

export function DashboardPageAnimator({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const scopeRef = useRef<HTMLDivElement>(null);
  const animatedPageRef = useRef<Element | null>(null);
  const animatedPathRef = useRef<string | null>(null);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    let ctx: gsap.Context | undefined;
    let cancelled = false;
    let fallbackTimer: number | undefined;

    const run = () => {
      const page = scope.querySelector("[data-dash-page]");
      if (!page) {
        animatedPageRef.current = null;
        return;
      }

      if (page === animatedPageRef.current) return;
      
      if (pathname === animatedPathRef.current) {
        page.classList.add("dash-page-animated");
        animatedPageRef.current = page;
        return;
      }

      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
      }

      ctx?.revert();
      ctx = undefined;

      page.classList.remove("dash-page-animated");

      const animated = toElements(page.querySelectorAll("[data-dash-animate]"));
      const rows = toElements(page.querySelectorAll("[data-dash-row]"));
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;

        if (fallbackTimer) {
          window.clearTimeout(fallbackTimer);
          fallbackTimer = undefined;
        }

        if (animated.length) {
          gsap.set(animated, { clearProps: "opacity,transform" });
        }
        if (rows.length) {
          gsap.set(rows, { clearProps: "opacity,transform" });
        }

        page.classList.add("dash-page-animated");
        animatedPageRef.current = page;
        animatedPathRef.current = pathname;
      };

      if (prefersReducedMotion || (animated.length === 0 && rows.length === 0)) {
        finish();
        return;
      }

      fallbackTimer = window.setTimeout(finish, 600);

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: "power2.out" },
          delay: 0.1, // Wait for React hydration
          onComplete: finish,
        });

        if (animated.length) {
          tl.to(animated, {
            opacity: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.06,
          });
        }

        if (rows.length) {
          tl.to(
            rows,
            {
              opacity: 1,
              y: 0,
              duration: 0.35,
              stagger: 0.025,
            },
            animated.length ? "-=0.2" : 0
          );
        }
      }, scope);
    };

    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        if (!cancelled) run();
      });
    });

    const observer = new MutationObserver(() => {
      if (!cancelled) run();
    });
    observer.observe(scope, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame1);
      if (frame2) cancelAnimationFrame(frame2);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      ctx?.revert();
      animatedPageRef.current = null;
      scope
        .querySelector("[data-dash-page]")
        ?.classList.remove("dash-page-animated");
    };
  }, [pathname]);

  return (
    <div ref={scopeRef} className="contents">
      {children}
    </div>
  );
}
