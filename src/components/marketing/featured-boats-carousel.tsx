"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface FeaturedBoatsCarouselProps {
  children: React.ReactNode;
  cardCount: number;
}

export function FeaturedBoatsCarousel({
  children,
  cardCount,
}: FeaturedBoatsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || cardCount === 0) return;

    const cards = container.querySelectorAll(".boat-card");
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Array.from(cards).indexOf(entry.target);
            if (index >= 0) {
              setActiveIndex(index);
            }
          }
        });
      },
      { root: container, threshold: 0.55 }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [cardCount]);

  return (
    <>
      <div
        ref={scrollRef}
        data-animate="cards"
        className={cn(
          "featured-boats-track flex gap-4 overflow-x-auto pb-3",
          "snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:snap-none md:pb-0",
          "lg:grid-cols-3"
        )}
      >
        {children}
      </div>
      {cardCount > 1 && (
        <div
          className="mt-4 flex justify-center gap-2 md:hidden"
          aria-hidden="true"
        >
          {Array.from({ length: cardCount }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors duration-200",
                index === activeIndex ? "bg-[var(--fb-price)]" : "bg-[#C8DAE8]"
              )}
            />
          ))}
        </div>
      )}
    </>
  );
}
