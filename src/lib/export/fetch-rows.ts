import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_CURRENCY } from "@/lib/currency/format";
import { formatInMarinaTimezone } from "@/lib/timezone";
import type { CsvRow } from "./build-csv";

function normalizeRelation<T>(rel: T | T[] | null): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

function formatAddons(
  addons: Array<{
    quantity: number;
    addon_catalog: { name: string } | { name: string }[] | null;
  }> | null
): string {
  if (!addons?.length) return "";
  return addons
    .map((a) => {
      const catalog = normalizeRelation(a.addon_catalog);
      const name = catalog?.name ?? "Add-on";
      return `${name} x${a.quantity}`;
    })
    .join("; ");
}

export async function fetchBookingsExportRows(
  marinaId: string,
  timezone: string,
  marinaName: string,
  currency: string
): Promise<CsvRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "*, boats(name), customers(full_name, email), booking_addons(quantity, addon_catalog(name))"
    )
    .eq("marina_id", marinaId)
    .order("start_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((booking) => ({
    booking_id: booking.id,
    customer_name: booking.customers?.full_name ?? "",
    customer_email: booking.customers?.email ?? "",
    boat: normalizeRelation(booking.boats as { name: string } | { name: string }[] | null)?.name ?? "",
    date: formatInMarinaTimezone(booking.start_at, timezone, "yyyy-MM-dd"),
    guests: booking.guest_count,
    addons: formatAddons(
      booking.booking_addons as Array<{
        quantity: number;
        addon_catalog: { name: string } | { name: string }[] | null;
      }> | null
    ),
    status: booking.status,
    payment_status: booking.payment_status,
    total_amount: Number(booking.total_price),
    currency,
    marina: marinaName,
  }));
}

export async function fetchCustomersExportRows(
  marinaId: string,
  timezone: string,
  marinaName: string
): Promise<CsvRow[]> {
  const supabase = createAdminClient();

  await supabase.rpc("refresh_customer_segments", { p_marina_id: marinaId });

  const [{ data: customers, error }, { data: segments }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name, email, phone, total_bookings, total_spent, last_booking_at")
      .eq("marina_id", marinaId)
      .order("last_booking_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("customer_segment_snapshots")
      .select("customer_id, segment")
      .eq("marina_id", marinaId),
  ]);

  if (error) throw new Error(error.message);

  const segmentMap = new Map(
    (segments ?? []).map((s) => [s.customer_id, s.segment as string])
  );

  return (customers ?? []).map((c) => ({
    customer_id: c.id,
    name: c.full_name,
    email: c.email,
    phone: c.phone ?? "",
    total_bookings: c.total_bookings,
    total_spent: Number(c.total_spent),
    segment: segmentMap.get(c.id) ?? "first_time",
    last_booking_date: c.last_booking_at
      ? formatInMarinaTimezone(c.last_booking_at, timezone, "yyyy-MM-dd")
      : "",
    marina: marinaName,
  }));
}

