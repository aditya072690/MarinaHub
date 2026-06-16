"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { assertPermission } from "@/lib/auth/rbac";
import { requireSession } from "@/lib/auth/session";
import { statsTag } from "@/lib/cache/tags";
import { validateTransition } from "@/lib/bookings/state-machine";
import { calculateAddonsTotal, normalizeAddonIds, validateAddonSelection } from "@/lib/pricing/addons";
import { parsePriceQuote } from "@/lib/pricing/quote";
import { getTargetStatus } from "@/lib/bookings/state-machine";
import { createClient } from "@/lib/supabase/server";
import { bookingSchema } from "@/lib/validations/booking.schema";
import type { ActionResult } from "@/types/api";
import type {
  Booking,
  BookingStatus,
  BookingStatusHistory,
  BookingWithRelations,
} from "@/types/database";
import { differenceInHours } from "date-fns";
import { revalidatePath, revalidateTag } from "next/cache";

const BOOKING_LIST_SELECT = `
  id, customer_id, boat_id, start_at, end_at, guest_count, status, payment_status,
  total_price, created_at,
  boats(id, name, boat_type),
  customers(id, full_name, email)
`;

const BOOKING_DETAIL_SELECT = `
  id, marina_id, customer_id, boat_id, start_at, end_at, guest_count, status,
  payment_status, total_price, base_price, addons_total, tax_amount,
  notes, ticket_token, stripe_session_id, checked_in_at, checked_out_at, created_at,
  boats(id, name, boat_type, capacity, hourly_rate, image_urls),
  customers(id, full_name, email, phone)
`;

export interface PaginatedBookings {
  items: BookingWithRelations[];
  nextCursor: string | null;
}

export interface StaffDashboardSummary {
  todaysCount: number;
  pendingCount: number;
  upcoming: { id: string; start_at: string; status: BookingStatus }[];
}

function encodeCursor(createdAt: string, id: string) {
  return `${createdAt}|${id}`;
}

function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  const [createdAt, id] = cursor.split("|");
  if (!createdAt || !id) return null;
  return { createdAt, id };
}

function revalidateBookingPaths(marinaId: string, bookingId?: string) {
  revalidateTag(statsTag(marinaId));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/analytics");
  if (bookingId) {
    revalidatePath(`/dashboard/bookings/${bookingId}`);
  }
}

export async function getBookings(
  marinaId: string,
  options?: {
    limit?: number;
    cursor?: string;
    status?: BookingStatus;
    search?: string;
    startAfter?: string;
    startBefore?: string;
  }
): Promise<PaginatedBookings> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const limit = options?.limit ?? 20;
  const supabase = await createClient();

  let query = supabase
    .from("bookings")
    .select(BOOKING_LIST_SELECT)
    .eq("marina_id", marinaId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.startAfter) {
    query = query.gte("start_at", options.startAfter);
  }
  if (options?.startBefore) {
    query = query.lt("start_at", options.startBefore);
  }
  if (options?.search?.trim()) {
    const q = `%${options.search.trim()}%`;
    query = query.or(
      `customers.full_name.ilike.${q},customers.email.ilike.${q},boats.name.ilike.${q}`
    );
  }
  if (options?.cursor) {
    const decoded = decodeCursor(options.cursor);
    if (decoded) {
      query = query.or(
        `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`
      );
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as BookingWithRelations[];

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor(last.created_at, last.id) : null;

  return { items, nextCursor };
}

/** @deprecated Use getBookings — kept for calendar until range helper used */
export async function getAllBookings(marinaId: string): Promise<BookingWithRelations[]> {
  const { items } = await getBookings(marinaId, { limit: 500 });
  return items;
}

export async function getCalendarBookings(
  marinaId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<BookingWithRelations[]> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_LIST_SELECT)
    .eq("marina_id", marinaId)
    .gte("start_at", rangeStart)
    .lt("start_at", rangeEnd)
    .order("start_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BookingWithRelations[];
}

export async function getStaffDashboardSummary(
  marinaId: string,
  timezone?: string
): Promise<StaffDashboardSummary> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_staff_dashboard_summary", {
    p_marina_id: marinaId,
    p_timezone: timezone ?? "America/New_York",
  });

  if (error) throw new Error(error.message);

  const raw = data as {
    todays_count: number;
    pending_count: number;
    upcoming: { id: string; start_at: string; status: BookingStatus }[];
  };

  return {
    todaysCount: raw.todays_count ?? 0,
    pendingCount: raw.pending_count ?? 0,
    upcoming: raw.upcoming ?? [],
  };
}

export async function getBookingDetail(
  bookingId: string
): Promise<BookingWithRelations | null> {
  const session = await requireSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_DETAIL_SELECT)
    .eq("id", bookingId)
    .single();

  if (error || !data) return null;
  assertActiveMarina(session, data.marina_id);
  return data as unknown as BookingWithRelations;
}

export interface BookingDetailBundle {
  booking: BookingWithRelations;
  history: BookingStatusHistory[];
  addons: Awaited<ReturnType<typeof import("@/actions/addons").getBookingAddons>>;
}

