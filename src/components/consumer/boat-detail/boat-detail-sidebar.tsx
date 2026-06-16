import { BookingWizard } from "@/components/consumer/booking-wizard";
import type { AddonCatalogItem, Boat } from "@/types/database";

export function BoatDetailSidebar({
  boat,
  marinaSlug,
  timezone,
  defaultCustomer,
  addonCatalog,
  allBoats,
}: {
  boat: Boat;
  marinaSlug: string;
  timezone: string;
  defaultCustomer?: { full_name: string; email: string; phone?: string };
  addonCatalog: AddonCatalogItem[];
  allBoats: Boat[];
}) {
  return (
    <div id="booking" className="lg:sticky lg:top-24">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Book Now</h2>
        <BookingWizard
          boat={boat}
          marinaSlug={marinaSlug}
          timezone={timezone}
          defaultCustomer={defaultCustomer}
          addonCatalog={addonCatalog}
          allBoats={allBoats}
        />
      </div>
    </div>
  );
}
