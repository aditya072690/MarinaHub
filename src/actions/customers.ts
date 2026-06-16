"use server";

import { assertActiveMarina } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { BookingWithRelations, Customer, CustomerSegment } from "@/types/database";

const CUSTOMER_LIST_SELECT =
  "id, marina_id, full_name, email, phone, last_booking_at, total_bookings, total_spent, metadata, created_at";

const CUSTOMER_BOOKING_SELECT = `
  id, customer_id, boat_id, start_at, end_at, guest_count, status, payment_status,
  total_price, created_at,
  boats(id, name, boat_type)
`;

export interface PaginatedCustomers {
  items: Customer[];
  nextCursor: string | null;
}

export interface CustomerDetail extends Customer {
  bookings: BookingWithRelations[];
}

function encodeCursor(createdAt: string, id: string) {
  return `${createdAt}|${id}`;
}

function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  const [createdAt, id] = cursor.split("|");
  if (!createdAt || !id) return null;
  return { createdAt, id };
}

export async function getCustomers(
  marinaId: string,
  options?: {
    limit?: number;
    cursor?: string;
    segment?: CustomerSegment;
    search?: string;
  }
): Promise<PaginatedCustomers> {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const limit = options?.limit ?? 25;
  const supabase = await createClient();

  if (options?.segment) {
    const { data, error } = await supabase
      .from("customer_segment_snapshots")
      .select(`customer_id, segment, customers!inner(${CUSTOMER_LIST_SELECT})`)
      .eq("marina_id", marinaId)
      .eq("segment", options.segment)
      .order("total_spent", { ascending: false })
      .limit(limit + 1);

    if (error) throw new Error(error.message);

    const rows = (data ?? []).map((row) => row.customers as unknown as Customer);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor(last.created_at, last.id) : null;

    return { items, nextCursor };
  }

  let query = supabase
    .from("customers")
    .select(CUSTOMER_LIST_SELECT)
    .eq("marina_id", marinaId)
    .order("last_booking_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (options?.search?.trim()) {
    const q = `%${options.search.trim()}%`;
    query = query.or(`full_name.ilike.${q},email.ilike.${q}`);
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

  const rows = (data ?? []) as Customer[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor(last.created_at, last.id) : null;

  return { items, nextCursor };
}

export async function getSegmentSnapshots(marinaId: string) {
  const session = await requireSession();
  assertActiveMarina(session, marinaId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_segment_snapshots")
    .select("customer_id, segment")
    .eq("marina_id", marinaId);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCustomerDetail(
  customerId: string,
  bookingLimit = 20
): Promise<CustomerDetail | null> {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: customer, error } = await supabase
    .from("customers")
    .select(CUSTOMER_LIST_SELECT)
    .eq("id", customerId)
    .single();

  if (error || !customer) return null;
  assertActiveMarina(session, customer.marina_id);

  const { data: bookings } = await supabase
    .from("bookings")
    .select(CUSTOMER_BOOKING_SELECT)
    .eq("customer_id", customerId)
    .order("start_at", { ascending: false })
    .limit(bookingLimit);

  return {
    ...(customer as Customer),
    bookings: (bookings ?? []) as unknown as BookingWithRelations[],
  };
}
