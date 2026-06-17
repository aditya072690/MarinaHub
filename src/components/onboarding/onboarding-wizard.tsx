"use client";

import {
  completeOnboarding,
  saveOnboardingStep,
  updateMarinaDetails,
} from "@/actions/onboarding";
import { createBoat } from "@/actions/boats";
import { createMarinaFormAction } from "@/actions/marinas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Marina, OnboardingState, OnboardingStep } from "@/types/database";
import { Check, Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: "marina_details", label: "Marina Details" },
  { id: "add_boats", label: "Add Boats" },
  { id: "set_availability", label: "Set Availability" },
  { id: "launch_widget", label: "Launch Widget" },
];

export function OnboardingWizard({
  marina,
  onboardingState,
  hasMembership,
}: {
  marina: Marina | null;
  onboardingState: OnboardingState | null;
  hasMembership: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(
    onboardingState?.current_step ?? "marina_details"
  );
  const [loading, setLoading] = useState(false);
  const [completedLocal, setCompletedLocal] = useState<Set<OnboardingStep>>(
    () => new Set(onboardingState?.completed_steps ?? [])
  );
  const completed = completedLocal;

  useEffect(() => {
    if (onboardingState?.current_step) {
      setStep(onboardingState.current_step);
    }
    if (onboardingState?.completed_steps) {
      setCompletedLocal(new Set(onboardingState.completed_steps));
    }
  }, [onboardingState?.current_step, onboardingState?.completed_steps]);

  useEffect(() => {
    if (onboardingState?.is_complete) {
      router.replace("/dashboard");
    }
  }, [onboardingState?.is_complete, router]);

  async function advance(next?: OnboardingStep) {
    if (marina) {
      const result = await saveOnboardingStep(marina.id, step);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCompletedLocal((prev) => new Set([...prev, step]));
    }
    if (next) setStep(next);
  }

  if (!hasMembership) {
    return <CreateMarinaStep onCreated={() => router.refresh()} />;
  }

  if (!marina) return null;

  if (onboardingState?.is_complete) {
    return null;
  }

  return (
    <div className="space-y-8">
      <StepIndicator current={step} completed={completed} />

      {step === "marina_details" && (
        <MarinaDetailsStep
          marina={marina}
          loading={loading}
          onSubmit={async (values) => {
            setLoading(true);
            const result = await updateMarinaDetails(marina.id, values);
            setLoading(false);
            if (!result.success) {
              toast.error(result.error);
              return;
            }
            toast.success("Marina details saved");
            await advance("add_boats");
          }}
        />
      )}

      {step === "add_boats" && (
        <AddBoatsStep
          marinaId={marina.id}
          loading={loading}
          onSubmit={async (values) => {
            setLoading(true);
            const result = await createBoat(marina.id, values);
            setLoading(false);
            if (!result.success) {
              toast.error(result.error);
              return;
            }
            toast.success("Boat added");
            await advance("set_availability");
          }}
          onSkip={() => advance("set_availability")}
        />
      )}

      {step === "set_availability" && (
        <AvailabilityStep onContinue={() => advance("launch_widget")} />
      )}

      {step === "launch_widget" && (
        <LaunchWidgetStep
          marina={marina}
          loading={loading}
          onComplete={async () => {
            setLoading(true);
            const result = await completeOnboarding(marina.id);
            setLoading(false);
            if (!result.success) {
              toast.error(result.error);
              return;
            }
            toast.success("You're all set!");
            router.push("/dashboard");
          }}
        />
      )}
    </div>
  );
}

function StepIndicator({
  current,
  completed,
}: {
  current: OnboardingStep;
  completed: Set<OnboardingStep>;
}) {
  return (
    <ol className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
      {STEPS.map((s, i) => {
        const isComplete = completed.has(s.id);
        const isCurrent = s.id === current;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium",
                isComplete && "border-emerald-500 bg-emerald-500 text-white",
                isCurrent && !isComplete && "border-sky-500 text-sky-600",
                !isCurrent && !isComplete && "border-slate-300 text-muted-foreground"
              )}
            >
              {isComplete ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm sm:inline",
                isCurrent ? "font-semibold" : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 hidden h-px w-6 bg-slate-200 sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function CreateMarinaStep({ onCreated }: { onCreated: () => void }) {
  const [state, setState] = useState<{ error?: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const formData = new FormData(e.currentTarget);
    const result = await createMarinaFormAction(null, formData);
    setPending(false);
    if (!result?.success) {
      setState({ error: result?.error });
      return;
    }
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Create your marina</h2>
      <div className="space-y-2">
        <Label htmlFor="name">Marina Name</Label>
        <Input id="name" name="name" required placeholder="Sunset Lake Marina" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">URL Slug</Label>
        <Input id="slug" name="slug" required pattern="[a-z0-9-]+" placeholder="sunset-lake" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" className="w-full bg-sky-600" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Create Marina
      </Button>
    </form>
  );
}

function MarinaDetailsStep({
  marina,
  loading,
  onSubmit,
}: {
  marina: Marina;
  loading: boolean;
  onSubmit: (v: {
    name: string;
    description?: string;
    city?: string;
    state?: string;
    contact_email?: string;
    contact_phone?: string;
  }) => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          name: fd.get("name") as string,
          description: (fd.get("description") as string) || undefined,
          city: (fd.get("city") as string) || undefined,
          state: (fd.get("state") as string) || undefined,
          contact_email: (fd.get("contact_email") as string) || undefined,
          contact_phone: (fd.get("contact_phone") as string) || undefined,
        });
      }}
    >
      <h2 className="text-lg font-semibold">Marina details</h2>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={marina.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={marina.description ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={marina.city ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={marina.state ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact_email">Contact Email</Label>
        <Input id="contact_email" name="contact_email" type="email" defaultValue={marina.contact_email ?? ""} />
      </div>
      <Button type="submit" className="bg-sky-600" disabled={loading}>
        Continue
      </Button>
    </form>
  );
}

function AddBoatsStep({
  marinaId,
  loading,
  onSubmit,
  onSkip,
}: {
  marinaId: string;
  loading: boolean;
  onSubmit: (v: unknown) => void;
  onSkip: () => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          name: fd.get("name"),
          boat_type: fd.get("boat_type"),
          capacity: Number(fd.get("capacity")),
          hourly_rate: Number(fd.get("hourly_rate")),
          min_booking_hours: Number(fd.get("min_booking_hours") || 2),
        });
      }}
    >
      <h2 className="text-lg font-semibold">Add your first boat</h2>
      <p className="text-sm text-muted-foreground">Add at least one boat to accept bookings.</p>
      <div className="space-y-2">
        <Label htmlFor="name">Boat Name</Label>
        <Input id="name" name="name" required placeholder="Sea Breeze 24" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="boat_type">Type</Label>
        <Input id="boat_type" name="boat_type" placeholder="Pontoon" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input id="capacity" name="capacity" type="number" defaultValue={6} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hourly_rate">Hourly Rate (₹)</Label>
          <Input id="hourly_rate" name="hourly_rate" type="number" step="0.01" required />
        </div>
      </div>
      <input type="hidden" name="marina_id" value={marinaId} />
      <div className="flex gap-2">
        <Button type="submit" className="bg-sky-600" disabled={loading}>
          Add & Continue
        </Button>
        <Button type="button" variant="outline" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </form>
  );
}

function AvailabilityStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Set availability</h2>
      <p className="text-sm text-muted-foreground">
        Your marina is open for bookings by default. You can add maintenance blocks
        later from Dashboard → Blocks.
      </p>
      <Button onClick={onContinue} className="bg-sky-600">
        Continue
      </Button>
    </div>
  );
}

