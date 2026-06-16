import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, Draggable);

export { gsap, ScrollTrigger, Draggable };

/** Scroll-triggered from tweens must not write inline styles before hydration. */
function scrollFrom(target: gsap.TweenTarget, vars: gsap.TweenVars) {
  return gsap.from(target, {
    immediateRender: false,
    ...vars,
  });
}

function scrollFromTo(
  target: gsap.TweenTarget,
  fromVars: gsap.TweenVars,
  toVars: gsap.TweenVars
) {
  return gsap.fromTo(target, fromVars, {
    immediateRender: false,
    ...toVars,
  });
}

let testimonialsCleanups: Array<() => void> = [];
let testimonialsProgressTween: gsap.core.Tween | null = null;
let testimonialsAutoTimer: ReturnType<typeof setInterval> | undefined;
let sidebarCleanups: Array<() => void> = [];
let sidebarTimeline: gsap.core.Timeline | null = null;

function cleanupSidebar() {
  sidebarCleanups.forEach((cleanup) => cleanup());
  sidebarCleanups = [];
  sidebarTimeline?.kill();
  sidebarTimeline = null;
  document.body.style.overflow = "";
}

function cleanupTestimonialsCarousel() {
  testimonialsCleanups.forEach((cleanup) => cleanup());
  testimonialsCleanups = [];
  clearInterval(testimonialsAutoTimer);
  testimonialsProgressTween?.kill();
  testimonialsProgressTween = null;
}

function animateTestimonialsProgress() {
  testimonialsProgressTween?.kill();
  gsap.set(".t-progress-fill", { width: "0%" });
  testimonialsProgressTween = gsap.to(".t-progress-fill", {
    width: "100%",
    duration: 4.5,
    ease: "none",
  });
}

function initTestimonialsCarousel() {
  cleanupTestimonialsCarousel();

  const track = document.querySelector(".t-carousel-track") as HTMLElement | null;
  const cards = document.querySelectorAll(".t-card");
  const dots = document.querySelectorAll(".t-dot");

  if (!track || cards.length === 0) return;

  let current = 0;

  const getCardWidth = () => {
    const card = cards[0] as HTMLElement;
    const gap = 24;
    return card.offsetWidth + gap;
  };

  const goTo = (index: number, animate = true) => {
    current = (index + cards.length) % cards.length;
    gsap.to(track, {
      x: -(current * getCardWidth()),
      duration: animate ? 0.65 : 0,
      ease: "power2.inOut",
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === current);
    });
    cards.forEach((card, i) => {
      gsap.to(card, {
        opacity: i === current || i === current + 1 || i === current + 2 ? 1 : 0.5,
        duration: 0.4,
      });
    });
    animateTestimonialsProgress();
  };

  const startAuto = () => {
    testimonialsAutoTimer = setInterval(() => goTo(current + 1), 4500);
  };

  const stopAuto = () => {
    clearInterval(testimonialsAutoTimer);
  };

  const onMouseEnter = () => stopAuto();
  const onMouseLeave = () => startAuto();
  track.addEventListener("mouseenter", onMouseEnter);
  track.addEventListener("mouseleave", onMouseLeave);
  testimonialsCleanups.push(() =>
    track.removeEventListener("mouseenter", onMouseEnter)
  );
  testimonialsCleanups.push(() =>
    track.removeEventListener("mouseleave", onMouseLeave)
  );

  let dragStartX = 0;
  const onTouchStart = (e: TouchEvent) => {
    dragStartX = e.touches[0].clientX;
    stopAuto();
  };
  const onTouchEnd = (e: TouchEvent) => {
    const delta = dragStartX - e.changedTouches[0].clientX;
    if (delta > 50) goTo(current + 1);
    else if (delta < -50) goTo(current - 1);
    startAuto();
  };
  track.addEventListener("touchstart", onTouchStart, { passive: true });
  track.addEventListener("touchend", onTouchEnd);
  testimonialsCleanups.push(() =>
    track.removeEventListener("touchstart", onTouchStart)
  );
  testimonialsCleanups.push(() => track.removeEventListener("touchend", onTouchEnd));

  dots.forEach((dot, i) => {
    const onDotClick = () => {
      goTo(i);
      stopAuto();
      startAuto();
    };
    dot.addEventListener("click", onDotClick);
    testimonialsCleanups.push(() => dot.removeEventListener("click", onDotClick));
  });

  const onResize = () => goTo(current, false);
  window.addEventListener("resize", onResize);
  testimonialsCleanups.push(() => window.removeEventListener("resize", onResize));

  goTo(0, false);
  startAuto();
}

function initSidebar() {
  cleanupSidebar();
  // Mobile drawer open/close is handled by DashboardShell (React + SidebarProvider).
  // Desktop collapse uses CSS transitions on .sidebar and .dashboard-main.
}

