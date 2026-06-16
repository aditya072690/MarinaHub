"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchFiltersForm({ onApplied }: { onApplied?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");

  function applyFilters() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (location) params.set("location", location);
    if (type) params.set("type", type);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    const view = searchParams.get("view");
    if (view) params.set("view", view);
    router.push(`/search?${params.toString()}`);
    onApplied?.();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Search</Label>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Boat name..."
        />
      </div>
      <div className="space-y-2">
        <Label>Location</Label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City or lake..."
        />
      </div>
      <div className="space-y-2">
        <Label>Boat Type</Label>
        <Select value={type} onValueChange={(v) => setType(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Any type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any type</SelectItem>
            <SelectItem value="pontoon">Pontoon</SelectItem>
            <SelectItem value="fishing">Fishing</SelectItem>
            <SelectItem value="cruiser">Cruiser</SelectItem>
            <SelectItem value="yacht">Yacht</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Min ₹/hr</Label>
          <Input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label>Max ₹/hr</Label>
          <Input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="500"
          />
        </div>
      </div>
      <Button className="w-full bg-sky-600 hover:bg-sky-700" onClick={applyFilters}>
        Apply Filters
      </Button>
    </div>
  );
}
