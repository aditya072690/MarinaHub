"use server";

import { linkCustomerRecords } from "@/lib/auth/consumer-session";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/api";
import type { Profile } from "@/types/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
});

const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1),
    new_password: z.string().min(12),
    confirm_password: z.string().min(12),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

const settingsSchema = z.object({
  email_notifications: z.boolean(),
  booking_reminders: z.boolean(),
});

async function getAccountSession(redirectPath: string) {
  const session = await getSessionContext();
  if (!session) {
    redirect(`/auth/login?intent=consumer&redirect=${encodeURIComponent(redirectPath)}`);
  }
  return session;
}

export async function updateProfile(values: unknown): Promise<ActionResult<Profile>> {
  const session = await getAccountSession("/account");
  const parsed = profileSchema.safeParse(values);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone ?? null,
    })
    .eq("id", session.userId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  const profile = data as Profile;
  await linkCustomerRecords(session.userId, profile.email);

  revalidatePath("/account");
  return { success: true, data: profile };
}

export async function changePassword(values: unknown): Promise<ActionResult> {
  await getAccountSession("/account/settings");
  const parsed = passwordChangeSchema.safeParse(values);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: "Not authenticated" };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });

  if (signInError) {
    return { success: false, error: "Current password is incorrect" };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function updateAccountSettings(
  values: unknown
): Promise<ActionResult<{ email_notifications: boolean; booking_reminders: boolean }>> {
  const session = await getAccountSession("/account/settings");
  const parsed = settingsSchema.safeParse(values);

  if (!parsed.success) {
    return { success: false, error: "Invalid settings" };
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      settings: {
        email_notifications: parsed.data.email_notifications,
        booking_reminders: parsed.data.booking_reminders,
      },
    })
    .eq("id", session.userId)
    .select("settings")
    .single();

  if (error || !profile) {
    return { success: false, error: error?.message ?? "Profile not found" };
  }

  revalidatePath("/account/settings");
  const settings = profile.settings as {
    email_notifications?: boolean;
    booking_reminders?: boolean;
  };
  return {
    success: true,
    data: {
      email_notifications: settings.email_notifications ?? true,
      booking_reminders: settings.booking_reminders ?? true,
    },
  };
}

export async function getAccountSettings(): Promise<{
  email_notifications: boolean;
  booking_reminders: boolean;
}> {
  const session = await getAccountSession("/account/settings");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", session.userId)
    .single();

  const settings = (profile?.settings ?? {}) as {
    email_notifications?: boolean;
    booking_reminders?: boolean;
  };

  return {
    email_notifications: settings.email_notifications ?? true,
    booking_reminders: settings.booking_reminders ?? true,
  };
}

export async function getConsumerTrips(tab: "upcoming" | "past") {
  const redirectPath = "/account/trips";
  const session = await getAccountSession(redirectPath);
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", session.userId)
    .single();

  if (!profile) return [];

  const { data: customerIds } = await supabase
    .from("customers")
    .select("id")
    .or(`user_id.eq.${session.userId},email.eq.${profile.email}`);

  const ids = (customerIds ?? []).map((c) => c.id);
  if (ids.length === 0) return [];

  let query = supabase
    .from("bookings")
    .select("*, boats(*), marinas(id, name, slug, timezone)")
    .in("customer_id", ids)
    .order("start_at", { ascending: tab === "upcoming" });

  const now = new Date().toISOString();

  if (tab === "upcoming") {
    query = query
      .in("status", ["pending", "confirmed", "checked_in", "checked_out"])
      .gte("end_at", now)
      .neq("payment_status", "failed");
  } else {
    query = query.in("status", ["completed", "cancelled", "no_show"]);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** @deprecated Use getConsumerTrips with tab "past" */
export async function getConsumerTripsLegacy(
  tab: "upcoming" | "completed" | "cancelled"
) {
  if (tab === "upcoming") return getConsumerTrips("upcoming");
  if (tab === "completed") return getConsumerTrips("past");
  const session = await getAccountSession("/account/history");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", session.userId)
    .single();
  if (!profile) return [];
  const { data: customerIds } = await supabase
    .from("customers")
    .select("id")
    .or(`user_id.eq.${session.userId},email.eq.${profile.email}`);
  const ids = (customerIds ?? []).map((c) => c.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("bookings")
    .select("*, boats(*), marinas(id, name, slug, timezone)")
    .in("customer_id", ids)
    .eq("status", "cancelled")
    .order("start_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAccountProfile(): Promise<Profile | null> {
  const session = await getAccountSession("/account");
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, user_id, marina_id, full_name, email, phone, last_booking_at, total_bookings, total_spent, created_at")
    .eq("id", session.userId)
    .single();
  return data as Profile | null;
}
