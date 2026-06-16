import { formatHourlyRate } from "@/lib/currency/format";
import { ConsumerHeader } from "@/components/consumer/consumer-header";
import { ExploreMarinasSection } from "@/components/maps/explore-marinas-section";
import { EmptyState } from "@/components/shared/empty-state";
import { FeaturedMarinas } from "@/components/marketing/featured-marinas";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { LandingCta } from "@/components/marketing/landing-cta";
import { LandingGsapInit } from "@/components/marketing/landing-gsap-init";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { LandingHero } from "@/components/marketing/landing-hero";
import { Testimonials } from "@/components/marketing/testimonials";
import { getMarinasForMap } from "@/actions/marinas-map";
import { FeaturedBoatsCarousel } from "@/components/marketing/featured-boats-carousel";
import { resolveBoatImageUrl } from "@/lib/images/stock";
import { createClient } from "@/lib/supabase/server";
import { MapPin, Ship } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: boats } = await supabase
    .from("boats")
    .select("*, marinas!inner(*)")
    .eq("status", "active")
    .eq("marinas.is_active", true)
    .order("created_at", { ascending: false })
    .limit(6);

  const featuredBoats =
    (boats as Array<{
      id: string;
      name: string;
      hourly_rate: number;
      image_urls: string[];
      marinas: { slug: string; city: string | null; state: string | null };
    }>)?.map((b) => ({ ...b, marina: b.marinas })) ?? [];

  const { data: marinasRaw } = await supabase
    .from("marinas")
    .select("id, slug, name, city, state, primary_color, settings")
    .eq("is_active", true)
    .limit(4);

  const featuredMarinas = await Promise.all(
    (marinasRaw ?? []).map(async (m) => {
      const { data: marinaBoats } = await supabase
        .from("boats")
        .select("hourly_rate, image_urls")
        .eq("marina_id", m.id)
        .eq("status", "active");

      const rates = (marinaBoats ?? []).map((b) => Number(b.hourly_rate));
      const settings = m.settings as Record<string, unknown>;
      return {
        id: m.id,
        slug: m.slug,
        name: m.name,
        city: m.city,
        state: m.state,
        primary_color: m.primary_color,
        boat_count: marinaBoats?.length ?? 0,
        min_hourly_rate: rates.length ? Math.min(...rates) : 0,
        hero_image:
          (settings?.hero_image_url as string) ??
          marinaBoats?.[0]?.image_urls?.[0] ??
          "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80",
      };
    })
  );

  const mapMarinas = await getMarinasForMap();

  return (
    <div className="min-h-screen bg-white">
      <ConsumerHeader variant="marketing" />
      <LandingHero />

      <section
        className="bg-[var(--fb-bg)]"
        style={{
          padding:
            "clamp(3rem, 8vh, 5rem) clamp(1.25rem, 4vw, 3rem)",
        }}
      >
        <div className="landing-container">
          <div
            data-animate="fade-up"
            className="mb-8 flex items-center justify-between gap-4"
          >
            <div>
              <h2
                className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold tracking-[-0.025em] text-[var(--fb-headline)]"
                style={{ fontFamily: "var(--font-sora), sans-serif" }}
              >
                Featured Boats
              </h2>
              <div className="wave-rule mt-3" aria-hidden="true" />
              <p
                className="mt-3 text-[0.95rem] font-normal text-[var(--fb-subtext)]"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                Hand-picked rentals ready to book
              </p>
            </div>
            {featuredBoats.length > 0 && (
              <Link
                href="/search"
                className="group inline-flex shrink-0 items-center gap-1 text-[0.875rem] font-semibold text-[var(--fb-show-all)] transition-colors duration-200 ease-in-out hover:text-[var(--hero-accent-hover)]"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                Show all
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform duration-200 ease-in-out group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            )}
          </div>
          {featuredBoats.length === 0 ? (
            <EmptyState
              icon={Ship}
              title="No boats listed yet"
              description="Marina owners can list their fleet and start taking online bookings."
              actionLabel="List your marina"
              actionHref="/marina/signup"
            />
          ) : (
            <FeaturedBoatsCarousel cardCount={featuredBoats.length}>
              {featuredBoats.map((boat) => (
                <Link
                  key={boat.id}
                  href={`/m/${boat.marina.slug}/boats/${boat.id}`}
                  className="boat-card group flex-[0_0_80vw] max-w-[320px] shrink-0 snap-start cursor-pointer overflow-hidden rounded-2xl border border-[var(--fb-card-border)] bg-[var(--fb-card-bg)] shadow-[0_2px_12px_var(--fb-card-shadow)] transition-[transform,box-shadow] duration-300 ease-in-out hover:-translate-y-1.5 hover:shadow-[0_12px_32px_var(--fb-card-shadow-hover)] md:max-w-none md:shrink md:flex-none"
                >
                  <div className="relative h-[220px] overflow-hidden">
                    <Image
                      src={resolveBoatImageUrl(boat.image_urls?.[0])}
                      alt={boat.name}
                      fill
                      className="object-cover transition-transform duration-[400ms] ease-in-out group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="px-[18px] pt-4 pb-5">
                    <h3
                      className="text-[1.05rem] font-semibold text-[var(--fb-headline)]"
                      style={{ fontFamily: "var(--font-sora), sans-serif" }}
                    >
                      {boat.name}
                    </h3>
                    <p
                      className="mt-1 flex items-center gap-1 text-[0.8rem] text-[var(--fb-location)]"
                      style={{ fontFamily: "var(--font-inter), sans-serif" }}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--fb-location)]" />
                      {boat.marina.city}, {boat.marina.state}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <p
                        className="text-[1rem] font-bold text-[var(--fb-price)]"
                        style={{ fontFamily: "var(--font-inter), sans-serif" }}
                      >
                        {formatHourlyRate(Number(boat.hourly_rate))}
                      </p>
                      <span
                        className="book-link text-[0.8rem] font-semibold text-[var(--fb-price)] opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100"
                        style={{ fontFamily: "var(--font-inter), sans-serif" }}
                      >
                        Book Now →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </FeaturedBoatsCarousel>
          )}
        </div>
      </section>

      <FeaturedMarinas marinas={featuredMarinas.filter((m) => m.boat_count > 0)} />
      <ExploreMarinasSection marinas={mapMarinas} />
      <HowItWorks />
      <Testimonials />
      <LandingCta />
      <LandingFooter />
      <LandingGsapInit />
    </div>
  );
}
