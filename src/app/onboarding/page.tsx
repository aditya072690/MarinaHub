import { SignOutButton } from "@/components/auth/sign-out-button";
import { getOnboardingState } from "@/actions/onboarding";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getSessionContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const session = await getSessionContext();
  if (!session) redirect("/marina/login");

  const hasMembership = session.memberships.length > 0;
  const marina = session.activeMarina ?? session.memberships[0]?.marinas ?? null;
  const marinaId = marina?.id;

  let onboardingState = null;
  if (marinaId) {
    onboardingState = await getOnboardingState(marinaId);
    if (onboardingState?.is_complete) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex justify-end">
          <SignOutButton variant="ghost" size="sm" />
        </div>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Set up your marina</h1>
          <p className="mt-2 text-muted-foreground">
            Complete these steps to start accepting bookings
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <OnboardingWizard
            marina={marina}
            onboardingState={onboardingState}
            hasMembership={hasMembership}
          />
        </div>
      </div>
    </div>
  );
}
