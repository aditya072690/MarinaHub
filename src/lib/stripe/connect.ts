import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { MarinaPaymentAccount, StripeConnectStatus } from "@/types/database";
import type Stripe from "stripe";
import { getStripe } from "./server";

export function deriveStripeStatus(account: Stripe.Account): StripeConnectStatus {
  if (account.charges_enabled && account.payouts_enabled) {
    return "connected";
  }
  if (account.requirements?.disabled_reason) {
    return "restricted";
  }
  if (account.details_submitted) {
    return "pending";
  }
  return "not_connected";
}

export interface SyncedAccountFields {
  stripe_status: StripeConnectStatus;
  stripe_onboarding_complete: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_details_submitted: boolean;
  connected_at: string | null;
}

export function mapAccountToFields(
  account: Stripe.Account,
  existingConnectedAt: string | null
): SyncedAccountFields {
  const stripe_status = deriveStripeStatus(account);
  const stripe_onboarding_complete =
    Boolean(account.details_submitted) && Boolean(account.charges_enabled);

  return {
    stripe_status,
    stripe_onboarding_complete,
    stripe_charges_enabled: Boolean(account.charges_enabled),
    stripe_payouts_enabled: Boolean(account.payouts_enabled),
    stripe_details_submitted: Boolean(account.details_submitted),
    connected_at:
      stripe_onboarding_complete && !existingConnectedAt
        ? new Date().toISOString()
        : existingConnectedAt,
  };
}

export async function createExpressAccount(params: {
  email: string;
  marinaId: string;
  marinaSlug: string;
}): Promise<Stripe.Account> {
  const stripe = getStripe();
  return stripe.accounts.create({
    type: "express",
    country: "IN",
    email: params.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      marina_id: params.marinaId,
      marina_slug: params.marinaSlug,
    },
  });
}

export async function createAccountOnboardingLink(params: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  const link = await stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding",
  });
  return link.url;
}

export async function retrieveConnectAccount(accountId: string): Promise<Stripe.Account> {
  const stripe = getStripe();
  return stripe.accounts.retrieve(accountId);
}

/** Refresh DB flags from Stripe (fixes stale onboarding state after return URL). */
export async function syncMarinaPaymentAccount(
  marinaId: string
): Promise<MarinaPaymentAccount | null> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("marina_payment_accounts")
    .select("id, marina_id, stripe_account_id, stripe_onboarding_complete, connected_at, platform_fee_pct")
    .eq("marina_id", marinaId)
    .maybeSingle();

  if (!existing?.stripe_account_id) {
    return existing as MarinaPaymentAccount | null;
  }

  try {
    const account = await retrieveConnectAccount(existing.stripe_account_id);
    const fields = mapAccountToFields(account, existing.connected_at);

    const { data: updated, error } = await supabase
      .from("marina_payment_accounts")
      .update(fields)
      .eq("marina_id", marinaId)
      .select("*")
      .single();

    if (error) {
      console.error("[stripe sync] update failed:", error.message);
      return existing as MarinaPaymentAccount;
    }

    return updated as MarinaPaymentAccount;
  } catch (err) {
    console.error("[stripe sync] retrieve failed:", err);
    return existing as MarinaPaymentAccount;
  }
}

export function marinaCanAcceptStripePayments(
  account: MarinaPaymentAccount | null
): account is MarinaPaymentAccount & { stripe_account_id: string } {
  return Boolean(
    account?.stripe_account_id &&
      account.stripe_charges_enabled &&
      account.stripe_onboarding_complete
  );
}