function initSidebarDesktopEntrance() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.innerWidth < 1024) return;
  if (!document.querySelector(".sidebar")) return;
  // Dashboard shell runs its own deferred entrance animation after hydration.
  if (document.querySelector(".dashboard-main")) return;

  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

  tl.from(".sidebar", { x: -20, opacity: 0, duration: 0.5, immediateRender: false })
    .from(".sb-header", { opacity: 0, y: -10, duration: 0.35, immediateRender: false }, 0.2)
    .from(
      ".sb-group-label",
      { opacity: 0, x: -8, duration: 0.25, stagger: 0.08, immediateRender: false },
      0.3
    )
    .from(
      ".sb-item",
      { opacity: 0, x: -12, duration: 0.3, stagger: 0.04, immediateRender: false },
      0.35
    )
    .from(".sb-user-area", { opacity: 0, y: 10, duration: 0.3, immediateRender: false }, 0.55);
}

export function initGsapAnimations() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  initSidebar();

  if (prefersReducedMotion) {
    return;
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      gsap.to(window, {
        duration: 0.8,
        scrollTo: target,
        ease: "power2.inOut",
      });
    });
  });

  ScrollTrigger.create({
    start: "top -80px",
    onEnter: () =>
      document.querySelector("header[data-main-header]")?.classList.add("nav-scrolled"),
    onLeaveBack: () =>
      document
        .querySelector("header[data-main-header]")
        ?.classList.remove("nav-scrolled"),
  });

  initSidebarDesktopEntrance();
}

