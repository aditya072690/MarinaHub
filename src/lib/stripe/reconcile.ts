import { stripeCurrencyCode } from "@/lib/currency/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { getStripe } from "./server";
import { isStripeConfigured } from "./config";

export interface StripeBalanceSummary {
  availableBalance: number;
  pendingBalance: number;
  payouts: { id: string; amount: number; arrival_date: number; status: string }[];
}

export async function fetchConnectedAccountBalance(
  stripeAccountId: string,
  currency = stripeCurrencyCode()
): Promise<StripeBalanceSummary | null> {
  if (!isStripeConfigured()) return null;

  try {
    const stripe = getStripe();
    const [balance, payoutsRes] = await Promise.all([
      stripe.balance.retrieve({}, { stripeAccount: stripeAccountId }),
      stripe.payouts.list(
        { limit: 5, status: "pending" },
        { stripeAccount: stripeAccountId }
      ),
    ]);

    const available =
      balance.available.find((b) => b.currency === currency)?.amount ?? 0;
    const pending =
      balance.pending.find((b) => b.currency === currency)?.amount ?? 0;

    return {
      availableBalance: available / 100,
      pendingBalance: pending / 100,
      payouts: payoutsRes.data.map((p) => ({
        id: p.id,
        amount: p.amount / 100,
        arrival_date: p.arrival_date,
        status: p.status,
      })),
    };
  } catch (err) {
    console.error("[stripe reconcile] balance fetch failed:", err);
    return null;
  }
}

export async function getMonthlyTransactionTotals(
  marinaId: string,
  timezone: string
): Promise<{ revenueCents: number; platformFeeCents: number }> {
  const supabase = createAdminClient();
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
  const monthStart = fromZonedTime(monthStartLocal, timezone).toISOString();
  const monthEnd = fromZonedTime(monthEndLocal, timezone).toISOString();

  const { data } = await supabase
    .from("payment_transactions")
    .select("amount_cents, platform_fee_cents")
    .eq("marina_id", marinaId)
    .eq("type", "checkout")
    .eq("status", "succeeded")
    .gte("created_at", monthStart)
    .lt("created_at", monthEnd);

  const rows = data ?? [];
  return {
    revenueCents: rows.reduce((sum, r) => sum + (r.amount_cents ?? 0), 0),
    platformFeeCents: rows.reduce((sum, r) => sum + (r.platform_fee_cents ?? 0), 0),
  };
}
