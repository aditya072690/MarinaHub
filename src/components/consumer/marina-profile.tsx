import { ReviewList } from "@/components/consumer/review-list";
import { StarRating } from "@/components/consumer/star-rating";
import type { ReviewWithAuthor } from "@/actions/reviews";
import { BoatCard } from "@/components/consumer/boat-card";
import { MarinaBookingWidget } from "@/components/consumer/marina-booking-widget";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Boat, Marina, WidgetConfig } from "@/types/database";
import {
  Anchor,
  Clock,
  Fuel,
  Mail,
  MapPin,
  Phone,
  Ship,
  Star,
  Wifi,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const AMENITY_ICONS: Record<string, typeof Anchor> = {
  fuel_dock: Fuel,
  pump_out: Anchor,
  parking: MapPin,
  restrooms: Anchor,
  bait_shop: Anchor,
  wifi: Wifi,
  boat_ramp: Ship,
  ice: Anchor,
  concierge: Star,
  resort_shuttle: Ship,
};

const AMENITY_LABELS: Record<string, string> = {
  fuel_dock: "Fuel dock",
  pump_out: "Pump-out",
  parking: "Parking",
  restrooms: "Restrooms",
  bait_shop: "Bait shop",
  wifi: "WiFi",
  boat_ramp: "Boat ramp",
  ice: "Ice",
  concierge: "Concierge",
  resort_shuttle: "Resort shuttle",
};

export function MarinaProfile({
  marina,
  boats,
  favoriteIds,
  isAuthenticated,
  widgetApiKey,
  widgetConfig,
  reviews = [],
  avgRating = null,
  reviewCount = 0,
}: {
  marina: Marina;
  boats: Boat[];
  favoriteIds: string[];
  isAuthenticated: boolean;
  widgetApiKey?: string | null;
  widgetConfig?: WidgetConfig | null;
  reviews?: ReviewWithAuthor[];
  avgRating?: number | null;
  reviewCount?: number;
}) {
  const settings = marina.settings ?? {};
  const amenities = (settings.amenities as string[]) ?? [];
  const hoursDetail = settings.operating_hours_detail as Record<string, string> | undefined;
  const heroImage =
    (settings.hero_image_url as string) ??
    boats[0]?.image_urls?.[0] ??
    "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&q=80";

  return (
    <>
      <section
        className="relative overflow-hidden px-4 py-20 text-white"
        style={{
          background: `linear-gradient(135deg, ${marina.primary_color}dd, ${marina.primary_color} 40%, #0f172a)`,
        }}
      >
        <div className="absolute inset-0 opacity-30">
          <Image src={heroImage} alt="" fill className="object-cover" priority />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {marina.logo_url && (
              <Image
                src={marina.logo_url}
                alt=""
                width={56}
                height={56}
                className="mb-4 rounded-xl bg-white/10 object-cover"
                unoptimized
              />
            )}
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{marina.name}</h1>
            {marina.city && (
              <p className="mt-2 flex items-center gap-2 text-lg text-white/90">
                <MapPin className="h-5 w-5" />
                {marina.city}, {marina.state}
              </p>
            )}
            {marina.description && (
              <p className="mt-4 max-w-2xl text-white/85">{marina.description}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#book"
                className={cn(buttonVariants(), "bg-white text-slate-900 hover:bg-white/90")}
              >
                Book Now
              </a>
              <a
                href="#fleet"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white"
                )}
              >
                View Fleet
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-xl font-bold">About</h2>
            <p className="text-muted-foreground">{marina.description}</p>
            {marina.address && (
              <p className="mt-3 text-sm text-muted-foreground">
                {marina.address}, {marina.city}, {marina.state} {marina.zip}
              </p>
            )}
          </div>
          <div className="space-y-4 rounded-xl border bg-slate-50 p-6">
            <h3 className="font-semibold">Contact & Hours</h3>
            {marina.contact_phone && (
              <p className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-sky-600" />
                {marina.contact_phone}
              </p>
            )}
            {marina.contact_email && (
              <p className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-sky-600" />
                <a href={`mailto:${marina.contact_email}`} className="hover:underline">
                  {marina.contact_email}
                </a>
              </p>
            )}
            {hoursDetail && (
              <div className="text-sm">
                <p className="mb-2 flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4 text-sky-600" />
                  Operating hours
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  {Object.entries(hoursDetail).map(([day, hours]) => (
                    <li key={day} className="flex justify-between capitalize">
                      <span>{day}</span>
                      <span>{hours}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="fleet" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold">Our Fleet</h2>
        {boats.length === 0 ? (
          <EmptyState
            icon={Ship}
            title="No boats listed yet"
            description="This marina hasn't listed boats for rent yet."
            actionLabel={marina.contact_email ? "Contact marina" : undefined}
            actionHref={marina.contact_email ? `mailto:${marina.contact_email}` : undefined}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {boats.map((boat) => (
              <BoatCard
                key={boat.id}
                boat={boat}
                marina={marina}
                isAuthenticated={isAuthenticated}
                isFavorited={favoriteIds.includes(boat.id)}
              />
            ))}
          </div>
        )}
      </section>

      {amenities.length > 0 && (
        <section className="border-y bg-slate-50 px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-6 text-2xl font-bold">Amenities</h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {amenities.map((key) => {
                const Icon = AMENITY_ICONS[key] ?? Anchor;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm"
                  >
                    <Icon className="h-5 w-5 text-sky-600" />
                    <span className="text-sm font-medium">
                      {AMENITY_LABELS[key] ?? key.replace(/_/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {(reviews.length > 0 || reviewCount > 0) && (
        <section id="reviews" className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold">Guest Reviews</h2>
            {avgRating != null && reviewCount > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={avgRating} size="md" showValue />
                <span className="text-muted-foreground">
                  · {reviewCount} review{reviewCount !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
          <ReviewList reviews={reviews} />
        </section>
      )}

      <section id="book" className="border-t bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-2 text-2xl font-bold">Book Online</h2>
          <p className="mb-6 text-muted-foreground">
            Reserve your boat in minutes — no phone call required.
          </p>
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <MarinaBookingWidget
              marina={marina}
              boats={boats}
              widgetConfig={widgetConfig}
              widgetApiKey={widgetApiKey}
            />
          </div>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Powered by{" "}
        <Link href="/" className="text-sky-600 hover:underline">
          MarinaHub
        </Link>
      </footer>
    </>
  );
}