export async function getBookingDetailBundle(
  bookingId: string
): Promise<BookingDetailBundle | null> {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(BOOKING_DETAIL_SELECT)
    .eq("id", bookingId)
    .single();

  if (error || !booking) return null;
  assertActiveMarina(session, booking.marina_id);

  const [historyRes, addonsRes] = await Promise.all([
    supabase
      .from("booking_status_history")
      .select("id, booking_id, marina_id, from_status, to_status, changed_by, actor_role, source, notes, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true }),
    supabase
      .from("booking_addons")
      .select("id, booking_id, addon_id, quantity, unit_price, total_price, addon_catalog(id, name, price)")
      .eq("booking_id", bookingId),
  ]);

  if (historyRes.error) throw new Error(historyRes.error.message);
  if (addonsRes.error) throw new Error(addonsRes.error.message);

  return {
    booking: booking as unknown as BookingWithRelations,
    history: (historyRes.data ?? []) as unknown as BookingStatusHistory[],
    addons: (addonsRes.data ?? []) as unknown as BookingDetailBundle["addons"],
  };
}

export async function getBookingHistory(
  bookingId: string
): Promise<BookingStatusHistory[]> {
  const bundle = await getBookingDetailBundle(bookingId);
  return bundle?.history ?? [];
}

export async function createBooking(
  marinaId: string,
  values: unknown
): Promise<ActionResult<Booking>> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);
  assertPermission(session.activeRole, "bookings:create");

  const parsed = bookingSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  let customerId = parsed.data.customer_id;

  if (!customerId && parsed.data.customer) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("marina_id", marinaId)
      .eq("email", parsed.data.customer.email)
      .maybeSingle();

    if (existing) {
      customerId = existing.id;
      const { error: contactError } = await supabase.rpc("update_customer_contact", {
        p_customer_id: existing.id,
        p_full_name: parsed.data.customer.full_name,
        p_phone: parsed.data.customer.phone,
      });
      if (contactError) return { success: false, error: contactError.message };
    } else {
      const { data: newCustomer, error: custError } = await supabase
        .from("customers")
        .insert({
          marina_id: marinaId,
          ...parsed.data.customer,
        })
        .select()
        .single();

      if (custError) return { success: false, error: custError.message };
      customerId = newCustomer.id;
    }
  }

  if (!customerId) {
    return { success: false, error: "Customer is required" };
  }

  const { data: boat, error: boatError } = await supabase
    .from("boats")
    .select("id, capacity, min_booking_hours, marina_id")
    .eq("id", parsed.data.boat_id)
    .eq("marina_id", marinaId)
    .single();

  if (boatError || !boat) {
    return { success: false, error: "Boat not found" };
  }

  if (parsed.data.guest_count > boat.capacity) {
    return {
      success: false,
      error: `Maximum capacity is ${boat.capacity} guests`,
    };
  }

  const startAt = new Date(parsed.data.start_at);
  const endAt = new Date(parsed.data.end_at);

  if (differenceInHours(endAt, startAt) < boat.min_booking_hours) {
    return {
      success: false,
      error: `Minimum booking duration is ${boat.min_booking_hours} hours`,
    };
  }

  const { data: available } = await supabase.rpc("is_boat_available", {
    p_boat_id: parsed.data.boat_id,
    p_start: parsed.data.start_at,
    p_end: parsed.data.end_at,
  });

  if (!available) {
    return { success: false, error: "This time slot is no longer available" };
  }

  const { data: priceRaw, error: priceError } = await supabase.rpc("resolve_booking_price", {
    p_boat_id: parsed.data.boat_id,
    p_start: parsed.data.start_at,
    p_end: parsed.data.end_at,
  });

  if (priceError || !priceRaw) {
    return { success: false, error: priceError?.message ?? "Pricing error" };
  }

  const quote = parsePriceQuote(priceRaw);

  let addonsTotal = 0;
  const addonIds = normalizeAddonIds(parsed.data.addon_ids ?? []);
  let addonCatalog: { id: string; price: number }[] = [];
  if (addonIds.length > 0) {
    const { data: catalog } = await supabase
      .from("addon_catalog")
      .select("id, price")
      .eq("marina_id", marinaId)
      .eq("is_active", true)
      .in("id", addonIds);

    addonCatalog = catalog ?? [];
    const addonValidation = validateAddonSelection(addonIds, addonCatalog);
    if (!addonValidation.valid) {
      return { success: false, error: addonValidation.error ?? "Invalid add-ons" };
    }

    addonsTotal = calculateAddonsTotal(addonIds, addonCatalog);
  }

  const subtotal = quote.base_price + addonsTotal;
  const taxRate = Number(quote.breakdown.tax_rate ?? 0);
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const totalPrice = Math.round((subtotal + taxAmount) * 100) / 100;
  const depositAmount =
    Math.round(totalPrice * (Number(quote.breakdown.deposit_pct ?? 25) / 100) * 100) / 100;

  const status = session.activeRole === "staff" ? "pending" : "confirmed";
  const paymentStatus = status === "confirmed" ? "paid" : "unpaid";

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      marina_id: marinaId,
      boat_id: parsed.data.boat_id,
      customer_id: customerId,
      start_at: parsed.data.start_at,
      end_at: parsed.data.end_at,
      guest_count: parsed.data.guest_count,
      notes: parsed.data.notes,
      base_price: quote.base_price,
      addons_total: addonsTotal,
      tax_amount: taxAmount,
      total_price: totalPrice,
      deposit_amount: depositAmount,
      pricing_rule_id: quote.pricing_rule_id,
      pricing_breakdown: {
        ...quote.breakdown,
        rule_label: quote.rule_label,
        rule_type: quote.rule_type,
        addons_total: addonsTotal,
      },
      status,
      payment_status: paymentStatus,
      paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
      source: "dashboard",
      created_by: session.userId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23P01") {
      return { success: false, error: "This time slot conflicts with an existing booking" };
    }
    return { success: false, error: error.message };
  }

  if (addonIds.length > 0 && data) {
    const rows = addonIds.map((addonId) => {
      const item = addonCatalog.find((c) => c.id === addonId);
      const price = Number(item?.price ?? 0);
      return {
        addon_id: addonId,
        quantity: 1,
        unit_price: price,
        total_price: price,
      };
    }).filter((r) => r.unit_price > 0);

    if (rows.length > 0) {
      const { error: addonError } = await supabase.rpc("insert_booking_addons", {
        p_booking_id: data.id,
        p_rows: rows,
      });
      if (addonError) {
        return { success: false, error: addonError.message };
      }
    }
  }

  revalidateBookingPaths(marinaId, data.id);
  return { success: true, data };
}

