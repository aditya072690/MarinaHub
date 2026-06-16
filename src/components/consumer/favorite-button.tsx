"use client";

import { toggleFavorite } from "@/actions/favorites";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function FavoriteButton({
  boatId,
  marinaId,
  initialFavorited,
  isAuthenticated,
  className,
}: {
  boatId: string;
  marinaId: string;
  initialFavorited: boolean;
  isAuthenticated: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.info("Sign in to save favorites");
      router.push("/account/login?redirect=/account/favorites");
      return;
    }

    setLoading(true);
    const result = await toggleFavorite(boatId, marinaId);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setFavorited(result.data.favorited);
    toast.success(result.data.favorited ? "Saved to favorites" : "Removed from favorites");
    router.refresh();
  }

  if (!isAuthenticated) {
    return (
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className={cn("h-9 w-9 rounded-full bg-white/90 shadow", className)}
        onClick={handleClick}
        aria-label="Sign in to save favorites"
      >
        <Heart className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className={cn(
        "h-9 w-9 rounded-full bg-white/90 shadow",
        favorited && "text-red-500",
        className
      )}
      disabled={loading}
      onClick={handleClick}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={cn("h-4 w-4", favorited && "fill-current")} />
    </Button>
  );
}
