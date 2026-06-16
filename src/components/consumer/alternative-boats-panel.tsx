"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AlternativeBoat } from "@/types/database";
import { formatCurrency } from "@/lib/currency/format";
import { ArrowRight, Ship } from "lucide-react";
import Image from "next/image";

interface AlternativeBoatsPanelProps {
  alternatives: AlternativeBoat[];
  onSelect: (boatId: string) => void;
  loading?: boolean;
  currency?: string;
}

export function AlternativeBoatsPanel({
  alternatives,
  onSelect,
  loading,
  currency = "USD",
}: AlternativeBoatsPanelProps) {
  if (loading) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Finding available alternatives...
        </CardContent>
      </Card>
    );
  }

  if (alternatives.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amber-900">Boat unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800">
          No alternative boats match your dates and guest count. Try different dates or join the
          waitlist.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-amber-900">
          Boat unavailable — try these alternatives
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alternatives.map((alt) => (
          <div
            key={alt.boat_id}
            className="flex items-center gap-3 rounded-lg border bg-white p-3"
          >
            <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
              {alt.image_url ? (
                <Image src={alt.image_url} alt={alt.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Ship className="h-6 w-6 text-slate-400" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{alt.name}</p>
              <p className="text-xs text-muted-foreground">
                Up to {alt.capacity} guests · {formatCurrency(alt.estimated_total, currency)}
              </p>
              {alt.rule_label && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {alt.rule_label}
                </Badge>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => onSelect(alt.boat_id)}>
              Select
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