export function initLandingScrollAnimations() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    cleanupTestimonialsCarousel();
    return;
  }

  cleanupTestimonialsCarousel();
  gsap.utils.toArray("[data-animate='fade-up']").forEach((el) => {
    scrollFrom(el as Element, {
      scrollTrigger: {
        trigger: el as Element,
        start: "top 88%",
        toggleActions: "play none none none",
      },
      y: 40,
      opacity: 0,
      duration: 0.7,
      ease: "power2.out",
    });
  });

  gsap.utils.toArray("[data-animate='cards']").forEach((container) => {
    const cards = (container as Element).querySelectorAll(".boat-card");
    if (!cards.length) return;

    scrollFrom(cards, {
      scrollTrigger: {
        trigger: container as Element,
        start: "top 85%",
        toggleActions: "play none none none",
      },
      y: 50,
      opacity: 0,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.1,
    });
  });

  gsap.utils.toArray(".wave-rule").forEach((rule) => {
    scrollFrom(rule as Element, {
      scrollTrigger: {
        trigger: rule as Element,
        start: "top 90%",
        toggleActions: "play none none none",
      },
      scaleX: 0,
      transformOrigin: "left center",
      duration: 0.6,
      ease: "power2.out",
    });
  });

  const emSection = document.querySelector(".em-section");
  if (emSection) {
    scrollFrom(emSection, {
      scrollTrigger: {
        trigger: emSection,
        start: "top 85%",
        toggleActions: "play none none none",
      },
      y: 30,
      opacity: 0,
      duration: 0.7,
      ease: "power2.out",
    });

    scrollFrom([".em-eyebrow", ".em-title", ".em-wave-rule", ".em-subtitle"], {
      scrollTrigger: {
        trigger: emSection,
        start: "top 85%",
      },
      y: 20,
      opacity: 0,
      duration: 0.5,
      ease: "power2.out",
      stagger: 0.1,
    });
  }

  const hiwSection = document.querySelector(".hiw-section");
  if (hiwSection) {
    scrollFrom([".hiw-eyebrow", ".hiw-title", ".hiw-wave-rule", ".hiw-subtitle"], {
      scrollTrigger: {
        trigger: hiwSection,
        start: "top 85%",
        toggleActions: "play none none none",
      },
      y: 24,
      opacity: 0,
      duration: 0.55,
      ease: "power2.out",
      stagger: 0.1,
    });
  }

  const hiwStepsRow = document.querySelector(".hiw-steps-row");
  if (hiwStepsRow) {
    scrollFrom(".hiw-step", {
      scrollTrigger: {
        trigger: hiwStepsRow,
        start: "top 82%",
        toggleActions: "play none none none",
      },
      y: 40,
      opacity: 0,
      scale: 0.95,
      duration: 0.6,
      ease: "back.out(1.4)",
      stagger: 0.15,
    });

    gsap.utils.toArray(".hiw-icon-wrap").forEach((icon, i) => {
      scrollFrom(icon as Element, {
        scrollTrigger: {
          trigger: hiwStepsRow,
          start: "top 82%",
        },
        scale: 0,
        opacity: 0,
        duration: 0.5,
        ease: "back.out(2)",
        delay: 0.2 + i * 0.15,
      });
    });

    gsap.utils.toArray(".hiw-connector-fill").forEach((fill, i) => {
      scrollFromTo(
        fill as Element,
        { width: "0%" },
        {
          scrollTrigger: {
            trigger: hiwStepsRow,
            start: "top 80%",
          },
          width: "100%",
          duration: 0.7,
          ease: "power2.inOut",
          delay: 0.45 + i * 0.2,
        }
      );
    });

    scrollFrom(".hiw-step-badge", {
      scrollTrigger: {
        trigger: hiwStepsRow,
        start: "top 82%",
      },
      scale: 0,
      duration: 0.35,
      ease: "back.out(3)",
      stagger: 0.15,
      delay: 0.35,
    });
  }

  const emMapShell = document.querySelector(".em-map-shell");
  if (emMapShell) {
    scrollFrom(emMapShell, {
      scrollTrigger: {
        trigger: emMapShell,
        start: "top 90%",
        toggleActions: "play none none none",
      },
      clipPath: "inset(100% 0% 0% 0%)",
      duration: 0.9,
      ease: "power3.out",
      onComplete: () => {
        window.dispatchEvent(new Event("resize"));
      },
    });

    scrollFrom(".em-corner", {
      scrollTrigger: {
        trigger: emMapShell,
        start: "top 88%",
      },
      scale: 0,
      opacity: 0,
      duration: 0.4,
      ease: "back.out(2)",
      stagger: 0.07,
    });
  }

  const tSection = document.querySelector(".t-section");
  if (tSection) {
    scrollFrom([".t-eyebrow", ".t-title", ".t-wave-rule"], {
      scrollTrigger: {
        trigger: tSection,
        start: "top 85%",
      },
      y: 24,
      opacity: 0,
      duration: 0.55,
      ease: "power2.out",
      stagger: 0.1,
    });

    scrollFrom(".t-wave-rule", {
      scrollTrigger: {
        trigger: tSection,
        start: "top 85%",
      },
      scaleX: 0,
      transformOrigin: "center center",
      duration: 0.6,
      ease: "power2.out",
    });

    const tCards = document.querySelectorAll(".t-carousel-track .t-card");
    if (tCards.length) {
      scrollFrom(tCards, {
        scrollTrigger: {
          trigger: ".t-carousel-outer",
          start: "top 88%",
          toggleActions: "play none none none",
        },
        x: 60,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.12,
        onComplete: () => initTestimonialsCarousel(),
      });
    }
  }

  const ctaSection = document.querySelector(".cta-section");
  if (ctaSection) {
    scrollFrom(".cta-consumer", {
      scrollTrigger: {
        trigger: ctaSection,
        start: "top 85%",
      },
      x: -40,
      opacity: 0,
      duration: 0.65,
      ease: "power2.out",
    });

    scrollFrom(".cta-owner", {
      scrollTrigger: {
        trigger: ctaSection,
        start: "top 85%",
      },
      x: 40,
      opacity: 0,
      duration: 0.65,
      ease: "power2.out",
      delay: 0.1,
    });

    scrollFrom(".cta-wave-deco", {
      scrollTrigger: {
        trigger: ".cta-consumer",
        start: "top 80%",
      },
      y: 20,
      opacity: 0,
      duration: 0.8,
      ease: "power1.out",
      delay: 0.3,
    });

    scrollFrom(".cta-anchor-deco", {
      scrollTrigger: {
        trigger: ".cta-owner",
        start: "top 80%",
      },
      rotate: -15,
      opacity: 0,
      duration: 0.7,
      ease: "back.out(1.5)",
      delay: 0.3,
    });
  }

  const siteFooter = document.querySelector(".site-footer");
  if (siteFooter) {
    scrollFrom(".footer-accent-line", {
      scrollTrigger: {
        trigger: siteFooter,
        start: "top 95%",
      },
      scaleX: 0,
      transformOrigin: "center center",
      duration: 0.9,
      ease: "power2.out",
    });

    const footerBody = document.querySelector(".footer-body");
    if (footerBody) {
      scrollFrom([".footer-brand", ".footer-col"], {
        scrollTrigger: {
          trigger: footerBody,
          start: "top 90%",
        },
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.12,
      });
    }

    scrollFrom(".footer-bottom", {
      scrollTrigger: {
        trigger: ".footer-bottom",
        start: "top 98%",
      },
      opacity: 0,
      duration: 0.5,
      ease: "power1.out",
      delay: 0.3,
    });

    scrollFrom(".footer-social-btn", {
      scrollTrigger: {
        trigger: ".footer-social",
        start: "top 92%",
      },
      scale: 0,
      opacity: 0,
      duration: 0.35,
      ease: "back.out(2)",
      stagger: 0.07,
      delay: 0.4,
    });
  }

  ScrollTrigger.refresh();
}

export function cleanupLandingScrollAnimations() {
  cleanupTestimonialsCarousel();
}

export function cleanupGsapAnimations() {
  cleanupSidebar();
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
}
