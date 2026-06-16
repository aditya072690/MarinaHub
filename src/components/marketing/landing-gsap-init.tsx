"use client";

import {
  cleanupLandingScrollAnimations,
  gsap,
  initLandingScrollAnimations,
} from "@/lib/animations/gsap-init";
import { useEffect } from "react";

/** Initializes landing scroll animations after the homepage has hydrated. */
export function LandingGsapInit() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      initLandingScrollAnimations();
    });

    return () => {
      cleanupLandingScrollAnimations();
      ctx?.revert();
    };
  }, []);

  return null;
}