function LaunchWidgetStep({
  marina,
  loading,
  onComplete,
}: {
  marina: Marina;
  loading: boolean;
  onComplete: () => void;
}) {
  const embedCode = `<script src="${typeof window !== "undefined" ? window.location.origin : ""}/embed.js" data-marina="${marina.id}"></script>
<div id="marinahub-widget"></div>`;

  function copyCode() {
    navigator.clipboard.writeText(embedCode);
    toast.success("Embed code copied");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Launch your booking widget</h2>
      <p className="text-sm text-muted-foreground">
        Share your storefront or embed the widget on your website.
      </p>
      <div className="rounded-lg bg-slate-50 p-4">
        <p className="mb-2 text-sm font-medium">Public booking page</p>
        <code className="text-sm text-sky-600">/m/{marina.slug}</code>
      </div>
      <div className="rounded-lg bg-slate-950 p-4 text-slate-100">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Embed code</p>
          <Button size="sm" variant="secondary" onClick={copyCode}>
            <Copy className="mr-1 h-3 w-3" /> Copy
          </Button>
        </div>
        <pre className="overflow-x-auto text-xs">{embedCode}</pre>
      </div>
      <p className="text-xs text-muted-foreground">
        Configure API keys and origins in Dashboard → Widget after launch.
      </p>
      <Button onClick={onComplete} className="w-full bg-sky-600" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Complete setup & go to dashboard
      </Button>
    </div>
  );
}
