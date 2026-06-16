import { getUserFavorites } from "@/actions/favorites";
import { AccountPageHeader } from "@/components/consumer/account-page-header";
import { BoatCard } from "@/components/consumer/boat-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { Marina } from "@/types/database";
import { Heart } from "lucide-react";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FavoritesPage() {
  const favorites = await getUserFavorites();

  return (
    <div>
      <AccountPageHeader
        title="My Favorites"
        description="Boats you've saved for quick access"
      />
      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Save boats you love"
          description="Tap the heart on any boat to save it here for quick access later."
          actionLabel="Explore boats"
          actionHref="/search"
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {favorites.map((fav) => {
            const rawBoat = fav.boats;
            const boat = Array.isArray(rawBoat) ? rawBoat[0] : rawBoat;
            
            if (!boat) return null;

            const rawMarina = boat.marinas;
            const marina = Array.isArray(rawMarina) ? rawMarina[0] : rawMarina;
            
            return (
              <BoatCard
                key={fav.id}
                boat={boat}
                marina={marina as Marina}
                isFavorited
                isAuthenticated
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
