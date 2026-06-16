import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-[var(--hero-bg)] py-10 md:py-0">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 10% 50%, rgba(26,157,196,0.07) 0%, transparent 70%)",
        }}
      />
      <div className="landing-container relative grid items-center gap-10 px-5 md:grid-cols-2 md:gap-12 md:px-8 md:py-[clamp(3rem,8vh,6rem)] lg:gap-16 xl:px-10">
        <div data-animate="fade-up" className="flex flex-col">
          <h1
            className="text-[clamp(1.85rem,7vw,2.4rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--hero-headline)] md:text-[clamp(2.2rem,4.5vw,3.75rem)]"
            style={{ fontFamily: "var(--font-sora), sans-serif" }}
          >
            Book your perfect day
            <br />
            on the water
          </h1>
          <div className="hero-wave mt-4" aria-hidden="true" />
          <p
            className="mt-2 max-w-[48ch] text-[1.05rem] font-normal leading-[1.65] text-[var(--hero-subtext)] md:text-[1.1rem]"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            Pontoons, fishing boats, and cruisers from trusted local marinas — book online in
            minutes.
          </p>
          <form action="/search" className="mt-7 w-full max-w-xl">
            <div className="flex flex-col gap-2 rounded-[14px] border-[1.5px] border-[var(--hero-search-border)] bg-white p-1.5 shadow-[0_2px_12px_rgba(11,31,58,0.07)] transition-[border-color,box-shadow] duration-200 ease-in-out focus-within:border-[var(--hero-search-focus)] focus-within:shadow-[0_0_0_3px_rgba(26,157,196,0.12)] sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8BA5BF]" />
                <Input
                  name="q"
                  placeholder="Search by lake, city, or marina..."
                  className="h-11 border-0 bg-transparent pl-9 text-[0.95rem] text-[#0B1F3A] shadow-none placeholder:text-[#8BA5BF] focus-visible:ring-0"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                />
              </div>
              <Button
                type="submit"
                className="h-11 shrink-0 rounded-[10px] bg-[var(--hero-accent)] px-[22px] py-2.5 text-[0.9rem] font-semibold text-white transition-[background-color,box-shadow] duration-200 ease-in-out hover:bg-[var(--hero-accent-hover)] hover:shadow-[0_4px_14px_rgba(26,157,196,0.3)]"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                Search boats
              </Button>
            </div>
          </form>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/search"
              className="inline-flex items-center rounded-full border border-[#C8DAE8] px-3.5 py-1.5 text-[0.875rem] font-medium text-[var(--hero-link-muted)] transition-colors duration-200 ease-in-out hover:bg-[rgba(11,31,58,0.05)]"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              Explore boats
            </Link>
            <Link
              href="/marina/signup"
              className="inline-flex items-center px-1 py-1.5 text-[0.875rem] font-medium text-[var(--hero-accent)] no-underline transition-[text-decoration] duration-200 ease-in-out hover:underline"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              List your marina
            </Link>
          </div>
        </div>
        <div className="relative h-[240px] w-full overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(11,31,58,0.15)] md:h-auto md:min-h-[400px] md:rounded-[20px] lg:min-h-[460px]">
          <Image
            src="https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&q=80"
            alt="Family enjoying a day on the lake"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              background:
                "linear-gradient(to top, rgba(11,31,58,0.18) 0%, transparent 40%)",
            }}
          />
        </div>
      </div>
    </section>
  );
}
