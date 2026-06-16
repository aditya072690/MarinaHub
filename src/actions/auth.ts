"use server";

import { linkCustomerRecords } from "@/lib/auth/consumer-session";
import {
  type AuthIntent,
  isSafeRedirect,
  setAuthIntent,
} from "@/lib/auth/intent";
import { setActiveMarinaCookie } from "@/lib/auth/cookies";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { authSchema } from "@/lib/validations/booking.schema";
import type { ActionResult } from "@/types/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(12),
});

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function parseAuthForm(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const fullName = formData.get("full_name");

  return authSchema.safeParse({
    email: typeof email === "string" ? email.trim() : "",
    password: typeof password === "string" ? password : "",
    full_name:
      typeof fullName === "string" && fullName.trim().length > 0
        ? fullName.trim()
        : undefined,
  });
}

async function getPostLoginRedirect(
  formData: FormData,
  intent: AuthIntent
): Promise<string> {
  const session = await getSessionContext();
  const redirectParam = formData.get("redirect")?.toString();

  if (isSafeRedirect(redirectParam)) {
    if (
      redirectParam.startsWith("/dashboard") &&
      !session?.memberships.length
    ) {
      return intent === "consumer" ? "/account" : "/onboarding";
    }
    return redirectParam;
  }

  if (intent === "consumer") {
    return "/account";
  }

  return session?.memberships.length ? "/dashboard" : "/onboarding";
}

export type AuthActionResult = ActionResult<{ redirectTo: string }>;

export async function signUpConsumer(formData: FormData): Promise<AuthActionResult> {
  const parsed = parseAuthForm(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { success: allowed } = await checkRateLimit(
    `signup:${parsed.data.email}`,
    5,
    300_000
  );
  if (!allowed) {
    return { success: false, error: "Too many attempts. Please try again later." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      data: {
        full_name: parsed.data.full_name ?? "",
        account_type: "consumer",
      },
    },
  });

  if (error) return { success: false, error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    await linkCustomerRecords(user.id, parsed.data.email);
    await setAuthIntent("consumer");
    revalidatePath("/", "layout");
    const redirectTo = await getPostLoginRedirect(formData, "consumer");
    return { success: true, data: { redirectTo } };
  }

  return { success: true, data: { redirectTo: "/auth/login?intent=consumer" } };
}

export async function signUpMarina(formData: FormData): Promise<AuthActionResult> {
  const parsed = parseAuthForm(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { success: allowed } = await checkRateLimit(
    `signup:${parsed.data.email}`,
    5,
    300_000
  );
  if (!allowed) {
    return { success: false, error: "Too many attempts. Please try again later." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      data: {
        full_name: parsed.data.full_name ?? "",
        account_type: "marina",
      },
    },
  });

  if (error) return { success: false, error: error.message };

  await setAuthIntent("marina");
  return { success: true, data: { redirectTo: "/auth/login?intent=marina" } };
}

export async function signInConsumer(formData: FormData): Promise<AuthActionResult> {
  const parsed = parseAuthForm(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { success: allowed } = await checkRateLimit(
    `login:${parsed.data.email}`,
    10,
    300_000
  );
  if (!allowed) {
    return { success: false, error: "Too many login attempts. Please try again later." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { success: false, error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email) {
    await linkCustomerRecords(user.id, user.email);
  }

  await setAuthIntent("consumer");
  revalidatePath("/", "layout");
  const redirectTo = await getPostLoginRedirect(formData, "consumer");
  return { success: true, data: { redirectTo } };
}

export async function signInMarina(formData: FormData): Promise<AuthActionResult> {
  const parsed = parseAuthForm(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [{ success: allowed }, supabase] = await Promise.all([
    checkRateLimit(`login:${parsed.data.email}`, 10, 300_000),
    createClient(),
  ]);

  if (!allowed) {
    return { success: false, error: "Too many login attempts. Please try again later." };
  }

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { success: false, error: error.message };

  const user = signInData.user;
  if (!user) {
    return { success: false, error: "Sign in failed" };
  }

  const redirectParam = formData.get("redirect")?.toString();
  const [{ data: memberships }] = await Promise.all([
    supabase.from("marina_members").select("marina_id").eq("user_id", user.id),
    setAuthIntent("marina"),
  ]);

  const firstMarinaId = memberships?.[0]?.marina_id;
  if (firstMarinaId) {
    await setActiveMarinaCookie(firstMarinaId);
  }

  revalidatePath("/dashboard");

  if (isSafeRedirect(redirectParam)) {
    if (redirectParam.startsWith("/dashboard") && !memberships?.length) {
      return { success: true, data: { redirectTo: "/onboarding" } };
    }
    return { success: true, data: { redirectTo: redirectParam } };
  }

  const redirectTo = memberships?.length ? "/dashboard" : "/onboarding";
  return { success: true, data: { redirectTo } };
}

export async function forgotPassword(
  formData: FormData
): Promise<ActionResult<{ message: string }>> {
  const parsed = emailSchema.safeParse({
    email: formData.get("email")?.toString().trim(),
  });

  if (!parsed.success) {
    return { success: false, error: "Please enter a valid email address" };
  }

  const { success: allowed } = await checkRateLimit(
    `forgot:${parsed.data.email}`,
    5,
    300_000
  );
  if (!allowed) {
    return { success: false, error: "Too many attempts. Please try again later." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/reset-password`,
  });

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: {
      message: "If an account exists for that email, a reset link has been sent.",
    },
  };
}

export async function resetPassword(
  formData: FormData
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password")?.toString(),
  });

  if (!parsed.success) {
    return { success: false, error: "Password must be at least 12 characters" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, data: { redirectTo: "/account" } };
}

export async function signInWithGoogle(
  intent: AuthIntent
): Promise<ActionResult<{ url: string }>> {
  await setAuthIntent(intent);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback?intent=${intent}`,
    },
  });

  if (error || !data.url) {
    return { success: false, error: error?.message ?? "Could not start Google sign-in" };
  }

  return { success: true, data: { url: data.url } };
}

/** @deprecated Use signInConsumer or signInMarina */
export async function signIn(formData: FormData): Promise<AuthActionResult> {
  return signInMarina(formData);
}

/** @deprecated Use signUpMarina */
export async function signUp(formData: FormData): Promise<AuthActionResult> {
  return signUpMarina(formData);
}

export async function switchAuthContext(intent: AuthIntent): Promise<void> {
  await setAuthIntent(intent);
  revalidatePath("/", "layout");

  if (intent === "consumer") {
    redirect("/account");
  }

  const session = await getSessionContext();
  redirect(session?.memberships.length ? "/dashboard" : "/onboarding");
}
