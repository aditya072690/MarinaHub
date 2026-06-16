import { Check } from "lucide-react";

export function BoatAmenities({ amenities }: { amenities: string[] }) {
  if (!amenities.length) return null;

  return (
    <section className="mb-8">
      <h3 className="mb-3 font-semibold">Amenities</h3>
      <ul className="grid grid-cols-2 gap-2">
        {amenities.map((a) => (
          <li key={a} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-emerald-600" />
            {a}
          </li>
        ))}
      </ul>
    </section>
  );
}
