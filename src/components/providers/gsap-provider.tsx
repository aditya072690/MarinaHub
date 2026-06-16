"use client";

import {
  cleanupGsapAnimations,
  gsap,
  initGsapAnimations,
} from "@/lib/animations/gsap-init";
import { useEffect } from "react";

export function GsapProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let frame2 = 0;
    let ctx: gsap.Context | undefined;

    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        ctx = gsap.context(() => {
          initGsapAnimations();
        });
      });
    });

    return () => {
      cancelAnimationFrame(frame1);
      if (frame2) cancelAnimationFrame(frame2);
      ctx?.revert();
      cleanupGsapAnimations();
    };
  }, []);

  return <>{children}</>;
}
