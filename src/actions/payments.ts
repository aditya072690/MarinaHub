"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { canManageSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { DEFAULT_CURRENCY } from "@/lib/currency/format";
import { isStripeConfigured, maskStripeAccountId } from "@/lib/stripe/config";
import {
  fetchConnectedAccountBalance,
  getMonthlyTransactionTotals,
} from "@/lib/stripe/reconcile";
import { syncMarinaPaymentAccount } from "@/lib/stripe/connect";
import { createClient } from "@/lib/supabase/server";
import type {
  MarinaPaymentAccount,
  PaymentTransaction,
} from "@/types/database";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { revalidatePath } from "next/cache";

export interface PaymentSummaryPayoutRow {
  id: string;
  amount: number;
  created_at: string;
  status: string;
  description: string;
  estimated?: boolean;
}

export interface PaymentSummary {
  account: MarinaPaymentAccount | null;
  stripeConfigured: boolean;
  currency: string;
  revenueThisMonth: number;
  platformFees: number;
  netRevenue: number;
  pendingPayouts: PaymentSummaryPayoutRow[];
  recentTransactions: PaymentTransaction[];
  maskedAccountId: string | null;
  usingEstimatedData: boolean;
}

export async function getPaymentSummary(marinaId: string): Promise<PaymentSummary> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId, canManageSettings);

  const supabase = await createClient();
  const stripeConfigured = isStripeConfigured();

  const [marinaRes, settingsRes] = await Promise.all([
    supabase.from("marinas").select("timezone").eq("id", marinaId).single(),
    supabase
      .from("marina_settings")
      .select("currency")
      .eq("marina_id", marinaId)
      .maybeSingle(),
  ]);

  const marina = marinaRes.data;
  const settings = settingsRes.data;

  const currency = settings?.currency ?? DEFAULT_CURRENCY;

  const timezone = marina?.timezone ?? "America/New_York";

  const [accountRes, transactionsRes, mockTransactionsRes] = await Promise.all([
    supabase
      .from("marina_payment_accounts")
      .select(
        "id, marina_id, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled, stripe_status, platform_fee_pct, connected_at, created_at, updated_at"
      )
      .eq("marina_id", marinaId)
      .maybeSingle(),
    supabase
      .from("payment_transactions")
      .select(
        "id, marina_id, booking_id, type, status, amount_cents, currency, platform_fee_cents, stripe_payment_intent_id, created_at"
      )
      .eq("marina_id", marinaId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("mock_transactions")
      .select("id, marina_id, booking_id, type, status, amount, description, created_at")
      .eq("marina_id", marinaId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  let account = accountRes.data as unknown as MarinaPaymentAccount | null;

  if (stripeConfigured && account?.stripe_account_id) {
    account = (await syncMarinaPaymentAccount(marinaId)) ?? account;
  }
  let recentTransactions = (transactionsRes.data ?? []) as unknown as PaymentTransaction[];

  if (recentTransactions.length === 0) {
    const mockRows = mockTransactionsRes.data ?? [];
    if (mockRows.length > 0) {
      recentTransactions = mockRows.map((tx) => mapMockTransaction(tx, currency));
    } else {
      const { data: bookingRows } = await supabase
        .from("bookings")
        .select("id, total_price, status, payment_status, paid_at, created_at")
        .eq("marina_id", marinaId)
        .in("status", ["confirmed", "checked_in", "checked_out", "completed"])
        .order("created_at", { ascending: false })
        .limit(10);

      recentTransactions = (bookingRows ?? []).map((booking) => ({
        id: booking.id,
        marina_id: marinaId,
        booking_id: booking.id,
        type: "checkout" as const,
        status: "succeeded" as const,
        amount_cents: Math.round(Number(booking.total_price) * 100),
        currency,
        platform_fee_cents: 0,
        stripe_session_id: null,
        stripe_payment_intent_id: null,
        stripe_charge_id: null,
        stripe_payout_id: null,
        stripe_event_id: null,
        description: `Booking payment (${booking.status})`,
        metadata: {},
        created_at: booking.paid_at ?? booking.created_at,
      }));
    }
  }

  let revenueThisMonth = 0;
  let platformFees = 0;
  let netRevenue = 0;
  let pendingPayouts: PaymentSummaryPayoutRow[] = [];
  let usingEstimatedData = false;

  if (stripeConfigured && account?.stripe_onboarding_complete && account.stripe_account_id) {
    const [monthly, balance] = await Promise.all([
      getMonthlyTransactionTotals(marinaId, timezone),
      fetchConnectedAccountBalance(account.stripe_account_id, currency),
    ]);
    revenueThisMonth = monthly.revenueCents / 100;
    platformFees = monthly.platformFeeCents / 100;
    netRevenue = Math.round((revenueThisMonth - platformFees) * 100) / 100;

    if (balance) {
      pendingPayouts = balance.payouts.map((p) => ({
        id: p.id,
        amount: p.amount,
        created_at: new Date(p.arrival_date * 1000).toISOString(),
        status: p.status,
        description: "Stripe payout",
      }));

      if (pendingPayouts.length === 0 && balance.pendingBalance > 0) {
        pendingPayouts = [
          {
            id: "pending-balance",
            amount: balance.pendingBalance,
            created_at: new Date().toISOString(),
            status: "pending",
            description: "Pending balance (Stripe)",
          },
        ];
      }
    }
  } else {
    usingEstimatedData = true;
    const zonedNow = toZonedTime(new Date(), timezone);
    const monthStartLocal = new Date(
      zonedNow.getFullYear(),
      zonedNow.getMonth(),
      1,
      0,
      0,
      0
    );
    const monthEndLocal = new Date(
      zonedNow.getFullYear(),
      zonedNow.getMonth() + 1,
      1,
      0,
      0,
      0
    );
    const monthStart = fromZonedTime(monthStartLocal, timezone);
    const monthEnd = fromZonedTime(monthEndLocal, timezone);

    const { data: revenueCents, error: revenueError } = await supabase.rpc(
      "marina_gross_revenue",
      {
        p_marina_id: marinaId,
        p_from: monthStart.toISOString(),
        p_to: monthEnd.toISOString(),
      }
    );

    if (revenueError) throw new Error(revenueError.message);

    const feePct = account?.platform_fee_pct ?? 0.03;
    revenueThisMonth = Number(revenueCents ?? 0);
    platformFees = Math.round(revenueThisMonth * feePct * 100) / 100;
    netRevenue = Math.round((revenueThisMonth - platformFees) * 100) / 100;

    if (netRevenue > 0) {
      pendingPayouts = [
        {
          id: "estimated-pending",
          amount: netRevenue,
          created_at: new Date().toISOString(),
          status: "pending",
          description: "Estimated net payout (connect Stripe for live transfers)",
          estimated: true,
        },
      ];
    }
  }

  return {
    account,
    stripeConfigured,
    currency,
    revenueThisMonth,
    platformFees,
    netRevenue,
    pendingPayouts,
    recentTransactions,
    maskedAccountId: account?.stripe_account_id
      ? maskStripeAccountId(account.stripe_account_id)
      : null,
    usingEstimatedData,
  };
}

export async function revalidatePaymentsPage() {
  revalidatePath("/dashboard/payments");
}

function mapMockTransaction(
  tx: {
    id: string;
    marina_id: string;
    booking_id: string | null;
    type: string;
    status: string;
    amount: number;
    description: string | null;
    created_at: string;
  },
  currency: string
): PaymentTransaction {
  return {
    id: tx.id,
    marina_id: tx.marina_id,
    booking_id: tx.booking_id,
    type:
      tx.type === "booking_charge"
        ? "checkout"
        : tx.type === "platform_fee"
          ? "platform_fee"
          : tx.type === "payout"
            ? "payout"
            : "adjustment",
    status: tx.status === "completed" ? "succeeded" : (tx.status as PaymentTransaction["status"]),
    amount_cents: Math.round(Number(tx.amount) * 100),
    currency,
    platform_fee_cents: 0,
    stripe_session_id: null,
    stripe_payment_intent_id: null,
    stripe_charge_id: null,
    stripe_payout_id: null,
    stripe_event_id: null,
    description: tx.description,
    metadata: {},
    created_at: tx.created_at,
  };
}