export async function updateBookingStatus(
  bookingId: string,
  status: Booking["status"],
  cancellationReason?: string
): Promise<ActionResult<Booking>> {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("bookings")
    .select("id, marina_id, status")
    .eq("id", bookingId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Booking not found" };
  }

  try {
    assertActiveMarina(session, existing.marina_id);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  const validation = validateTransition(
    existing.status,
    status,
    session.activeRole
  );
  if (!validation.valid) {
    return { success: false, error: validation.error ?? "Invalid transition" };
  }

  const updates: Partial<Booking> = { status };

  if (status === "cancelled") {
    updates.cancelled_at = new Date().toISOString();
    updates.cancelled_by = session.userId;
    updates.cancellation_reason = cancellationReason ?? null;
  }

  const { data, error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", bookingId)
    .eq("marina_id", existing.marina_id)
    .eq("status", existing.status)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  if (!data) {
    return {
      success: false,
      error: "Booking was updated by someone else. Please refresh and try again.",
    };
  }
  revalidateBookingPaths(existing.marina_id, bookingId);
  return { success: true, data };
}

export async function checkInBooking(
  bookingId: string
): Promise<ActionResult<Booking>> {
  const session = await requireSession();
  assertPermission(session.activeRole, "bookings:checkin");

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("bookings")
    .select("id, marina_id, status")
    .eq("id", bookingId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Booking not found" };
  }

  assertActiveMarina(session, existing.marina_id);

  const targetStatus = getTargetStatus("check_in", existing.status);
  if (!targetStatus) {
    return { success: false, error: "Only confirmed bookings can be checked in" };
  }

  const validation = validateTransition(existing.status, targetStatus, session.activeRole);
  if (!validation.valid) {
    return { success: false, error: validation.error ?? "Invalid transition" };
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: targetStatus,
      checked_in_at: new Date().toISOString(),
      checked_in_by: session.userId,
    })
    .eq("id", bookingId)
    .eq("marina_id", existing.marina_id)
    .eq("status", existing.status)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  if (!data) {
    return {
      success: false,
      error: "Booking was updated by someone else. Please refresh and try again.",
    };
  }
  revalidateBookingPaths(existing.marina_id, bookingId);
  return { success: true, data };
}

export async function checkOutBooking(
  bookingId: string
): Promise<ActionResult<Booking>> {
  const session = await requireSession();
  assertPermission(session.activeRole, "bookings:checkin");

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("bookings")
    .select("id, marina_id, status")
    .eq("id", bookingId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Booking not found" };
  }

  assertActiveMarina(session, existing.marina_id);

  const targetStatus = getTargetStatus("check_out", existing.status);
  if (!targetStatus) {
    return { success: false, error: "Guest must be checked in first" };
  }

  const validation = validateTransition(existing.status, targetStatus, session.activeRole);
  if (!validation.valid) {
    return { success: false, error: validation.error ?? "Invalid transition" };
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: targetStatus,
      checked_out_at: new Date().toISOString(),
      checked_out_by: session.userId,
    })
    .eq("id", bookingId)
    .eq("marina_id", existing.marina_id)
    .eq("status", existing.status)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  if (!data) {
    return {
      success: false,
      error: "Booking was updated by someone else. Please refresh and try again.",
    };
  }
  revalidateBookingPaths(existing.marina_id, bookingId);
  return { success: true, data };
}
