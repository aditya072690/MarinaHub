import { FavoriteButton } from "@/components/consumer/favorite-button";
import { formatCurrency } from "@/lib/currency/format";
import { Badge } from "@/components/ui/badge";
import type { Boat } from "@/types/database";
import { Users } from "lucide-react";

export function BoatInfoHeader({
  boat,
  marinaId,
  isFavorited,
  isAuthenticated,
}: {
  boat: Boat;
  marinaId: string;
  isFavorited: boolean;
  isAuthenticated: boolean;
}) {
  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{boat.name}</h1>
            <FavoriteButton
              boatId={boat.id}
              marinaId={marinaId}
              initialFavorited={isFavorited}
              isAuthenticated={isAuthenticated}
              className="relative bg-transparent shadow-none"
            />
          </div>
          {boat.boat_type && (
            <Badge className="mt-2 capitalize">{boat.boat_type}</Badge>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">
            {formatCurrency(Number(boat.hourly_rate), "INR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </p>
          <p className="text-sm text-muted-foreground">per hour</p>
        </div>
      </div>

      <p className="mb-4 flex items-center gap-2 text-muted-foreground">
        <Users className="h-4 w-4" />
        Up to {boat.capacity} guests
      </p>

      {boat.description && (
        <p className="mb-6 text-muted-foreground">{boat.description}</p>
      )}
    </div>
  );
}