export async function fetchRevenueExportRows(
  marinaId: string,
  timezone: string,
  marinaName: string
): Promise<CsvRow[]> {
  const supabase = createAdminClient();

  const [
    { data: account },
    { data: transactions, error }
  ] = await Promise.all([
    supabase
      .from("marina_payment_accounts")
      .select("stripe_onboarding_complete, platform_fee_pct")
      .eq("marina_id", marinaId)
      .maybeSingle(),
    supabase
      .from("payment_transactions")
      .select(
        "*, bookings(boats(name), total_price, addons_total, booking_addons(quantity, addon_catalog(name)))"
      )
      .eq("marina_id", marinaId)
      .in("type", ["checkout", "refund"])
      .order("created_at", { ascending: false })
  ]);

  if (error) throw new Error(error.message);

  if (transactions && transactions.length > 0) {
    return transactions.map((tx) => {
      const booking = normalizeRelation(
        tx.bookings as {
          boats: { name: string } | { name: string }[] | null;
          total_price: number;
          addons_total: number | null;
          booking_addons: Array<{
            quantity: number;
            addon_catalog: { name: string } | { name: string }[] | null;
          }> | null;
        } | null
      );
      const boat = normalizeRelation(booking?.boats)?.name ?? "";
      const amount = tx.amount_cents / 100;
      const platformFee = (tx.platform_fee_cents ?? 0) / 100;
      const addons = formatAddons(booking?.booking_addons ?? null);
      const addonsTotal = Number(booking?.addons_total ?? 0);

      return {
        date: formatInMarinaTimezone(tx.created_at, timezone, "yyyy-MM-dd HH:mm"),
        booking_id: tx.booking_id ?? "",
        boat,
        amount,
        addons_total: addonsTotal,
        addons,
        booking_total: booking ? Number(booking.total_price) : amount,
        platform_fee: platformFee,
        payment_status: tx.status,
        stripe_payment_intent_id: tx.stripe_payment_intent_id ?? "",
        currency: tx.currency ?? DEFAULT_CURRENCY,
        marina: marinaName,
        data_source: "stripe",
      };
    });
  }

  // Fallback: estimated from paid bookings when no Stripe transactions
  const feePct = account?.platform_fee_pct ?? 0.03;
  const { data: paidBookings } = await supabase
    .from("bookings")
    .select(
      "id, total_price, addons_total, payment_status, start_at, boats(name), booking_addons(quantity, addon_catalog(name))"
    )
    .eq("marina_id", marinaId)
    .eq("payment_status", "paid")
    .order("start_at", { ascending: false });

  const { data: settings } = await supabase
    .from("marina_settings")
    .select("currency")
    .eq("marina_id", marinaId)
    .maybeSingle();

  const currency = settings?.currency ?? DEFAULT_CURRENCY;

  return (paidBookings ?? []).map((b) => {
    const amount = Number(b.total_price);
    const platformFee = Math.round(amount * feePct * 100) / 100;
    const addonsTotal = Number(b.addons_total ?? 0);
    return {
      date: formatInMarinaTimezone(b.start_at, timezone, "yyyy-MM-dd HH:mm"),
      booking_id: b.id,
      boat: normalizeRelation(b.boats as { name: string } | { name: string }[] | null)?.name ?? "",
      amount,
      addons_total: addonsTotal,
      addons: formatAddons(
        b.booking_addons as Array<{
          quantity: number;
          addon_catalog: { name: string } | { name: string }[] | null;
        }> | null
      ),
      booking_total: amount,
      platform_fee: platformFee,
      payment_status: b.payment_status,
      stripe_payment_intent_id: "",
      currency,
      marina: marinaName,
      data_source: "estimated",
    };
  });
}

export const EXPORT_COLUMNS: Record<
  "bookings" | "customers" | "revenue",
  { key: string; header: string }[]
> = {
  bookings: [
    { key: "booking_id", header: "Booking ID" },
    { key: "customer_name", header: "Customer Name" },
    { key: "customer_email", header: "Email" },
    { key: "boat", header: "Boat" },
    { key: "date", header: "Date" },
    { key: "guests", header: "Guests" },
    { key: "addons", header: "Add-ons" },
    { key: "status", header: "Status" },
    { key: "payment_status", header: "Payment Status" },
    { key: "total_amount", header: "Total Amount" },
    { key: "currency", header: "Currency" },
    { key: "marina", header: "Marina" },
  ],
  customers: [
    { key: "customer_id", header: "Customer ID" },
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    { key: "total_bookings", header: "Total Bookings" },
    { key: "total_spent", header: "Total Spent" },
    { key: "segment", header: "Segment" },
    { key: "last_booking_date", header: "Last Booking Date" },
    { key: "marina", header: "Marina" },
  ],
  revenue: [
    { key: "date", header: "Date" },
    { key: "booking_id", header: "Booking ID" },
    { key: "boat", header: "Boat" },
    { key: "amount", header: "Amount" },
    { key: "addons_total", header: "Add-ons Total" },
    { key: "addons", header: "Add-ons" },
    { key: "booking_total", header: "Booking Total" },
    { key: "platform_fee", header: "Platform Fee" },
    { key: "payment_status", header: "Payment Status" },
    { key: "stripe_payment_intent_id", header: "Stripe Payment Intent ID" },
    { key: "currency", header: "Currency" },
    { key: "marina", header: "Marina" },
    { key: "data_source", header: "Data Source" },
  ],
};
