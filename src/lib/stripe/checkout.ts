import { DEFAULT_CURRENCY, stripeCurrencyCode, toStripeMinorUnits } from "@/lib/currency/format";
import { getAppUrl } from "./config";
import { getStripe } from "./server";
import type Stripe from "stripe";

export interface CheckoutBookingRow {
  id: string;
  marina_id: string;
  boat_id: string;
  status: string;
  payment_status: string;
  total_price: number;
  base_price: number | null;
  addons_total: number;
  tax_amount: number | null;
  pricing_breakdown: Record<string, unknown> | null;
  boats: { name: string } | null;
  customers: { email: string } | null;
  marinas: { slug: string } | null;
}

export interface BookingAddonRow {
  total_price: number;
  addon_catalog: { name: string } | null;
}

/** Supabase nested selects may return an object or a one-element array. */
export function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function normalizeCheckoutBooking(row: Record<string, unknown>): CheckoutBookingRow {
  const base = row as unknown as CheckoutBookingRow;
  return {
    ...base,
    boats: normalizeRelation(row.boats as { name: string } | { name: string }[] | null),
    customers: normalizeRelation(
      row.customers as { email: string } | { email: string }[] | null
    ),
    marinas: normalizeRelation(row.marinas as { slug: string } | { slug: string }[] | null),
  };
}

export function buildCheckoutLineItems(
  booking: CheckoutBookingRow,
  addons: BookingAddonRow[],
  currency = stripeCurrencyCode()
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const ruleLabel =
    (booking.pricing_breakdown?.rule_label as string | undefined) ?? "Boat rental";
  const boatName = booking.boats?.name ?? "Boat rental";
  const totalMinor = toStripeMinorUnits(Number(booking.total_price));

  const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  const baseMinor = toStripeMinorUnits(Number(booking.base_price ?? 0));
  if (baseMinor > 0) {
    items.push({
      price_data: {
        currency,
        product_data: {
          name: `${boatName} — ${ruleLabel}`,
          metadata: { booking_id: booking.id },
        },
        unit_amount: baseMinor,
      },
      quantity: 1,
    });
  }

  for (const addon of addons) {
    const minor = toStripeMinorUnits(Number(addon.total_price));
    if (minor <= 0) continue;
    items.push({
      price_data: {
        currency,
        product_data: {
          name: addon.addon_catalog?.name ?? "Add-on",
          metadata: { booking_id: booking.id },
        },
        unit_amount: minor,
      },
      quantity: 1,
    });
  }

  const taxAmount = Number(booking.tax_amount ?? 0);
  if (taxAmount > 0) {
    items.push({
      price_data: {
        currency,
        product_data: { name: "Tax" },
        unit_amount: toStripeMinorUnits(taxAmount),
      },
      quantity: 1,
    });
  }

  if (items.length === 0 && totalMinor > 0) {
    items.push({
      price_data: {
        currency,
        product_data: {
          name: `${boatName} — Booking`,
          metadata: { booking_id: booking.id },
        },
        unit_amount: totalMinor,
      },
      quantity: 1,
    });
  }

  if (items.length === 0 || totalMinor < 50) {
    throw new Error("Booking total must be at least ₹0.50 to checkout");
  }

  return reconcileLineItemsToTotal(items, totalMinor);
}

/** Ensure Stripe line items sum to booking total (adjust tax line for ≤1 minor unit drift). */
export function reconcileLineItemsToTotal(
  items: Stripe.Checkout.SessionCreateParams.LineItem[],
  totalMinor: number
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const sumMinor = items.reduce(
    (sum, item) => sum + (item.price_data?.unit_amount ?? 0) * (item.quantity ?? 1),
    0
  );

  const delta = totalMinor - sumMinor;
  if (delta === 0) return items;

  if (Math.abs(delta) <= 1) {
    const taxIdx = items.findIndex((i) => i.price_data?.product_data?.name === "Tax");
    if (taxIdx >= 0 && items[taxIdx]?.price_data) {
      const adjusted = [...items];
      adjusted[taxIdx] = {
        ...adjusted[taxIdx],
        price_data: {
          ...adjusted[taxIdx].price_data!,
          unit_amount: (adjusted[taxIdx].price_data!.unit_amount ?? 0) + delta,
        },
      };
      return adjusted;
    }
  }

  if (sumMinor !== totalMinor) {
    throw new Error(
      `Checkout line items (${sumMinor}) do not match booking total (${totalMinor})`
    );
  }

  return items;
}

export function buildCheckoutUrls(params: {
  source: "consumer" | "widget";
  marinaSlug: string;
  marinaId: string;
  bookingId: string;
  boatId: string;
}): { successUrl: string; cancelUrl: string } {
  const appUrl = getAppUrl();

  if (params.source === "widget") {
    return {
      successUrl: `${appUrl}/embed/${params.marinaId}?confirmed=${params.bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/embed/${params.marinaId}?checkout=cancelled`,
    };
  }

  return {
    successUrl: `${appUrl}/m/${params.marinaSlug}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appUrl}/m/${params.marinaSlug}/boats/${params.boatId}?checkout=cancelled`,
  };
}

export async function createBookingCheckoutSession(params: {
  booking: CheckoutBookingRow;
  addons: BookingAddonRow[];
  connectedAccountId?: string | null;
  platformFeePct: number;
  source: "consumer" | "widget";
  currency?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const { booking } = params;
  const marinaSlug = booking.marinas?.slug;
  if (!marinaSlug) {
    throw new Error("Marina slug not found");
  }

  const stripeCurrency = stripeCurrencyCode(params.currency ?? DEFAULT_CURRENCY);
  const totalMinor = toStripeMinorUnits(Number(booking.total_price));
  const platformFeeMinor = Math.round(totalMinor * params.platformFeePct);
  const lineItems = buildCheckoutLineItems(booking, params.addons, stripeCurrency);
  const { successUrl, cancelUrl } = buildCheckoutUrls({
    source: params.source,
    marinaSlug,
    marinaId: booking.marina_id,
    bookingId: booking.id,
    boatId: booking.boat_id,
  });

  const metadata = {
    booking_id: booking.id,
    marina_id: booking.marina_id,
    source: params.source,
  };

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: lineItems,
    metadata,
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: booking.customers?.email ?? undefined,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    // RBI / Stripe India: export transactions require customer name + billing address
    ...(stripeCurrency === "inr"
      ? { billing_address_collection: "required" as const }
      : {}),
  };

  // Connect destination charge when marina has a live connected account
  if (params.connectedAccountId) {
    sessionParams.payment_intent_data = {
      application_fee_amount: Math.max(platformFeeMinor, 0),
      transfer_data: { destination: params.connectedAccountId },
      metadata: {
        booking_id: booking.id,
        marina_id: booking.marina_id,
      },
    };
  }

  return stripe.checkout.sessions.create(sessionParams);
}
