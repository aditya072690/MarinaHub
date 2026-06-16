"use client";

import { formatHourlyRate } from "@/lib/currency/format";
import { gsap, Draggable } from "@/lib/animations/gsap-init";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight, MapPin, Ship } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export interface FeaturedMarina {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  primary_color: string;
  boat_count: number;
  min_hourly_rate: number;
  hero_image: string;
}

export function FeaturedMarinas({ marinas }: { marinas: FeaturedMarina[] }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<Draggable | null>(null);
  const currentIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canGoNext, setCanGoNext] = useState(true);

  const getCardWidth = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    const card = track.querySelector(".marina-card") as HTMLElement | null;
    if (!card) return 0;
    return card.offsetWidth + 20;
  }, []);

  const getMaxScroll = useCallback(() => {
    const wrapper = wrapperRef.current;
    const track = trackRef.current;
    if (!wrapper || !track) return 0;
    return Math.max(0, track.scrollWidth - wrapper.clientWidth);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;

      const cardWidth = getCardWidth();
      if (!cardWidth) return;

      const clamped = Math.max(0, Math.min(index, marinas.length - 1));
      const x = Math.min(clamped * cardWidth, getMaxScroll());

      currentIndexRef.current = clamped;
      setActiveIndex(clamped);
      setCanGoNext(x < getMaxScroll() - 1);

      gsap.to(track, {
        x: -x,
        duration: 0.55,
        ease: "power2.out",
        overwrite: true,
      });
    },
    [getCardWidth, getMaxScroll, marinas.length]
  );

  const setupCarousel = useCallback(() => {
    const track = trackRef.current;
    const wrapper = wrapperRef.current;
    if (!track || !wrapper || marinas.length === 0) return;

    draggableRef.current?.kill();
    draggableRef.current = null;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const getBounds = () => {
      const maxScroll = getMaxScroll();
      return { minX: -maxScroll, maxX: 0 };
    };

    gsap.set(track, { x: -Math.min(currentIndexRef.current * getCardWidth(), getMaxScroll()) });

    const [instance] = Draggable.create(track, {
      type: "x",
      edgeResistance: 0.65,
      bounds: getBounds(),
      dragClickables: true,
      minimumMovement: 10,
      onPress() {
        (track as HTMLElement & { _dragMoved?: boolean })._dragMoved = false;
      },
      onDrag() {
        (track as HTMLElement & { _dragMoved?: boolean })._dragMoved = true;
      },
      onDragEnd() {
        const cardWidth = getCardWidth();
        if (!cardWidth) return;

        const movedBy = this.endX - this.startX;
        let targetIndex = currentIndexRef.current;

        if (movedBy < -50) targetIndex += 1;
        else if (movedBy > 50) targetIndex -= 1;
        else {
          const currentX = Math.abs(gsap.getProperty(track, "x") as number);
          targetIndex = Math.round(currentX / cardWidth);
        }

        goTo(targetIndex);
      },
    });

    draggableRef.current = instance ?? null;
    instance?.applyBounds(getBounds());
  }, [goTo, getCardWidth, getMaxScroll, marinas.length]);

  useEffect(() => {
    if (marinas.length === 0) return;

    const track = trackRef.current;
    const wrapper = wrapperRef.current;
    if (!track || !wrapper) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const onLinkClick = (event: MouseEvent) => {
      if ((track as HTMLElement & { _dragMoved?: boolean })._dragMoved) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    track.addEventListener("click", onLinkClick, true);

    const runSetup = () => {
      setupCarousel();
      goTo(currentIndexRef.current);
      ScrollTrigger.refresh();
    };

    const frameId = requestAnimationFrame(() => {
      requestAnimationFrame(runSetup);
    });

    const resizeObserver = new ResizeObserver(() => {
      setupCarousel();
      goTo(currentIndexRef.current);
    });
    resizeObserver.observe(wrapper);
    resizeObserver.observe(track);

    const images = track.querySelectorAll("img");
    const onImageLoad = () => runSetup();
    images.forEach((img) => {
      if (!(img as HTMLImageElement).complete) {
        img.addEventListener("load", onImageLoad, { once: true });
      }
    });

    let cardFrameId = 0;
    if (!prefersReducedMotion) {
      const cards = track.querySelectorAll(".marina-card");
      cardFrameId = requestAnimationFrame(() => {
        cards.forEach((card, i) => {
          gsap.from(card, {
            immediateRender: false,
            scrollTrigger: {
              trigger: wrapper,
              start: "top 88%",
              toggleActions: "play none none none",
            },
            x: 40,
            opacity: 0,
            duration: 0.5,
            ease: "power2.out",
            delay: i * 0.08,
          });
        });
      });
    }

    return () => {
      cancelAnimationFrame(frameId);
      if (cardFrameId) cancelAnimationFrame(cardFrameId);
      track.removeEventListener("click", onLinkClick, true);
      resizeObserver.disconnect();
      draggableRef.current?.kill();
      draggableRef.current = null;
    };
  }, [goTo, marinas.length, setupCarousel]);

  if (marinas.length === 0) return null;

  return (
    <section
      className="fm-section bg-[var(--fm-bg)]"
      style={{
        padding: "clamp(3rem, 8vh, 5rem) clamp(1.25rem, 4vw, 3rem)",
      }}
    >
      <div className="landing-container">
        <div
          data-animate="fade-up"
          className="fm-header mb-6 flex items-start justify-between gap-6 md:mb-8 md:items-center"
        >
          <div className="min-w-0">
            <h2
              className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold tracking-[-0.025em] text-[var(--fm-headline)]"
              style={{ fontFamily: "var(--font-sora), sans-serif" }}
            >
              Featured Marinas
            </h2>
            <div className="wave-rule mt-2.5" aria-hidden="true" />
            <p
              className="mt-2.5 text-[0.95rem] font-normal text-[var(--fm-subtext)]"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              Popular destinations on MarinaHub
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 pt-1 md:flex">
            <button
              type="button"
              className="fm-prev flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[var(--fm-card-border)] bg-white text-[var(--fm-headline)] transition-[background,color] duration-200 ease-in-out hover:bg-[var(--fm-headline)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous marina"
              disabled={activeIndex === 0}
              onClick={() => goTo(activeIndex - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="fm-next flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[var(--fm-card-border)] bg-white text-[var(--fm-headline)] transition-[background,color] duration-200 ease-in-out hover:bg-[var(--fm-headline)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next marina"
              disabled={!canGoNext}
              onClick={() => goTo(activeIndex + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="fm-carousel-wrapper" ref={wrapperRef}>
          <div className="fm-carousel-track" ref={trackRef}>
            {marinas.map((marina) => (
              <Link
                key={marina.id}
                href={`/m/${marina.slug}`}
                className="marina-card group block cursor-pointer overflow-hidden rounded-[18px] border border-[var(--fm-card-border)] bg-[var(--fm-card-bg)] shadow-[0_2px_14px_var(--fm-card-shadow)] transition-[transform,box-shadow] duration-300 ease-in-out hover:-translate-y-1.5 hover:shadow-[0_14px_36px_var(--fm-card-shadow-hover)]"
                draggable={false}
              >
                <div className="relative h-[200px] overflow-hidden">
                  <Image
                    src={marina.hero_image}
                    alt={marina.name}
                    fill
                    className="object-cover transition-transform duration-[400ms] ease-in-out group-hover:scale-105"
                    sizes="(max-width: 767px) 85vw, (max-width: 1023px) 45vw, 32vw"
                  />
                  <span
                    className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[0.68rem] font-bold tracking-[0.07em] text-[var(--fm-badge-text)] uppercase"
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      background: "var(--fm-badge-bg)",
                    }}
                  >
                    Popular
                  </span>
                </div>
                <div className="px-4 pt-3.5 pb-[18px]">
                  <h3
                    className="mb-1 text-[1rem] font-semibold text-[var(--fm-headline)]"
                    style={{ fontFamily: "var(--font-sora), sans-serif" }}
                  >
                    {marina.name}
                  </h3>
                  <p
                    className="flex items-center gap-1 text-[0.8rem] text-[var(--fm-location)]"
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  >
                    <MapPin className="h-3 w-3 shrink-0 text-[var(--fm-meta-icon)]" />
                    {marina.city}, {marina.state}
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <p
                      className="flex items-center gap-1 text-[0.82rem] font-medium text-[var(--fm-subtext)]"
                      style={{ fontFamily: "var(--font-inter), sans-serif" }}
                    >
                      <Ship className="h-3 w-3 shrink-0 text-[var(--fm-meta-icon)]" />
                      {marina.boat_count} boats · from{" "}
                      {formatHourlyRate(marina.min_hourly_rate)}
                    </p>
                    <span
                      className="shrink-0 text-[0.78rem] font-semibold text-[var(--fm-price)] opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100"
                      style={{ fontFamily: "var(--font-inter), sans-serif" }}
                    >
                      View marina →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="fm-dots">
          {marinas.map((marina, index) => (
            <button
              key={marina.id}
              type="button"
              className={`fm-dot${index === activeIndex ? " active" : ""}`}
              aria-label={`Go to marina ${index + 1}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
