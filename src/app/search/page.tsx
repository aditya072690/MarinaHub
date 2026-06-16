import { getMarinasForMap } from "@/actions/marinas-map";
import { getFavoriteBoatIds } from "@/actions/favorites";
import { getSessionContext } from "@/lib/auth/session";
import { BoatCard } from "@/components/consumer/boat-card";
import { ConsumerHeader } from "@/components/consumer/consumer-header";
import { BoatSearchFilters } from "@/components/consumer/search-filters";
import { SearchFiltersSheet } from "@/components/consumer/search-filters-sheet";
import { MapViewToggle } from "@/components/maps/map-view-toggle";
import { SearchMapView } from "@/components/maps/search-map-view";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/server";
import type { Boat, Marina } from "@/types/database";
import { Search } from "lucide-react";
import { Suspense } from "react";

interface SearchParams {
  q?: string;
  type?: string;
  minPrice?: string;
  maxPrice?: string;
  location?: string;
  view?: string;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const mapView = params.view === "map";

  let query = supabase
    .from("boats")
    .select("*, marinas!inner(*)")
    .eq("status", "active")
    .eq("marinas.is_active", true);

  if (params.type) {
    query = query.eq("boat_type", params.type);
  }
  if (params.minPrice) {
    query = query.gte("hourly_rate", Number(params.minPrice));
  }
  if (params.maxPrice) {
    query = query.lte("hourly_rate", Number(params.maxPrice));
  }
  if (params.q) {
    query = query.or(
      `name.ilike.%${params.q}%,description.ilike.%${params.q}%`
    );
  }
  if (params.location) {
    query = query.or(
      `city.ilike.%${params.location}%,state.ilike.%${params.location}%`,
      { referencedTable: "marinas" }
    );
  }

  const { data: boats } = await query.order("hourly_rate");

  const typedBoats = (boats as (Boat & { marinas: Marina })[]) ?? [];
  const marinaIds = [...new Set(typedBoats.map((b) => b.marinas.id))];
  const mapMarinas = await getMarinasForMap(marinaIds);

  const session = await getSessionContext();
  const isAuthenticated = !!session;
  const favoriteIds = isAuthenticated ? await getFavoriteBoatIds() : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <ConsumerHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Search Results</h1>
          <div className="flex items-center gap-2">
            <SearchFiltersSheet />
            <Suspense fallback={null}>
              <MapViewToggle />
            </Suspense>
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-4">
          <aside className="hidden lg:col-span-1 lg:block">
            <BoatSearchFilters />
          </aside>
          <div className="lg:col-span-3">
            {typedBoats.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No boats match your search"
                description="Try different filters or browse all available boats."
                actionLabel="Browse all boats"
                actionHref="/search"
              />
            ) : mapView ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Map shows marinas that have boats matching your current filters.
                </p>
                <SearchMapView marinas={mapMarinas} />
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {typedBoats.map((boat) => (
                  <BoatCard 
                    key={boat.id} 
                    boat={boat} 
                    marina={boat.marinas} 
                    isAuthenticated={isAuthenticated}
                    isFavorited={favoriteIds.includes(boat.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
