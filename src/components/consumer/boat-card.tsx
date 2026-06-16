import { FavoriteButton } from "@/components/consumer/favorite-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatHourlyRate } from "@/lib/currency/format";
import { resolveBoatImageUrl } from "@/lib/images/stock";
import type { Boat, Marina } from "@/types/database";
import { MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function BoatCard({
  boat,
  marina,
  isFavorited = false,
  isAuthenticated = false,
  priority = false,
}: {
  boat: Boat;
  marina: Marina;
  isFavorited?: boolean;
  isAuthenticated?: boolean;
  priority?: boolean;
}) {
  const imageUrl = resolveBoatImageUrl(boat.image_urls?.[0]);

  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-10">
        <FavoriteButton
          boatId={boat.id}
          marinaId={marina.id}
          initialFavorited={isFavorited}
          isAuthenticated={isAuthenticated}
        />
      </div>
      <Link href={`/m/${marina.slug}/boats/${boat.id}`}>
        <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={imageUrl}
              alt={boat.name}
              fill
              priority={priority}
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            {boat.boat_type && (
              <Badge className="absolute left-3 top-3 bg-white/90 text-slate-900">
                {boat.boat_type}
              </Badge>
            )}
          </div>
          <CardContent className="p-4">
            <div className="mb-1 flex items-start justify-between">
              <h3 className="font-semibold">{boat.name}</h3>
              <p className="text-sm font-medium">
                <span className="font-bold">{formatHourlyRate(Number(boat.hourly_rate))}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {boat.capacity}
              </span>
              {marina.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {marina.city}, {marina.state}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
