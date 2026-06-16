"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { assertPermission } from "@/lib/auth/rbac";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/api";
import type { OnboardingState, OnboardingStep } from "@/types/database";
import { revalidatePath } from "next/cache";

const STEP_ORDER: OnboardingStep[] = [
  "marina_details",
  "add_boats",
  "set_availability",
  "launch_widget",
];

export async function getOnboardingState(
  marinaId: string
): Promise<OnboardingState | null> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("onboarding_state")
    .select("id, marina_id, current_step, completed_steps, step_data, is_complete, completed_at, updated_at")
    .eq("marina_id", marinaId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as OnboardingState | null;
}

export async function saveOnboardingStep(
  marinaId: string,
  step: OnboardingStep,
  stepData?: Record<string, unknown>
): Promise<ActionResult<OnboardingState>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);
  assertPermission(session.activeRole, "onboarding:write");

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("onboarding_state")
    .select("id, marina_id, current_step, completed_steps, step_data, is_complete, completed_at, updated_at")
    .eq("marina_id", marinaId)
    .maybeSingle();

  const completedSteps = new Set(existing?.completed_steps ?? []);
  completedSteps.add(step);

  const currentIndex = STEP_ORDER.indexOf(step);
  const nextStep = STEP_ORDER[currentIndex + 1] ?? step;

  const mergedStepData = {
    ...(existing?.step_data ?? {}),
    ...(stepData ? { [step]: stepData } : {}),
  };

  const payload = {
    marina_id: marinaId,
    current_step: nextStep,
    completed_steps: Array.from(completedSteps),
    step_data: mergedStepData,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = existing
    ? await supabase
        .from("onboarding_state")
        .update(payload)
        .eq("marina_id", marinaId)
        .select()
        .single()
    : await supabase.from("onboarding_state").insert(payload).select().single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/onboarding");
  return { success: true, data: data as OnboardingState };
}

export async function completeOnboarding(
  marinaId: string
): Promise<ActionResult> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);
  assertPermission(session.activeRole, "onboarding:write");

  const supabase = await createClient();
  const { error } = await supabase
    .from("onboarding_state")
    .update({
      is_complete: true,
      completed_at: new Date().toISOString(),
      current_step: "launch_widget",
      completed_steps: STEP_ORDER,
      updated_at: new Date().toISOString(),
    })
    .eq("marina_id", marinaId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function updateMarinaDetails(
  marinaId: string,
  values: {
    name: string;
    description?: string;
    city?: string;
    state?: string;
    contact_email?: string;
    contact_phone?: string;
    timezone?: string;
  }
): Promise<ActionResult> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);
  assertPermission(session.activeRole, "onboarding:write");

  const supabase = await createClient();
  const { error } = await supabase
    .from("marinas")
    .update(values)
    .eq("id", marinaId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}
