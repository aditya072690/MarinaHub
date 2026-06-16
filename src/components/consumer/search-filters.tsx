"use client";

import { SearchFiltersForm } from "@/components/consumer/search-filters-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BoatSearchFilters() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <SearchFiltersForm />
      </CardContent>
    </Card>
  );
}
