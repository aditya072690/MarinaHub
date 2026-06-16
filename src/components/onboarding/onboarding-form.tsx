"use client";

import { createMarinaFormAction } from "@/actions/marinas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/types/api";
import type { Marina } from "@/types/database";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

const initialState: ActionResult<Marina> | null = null;

export function OnboardingForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createMarinaFormAction,
    initialState
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    toast.error(state.error);
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Marina Name</Label>
        <Input id="name" name="name" placeholder="Sunset Lake Marina" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">URL Slug</Label>
        <Input
          id="slug"
          name="slug"
          placeholder="sunset-lake"
          pattern="[a-z0-9-]+"
          title="Lowercase letters, numbers, and hyphens only"
          required
        />
        <p className="text-xs text-muted-foreground">
          Your booking page: /m/sunset-lake (lowercase only)
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" placeholder="Austin" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" placeholder="TX" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact_email">Contact Email</Label>
        <Input id="contact_email" name="contact_email" type="email" />
      </div>

      {state && !state.success && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full bg-sky-600 hover:bg-sky-700"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating marina...
          </>
        ) : (
          "Create Marina"
        )}
      </Button>
    </form>
  );
}
