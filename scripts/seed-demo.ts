/**
 * MarinaHub demo seed script
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env or .env.local
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import {
  BOATS,
  CUSTOMERS,
  DEMO_PASSWORD,
  DEMO_WIDGET_KEYS,
  IDS,
  MARINAS,
  type BoatSeed,
} from "./seed-data";

const root = process.cwd();
for (const file of [".env", ".env.local"]) {
  const path = resolve(root, file);
  if (existsSync(path)) {
    config({ path, override: true });
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add them to .env or .env.local (see .env.example)."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

interface Slot {
  boat_id: string;
  marina_id: string;
  customer_id: string;
  start: Date;
  end: Date;
  status: BookingStatus;
  source: string;
  guest_count: number;
}

const DEMO_USER_IDS = Object.values(IDS.users);
const DEMO_MARINA_IDS = Object.values(IDS.marinas);

function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * 60 * 60 * 1000);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function priceFor(boat: BoatSeed, hours: number): number {
  if (hours >= 8 && boat.daily_rate) return boat.daily_rate;
  return Math.round(boat.hourly_rate * hours * 100) / 100;
}

function marinaCustomers(marinaId: string): string[] {
  return CUSTOMERS.filter((c) => c.marina_id === marinaId).map((c) => c.id);
}

function tryAddSlot(
  slots: Slot[],
  boat: BoatSeed,
  start: Date,
  hours: number,
  status: BookingStatus,
  customerId: string,
  source: string
): boolean {
  const end = addHours(start, hours);
  const active = slots.filter(
    (s) =>
      s.boat_id === boat.id &&
      ["pending", "confirmed"].includes(s.status) &&
      overlaps(s.start, s.end, start, end)
  );
  if (active.length > 0) return false;

  slots.push({
    boat_id: boat.id,
    marina_id: boat.marina_id,
    customer_id: customerId,
    start,
    end,
    status,
    source,
    guest_count: Math.min(boat.capacity, Math.max(2, Math.floor(boat.capacity * 0.6))),
  });
  return true;
}

function generateBookings(now: Date): Slot[] {
  const slots: Slot[] = [];
  const sources = ["dashboard", "dashboard", "dashboard", "widget", "widget", "web"];

  for (const marina of MARINAS) {
    const boats = BOATS.filter((b) => b.marina_id === marina.id);
    const customers = marinaCustomers(marina.id);
    if (!customers.length) continue;

    let created = 0;
    const target = marina.bookingTarget;

    // Past 5 months + current month spread
    for (let monthOffset = 5; monthOffset >= 0 && created < target; monthOffset--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1, 9, 0, 0);
      const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth && created < target; day += day % 3 === 0 ? 1 : 2) {
        const boat = boats[created % boats.length];
        const customer = customers[created % customers.length];
        const hour = 8 + (created % 5) * 2;
        const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), day, hour, 0, 0);
        if (start >= now && monthOffset > 0) continue;

        const duration = boat.boat_type === "fishing" ? 6 : 4;
        const isPast = start < now;
        let status: BookingStatus = "completed";
        if (!isPast) {
          status = created % 7 === 0 ? "pending" : "confirmed";
        } else if (created % 11 === 0) {
          status = "cancelled";
        } else if (created % 17 === 0) {
          status = "no_show";
        }

        if (status === "cancelled" || status === "no_show") {
          // cancelled/no_show don't block overlap constraint when not pending/confirmed
        }

        const source = sources[created % sources.length];
        if (tryAddSlot(slots, boat, start, duration, status, customer, source)) {
          created++;
        }
      }
    }

    // Upcoming confirmed/pending for next 14 days
    for (let d = 1; d <= 14 && created < target + 5; d++) {
      const boat = boats[d % boats.length];
      const customer = customers[d % customers.length];
      const start = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0), d);
      const status: BookingStatus = d % 5 === 0 ? "pending" : "confirmed";
      if (tryAddSlot(slots, boat, start, 4, status, customer, "web")) {
        created++;
      }
    }
  }

  // Tune State Park Marina for hero metrics
  tuneStateParkMetrics(slots, now);

  return slots;
}

function tuneStateParkMetrics(slots: Slot[], now: Date) {
  const stateParkBoats = BOATS.filter((b) => b.marina_id === IDS.marinas.statePark);
  const customers = marinaCustomers(IDS.marinas.statePark);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Remove some current-month completed bookings to reshape revenue
  const spSlots = slots.filter((s) => s.marina_id === IDS.marinas.statePark);

  // Add high-value June bookings to hit ~$12,450 MTD
  let mtdRevenue = spSlots
    .filter(
      (s) =>
        s.start >= monthStart &&
        s.start <= monthEnd &&
        ["confirmed", "completed"].includes(s.status)
    )
    .reduce((sum, s) => {
      const boat = stateParkBoats.find((b) => b.id === s.boat_id)!;
      return sum + priceFor(boat, (s.end.getTime() - s.start.getTime()) / 3600000);
    }, 0);

  const targetMtd = 12450;
  let i = 0;
  while (mtdRevenue < targetMtd && i < 40) {
    const boat = stateParkBoats[i % stateParkBoats.length];
    const day = 2 + (i % 25);
    const start = new Date(now.getFullYear(), now.getMonth(), day, 9 + (i % 4) * 2, 0, 0);
    const hours = boat.hourly_rate >= 110 ? 6 : 8;
    const customer = customers[i % customers.length];
    if (
      start >= monthStart &&
      start <= monthEnd &&
      tryAddSlot(slots, boat, start, hours, "completed", customer, "dashboard")
    ) {
      mtdRevenue += priceFor(boat, hours);
    }
    i++;
  }

  // Ensure Alex has 3+ upcoming confirmed at State Park / Lake Murray
  const alexSp = CUSTOMERS.find(
    (c) => c.user_id === IDS.users.alex && c.marina_id === IDS.marinas.statePark
  )!;
  const alexLm = CUSTOMERS.find(
    (c) => c.user_id === IDS.users.alex && c.marina_id === IDS.marinas.lakeMurray
  )!;
  const lmBoats = BOATS.filter((b) => b.marina_id === IDS.marinas.lakeMurray);

  for (let d = 2; d <= 10; d += 2) {
    const start = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0), d);
    tryAddSlot(slots, stateParkBoats[0], start, 4, "confirmed", alexSp.id, "web");
  }
  for (let d = 3; d <= 9; d += 3) {
    const start = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0, 0), d);
    tryAddSlot(slots, lmBoats[0], start, 4, "confirmed", alexLm.id, "web");
  }
}

async function deleteWhere(
  table: string,
  column: string,
  values: string[]
) {
  if (values.length === 0) return;
  const { error } = await supabase.from(table).delete().in(column, values);
  if (error && !/does not exist|Could not find the table/i.test(error.message)) {
    throw new Error(`Cleanup ${table}: ${error.message}`);
  }
}

async function cleanup() {
  console.log("Cleaning existing demo data...");

  const demoSlugs = MARINAS.map((m) => m.slug);
  const demoBoatIds = BOATS.map((b) => b.id);
  const demoCustomerIds = CUSTOMERS.map((c) => c.id);

  await deleteWhere("favorites", "user_id", [...DEMO_USER_IDS]);
  await deleteWhere("notifications", "recipient_id", [...DEMO_USER_IDS]);
  await deleteWhere("notifications", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("audit_logs", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("waitlist_entries", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("maintenance_logs", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("mock_transactions", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("marina_payment_accounts", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("pricing_rules", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("marina_holidays", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("booking_status_history", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("booking_addons", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("payment_transactions", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("reviews", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("bookings", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("addon_catalog", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("availability_blocks", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("customer_segment_snapshots", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("customers", "id", demoCustomerIds);
  await deleteWhere("customers", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("widget_configs", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("onboarding_state", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("boats", "id", demoBoatIds);
  await deleteWhere("boats", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("marina_members", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("marina_settings", "marina_id", [...DEMO_MARINA_IDS]);
  await deleteWhere("marinas", "id", [...DEMO_MARINA_IDS]);
  await deleteWhere("marinas", "slug", demoSlugs);

  for (const id of DEMO_USER_IDS) {
    await supabase.from("profiles").delete().eq("id", id);
    await supabase.auth.admin.deleteUser(id);
  }
}

async function createUsers() {
  console.log("Creating demo users...");
  const users = [
    { id: IDS.users.owner, email: "owner@stateparkmarina.demo", name: "Sam Parker" },
    { id: IDS.users.manager, email: "manager@stateparkmarina.demo", name: "Morgan Lee" },
    { id: IDS.users.staff, email: "staff@stateparkmarina.demo", name: "Casey Walsh" },
    { id: IDS.users.alex, email: "alex.rivera@demo.com", name: "Alex Rivera" },
    { id: IDS.users.jamie, email: "jamie.chen@demo.com", name: "Jamie Chen" },
  ];

  for (const u of users) {
    const { error } = await supabase.auth.admin.createUser({
      id: u.id,
      email: u.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.name },
    });

    if (error && !error.message.toLowerCase().includes("already")) {
      throw new Error(`Failed to create user ${u.email}: ${error.message}`);
    }

    // Always reset password + confirm email (handles re-seed)
    const { error: updateError } = await supabase.auth.admin.updateUserById(u.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (updateError) {
      throw new Error(`Failed to update user ${u.email}: ${updateError.message}`);
    }

    await supabase.from("profiles").upsert({
      id: u.id,
      email: u.email,
      full_name: u.name,
      phone: "(803) 555-0000",
    });
  }
}

async function seedMarinasAndFleet() {
  console.log("Seeding marinas and fleet...");

  for (const m of MARINAS) {
    const { error } = await supabase.from("marinas").upsert(
      {
        id: m.id,
        slug: m.slug,
        name: m.name,
        description: m.description,
        address: m.address,
        city: m.city,
        state: m.state,
        zip: m.zip,
        timezone: m.timezone,
        logo_url: m.logo_url,
        primary_color: m.primary_color,
        contact_email: m.contact_email,
        contact_phone: m.contact_phone,
        lat: m.lat,
        lng: m.lng,
        settings: m.settings,
        is_active: true,
      },
      { onConflict: "id" }
    );
    if (error) throw new Error(`Marina ${m.slug}: ${error.message}`);
  }

  const { error: boatErr } = await supabase.from("boats").upsert(
    BOATS.map((b) => ({
      id: b.id,
      marina_id: b.marina_id,
      name: b.name,
      description: b.description,
      boat_type: b.boat_type,
      capacity: b.capacity,
      hourly_rate: b.hourly_rate,
      daily_rate: b.daily_rate,
      status: "active",
      image_urls: b.image_urls,
      amenities: b.amenities,
      min_booking_hours: b.min_booking_hours,
      sort_order: b.sort_order,
      metadata: b.metadata,
    })),
    { onConflict: "id" }
  );
  if (boatErr) throw new Error(`Boats: ${boatErr.message}`);
}

async function seedMarinaSettings() {
  console.log("Seeding marina settings...");
  for (const m of MARINAS) {
    const { error } = await supabase.from("marina_settings").upsert(
      {
        marina_id: m.id,
        timezone: m.timezone,
        currency: "INR",
        tax_rate: 0.18,
        deposit_pct: 25,
        segmentation: { vip_min_bookings: 5, vip_min_spend: 50000 },
      },
      { onConflict: "marina_id" }
    );
    if (error) throw new Error(`Marina settings ${m.slug}: ${error.message}`);
  }
}

async function seedPricingRulesAndHolidays() {
  console.log("Seeding dynamic pricing rules and holidays...");
  const year = new Date().getFullYear();

  for (const m of MARINAS) {
    const { error: holidayErr } = await supabase.from("marina_holidays").upsert(
      {
        marina_id: m.id,
        date: `${year}-07-04`,
        name: "Independence Day",
        is_recurring: true,
      },
      { onConflict: "marina_id,date" }
    );
    if (holidayErr) throw new Error(`Holiday ${m.slug}: ${holidayErr.message}`);

    const rules = [
      {
        marina_id: m.id,
        boat_id: null,
        rule_type: "weekend" as const,
        priority: 10,
        rate_multiplier: 1.25,
        is_active: true,
      },
      {
        marina_id: m.id,
        boat_id: null,
        rule_type: "peak_season" as const,
        priority: 5,
        rate_multiplier: 1.15,
        peak_start: `${year}-06-01`,
        peak_end: `${year}-08-31`,
        is_active: true,
      },
    ];

    const { error: rulesErr } = await supabase.from("pricing_rules").insert(rules);
    if (rulesErr) throw new Error(`Pricing rules ${m.slug}: ${rulesErr.message}`);
  }
}

async function seedMembershipAndOnboarding() {
  console.log("Seeding team and onboarding...");

  const { error: memberErr } = await supabase.from("marina_members").upsert(
    [
      { marina_id: IDS.marinas.statePark, user_id: IDS.users.owner, role: "owner" },
      { marina_id: IDS.marinas.harbor, user_id: IDS.users.owner, role: "owner" },
      { marina_id: IDS.marinas.bigCedar, user_id: IDS.users.owner, role: "owner" },
      { marina_id: IDS.marinas.lakeMurray, user_id: IDS.users.owner, role: "owner" },
      { marina_id: IDS.marinas.statePark, user_id: IDS.users.manager, role: "manager" },
      { marina_id: IDS.marinas.statePark, user_id: IDS.users.staff, role: "staff" },
    ],
    { onConflict: "marina_id,user_id" }
  );
  if (memberErr) throw new Error(`Marina members: ${memberErr.message}`);

  for (const marinaId of DEMO_MARINA_IDS) {
    const { error } = await supabase.from("onboarding_state").upsert(
      {
        marina_id: marinaId,
        current_step: "launch_widget",
        completed_steps: ["marina_details", "add_boats", "set_availability", "launch_widget"],
        is_complete: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "marina_id" }
    );
    if (error) throw new Error(`Onboarding ${marinaId}: ${error.message}`);
  }
}

async function seedWidgetConfigs() {
  console.log("Seeding widget configs...");

  for (const marinaId of DEMO_MARINA_IDS) {
    const marina = MARINAS.find((m) => m.id === marinaId)!;
    const apiKey = DEMO_WIDGET_KEYS[marinaId];
    const hash = await bcrypt.hash(apiKey, 10);

    const { error } = await supabase.from("widget_configs").upsert(
      {
        marina_id: marinaId,
        api_key_hash: hash,
        is_enabled: true,
        allowed_origins: ["http://localhost:3000", "https://*.marinahub.demo"],
        theme: {
          primary_color: marina.primary_color,
          logo_url: marina.logo_url,
          font_family: "Inter",
          button_style: "rounded",
          accent_color: marina.primary_color,
          background: "#ffffff",
          border_radius: "12px",
        },
      },
      { onConflict: "marina_id" }
    );
    if (error) throw new Error(`Widget config ${marinaId}: ${error.message}`);
  }
}

async function seedCustomers() {
  console.log("Seeding customers...");
  const { error } = await supabase.from("customers").upsert(
    CUSTOMERS.map((c) => ({
      id: c.id,
      marina_id: c.marina_id,
      email: c.email,
      full_name: c.full_name,
      phone: c.phone,
      notes: c.notes,
      user_id: c.user_id,
    })),
    { onConflict: "id" }
  );
  if (error) throw new Error(`Customers: ${error.message}`);
}

async function seedBookings(now: Date) {
  console.log("Generating bookings...");
  const slots = generateBookings(now);
  console.log(`  ${slots.length} bookings generated`);

  const rows = slots.map((s, idx) => {
    const boat = BOATS.find((b) => b.id === s.boat_id)!;
    const hours = (s.end.getTime() - s.start.getTime()) / 3600000;
    const total = priceFor(boat, hours);
    const isRevenueStatus = ["confirmed", "checked_in", "checked_out", "completed"].includes(
      s.status
    );
    return {
      id: `e0000000-0000-4000-8000-${String(idx + 1).padStart(12, "0")}`,
      marina_id: s.marina_id,
      boat_id: s.boat_id,
      customer_id: s.customer_id,
      status: s.status,
      start_at: s.start.toISOString(),
      end_at: s.end.toISOString(),
      total_price: total,
      deposit_amount: Math.round(total * 0.2 * 100) / 100,
      guest_count: s.guest_count,
      source: s.source,
      payment_status: isRevenueStatus ? "paid" : "unpaid",
      paid_at: isRevenueStatus ? s.start.toISOString() : null,
      created_by: s.source === "dashboard" ? IDS.users.staff : null,
      ticket_token:
        s.status === "confirmed" || s.status === "completed"
          ? `ticket${idx.toString(16).padStart(24, "0")}`
          : null,
      checked_in_at:
        s.status === "completed" && idx % 3 === 0 ? s.start.toISOString() : null,
      checked_out_at:
        s.status === "completed" && idx % 3 === 0 ? s.end.toISOString() : null,
      cancelled_at: s.status === "cancelled" ? addHours(s.start, -2).toISOString() : null,
      cancellation_reason: s.status === "cancelled" ? "Customer requested cancellation" : null,
    };
  });

  // Insert in batches
  for (let i = 0; i < rows.length; i += 25) {
    const batch = rows.slice(i, i + 25);
    const { error } = await supabase.from("bookings").insert(batch);
    if (error) throw new Error(`Bookings batch ${i}: ${error.message}`);
  }

  // Refresh customer stats (ignore if RPC unavailable during partial migrations)
  for (const c of CUSTOMERS) {
    const { error } = await supabase.rpc("refresh_customer_stats", {
      p_customer_id: c.id,
    });
    if (error && !/Forbidden|does not exist/i.test(error.message)) {
      throw new Error(`Customer stats ${c.id}: ${error.message}`);
    }
  }
}

async function seedBlocks(now: Date) {
  console.log("Seeding availability blocks...");

  await supabase.from("availability_blocks").insert([
    {
      marina_id: IDS.marinas.statePark,
      boat_id: "c0000000-0000-4000-8000-000000000103",
      reason: "maintenance",
      start_at: addDays(now, 5).toISOString(),
      end_at: addDays(addDays(now, 5), 0).toISOString().replace(/T.*/, "T17:00:00.000Z"),
      notes: "Engine service",
      created_by: IDS.users.owner,
    },
    {
      marina_id: IDS.marinas.statePark,
      boat_id: "c0000000-0000-4000-8000-000000000104",
      reason: "maintenance",
      start_at: addDays(now, 12).toISOString(),
      end_at: addDays(now, 13).toISOString(),
      notes: "Annual inspection",
      created_by: IDS.users.owner,
    },
    {
      marina_id: IDS.marinas.statePark,
      boat_id: null,
      reason: "manual",
      start_at: new Date(now.getFullYear(), 6, 4, 0, 0, 0).toISOString(),
      end_at: new Date(now.getFullYear(), 6, 4, 23, 59, 59).toISOString(),
      notes: "Independence Day — marina closed",
      created_by: IDS.users.owner,
    },
    {
      marina_id: IDS.marinas.lakeMurray,
      boat_id: "c0000000-0000-4000-8000-000000000402",
      reason: "weather",
      start_at: addDays(now, 8).toISOString(),
      end_at: addDays(now, 8).toISOString().replace(/T.*/, "T14:00:00.000Z"),
      notes: "Forecasted storms",
      created_by: IDS.users.manager,
    },
  ]);
}

async function seedAddons() {
  console.log("Seeding add-on catalog...");
  const defaults = [
    { slug: "tube_rental", name: "Tube Rental", price: 45, sort_order: 1 },
    { slug: "captain_service", name: "Captain Service", price: 150, sort_order: 2 },
    { slug: "fuel_package", name: "Fuel Package", price: 75, sort_order: 3 },
    { slug: "cooler", name: "Cooler", price: 25, sort_order: 4 },
  ];

  for (const marina of MARINAS) {
    for (const item of defaults) {
      const { error } = await supabase.from("addon_catalog").upsert(
        { marina_id: marina.id, ...item, is_active: true },
        { onConflict: "marina_id,slug" }
      );
      if (error) throw new Error(`Addons ${marina.slug}/${item.slug}: ${error.message}`);
    }
  }
}

async function seedFavorites() {
  console.log("Seeding favorites...");
  const favBoats = [
    "c0000000-0000-4000-8000-000000000101",
    "c0000000-0000-4000-8000-000000000103",
    "c0000000-0000-4000-8000-000000000401",
    "c0000000-0000-4000-8000-000000000202",
    "c0000000-0000-4000-8000-000000000301",
    "c0000000-0000-4000-8000-000000000105",
  ];

  await supabase.from("favorites").insert(
    favBoats.map((boatId, i) => {
      const boat = BOATS.find((b) => b.id === boatId)!;
      return {
        id: `f0000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
        user_id: IDS.users.alex,
        boat_id: boatId,
        marina_id: boat.marina_id,
      };
    })
  );
}

async function seedExtraNotifications() {
  console.log("Seeding extra notifications...");
  const items = [
    {
      marina_id: IDS.marinas.statePark,
      recipient_id: IDS.users.owner,
      type: "booking_reminder_ui_only" as const,
      title: "3 trips scheduled today",
      body: "You have bookings across 3 boats today.",
      read_at: null,
    },
    {
      marina_id: IDS.marinas.statePark,
      recipient_id: IDS.users.owner,
      type: "new_booking" as const,
      title: "Weekend bookings trending up",
      body: "12 new bookings this week — 20% above average.",
      read_at: null,
    },
    {
      marina_id: IDS.marinas.statePark,
      recipient_id: IDS.users.manager,
      type: "booking_confirmed" as const,
      title: "Pending booking confirmed",
      body: "Bennington 24 SX — Saturday confirmed by staff.",
      read_at: null,
    },
    {
      marina_id: IDS.marinas.statePark,
      recipient_id: IDS.users.staff,
      type: "new_booking" as const,
      title: "New pending booking",
      body: "Tracker Pro Guide V175 needs confirmation.",
      read_at: null,
    },
    {
      marina_id: IDS.marinas.statePark,
      recipient_id: IDS.users.alex,
      type: "booking_confirmed" as const,
      title: "Your trip is confirmed",
      body: "Sun Tracker Party Barge 22 DLX — upcoming weekend.",
      read_at: null,
    },
  ];

  await supabase.from("notifications").insert(items);
}

async function printSummary() {
  console.log("\n✅ Demo seed complete!\n");
  console.log("Demo credentials (password for all):", DEMO_PASSWORD);
  console.log("  Owner:   owner@stateparkmarina.demo");
  console.log("  Manager: manager@stateparkmarina.demo");
  console.log("  Staff:   staff@stateparkmarina.demo");
  console.log("  Consumer: alex.rivera@demo.com");
  console.log("  Consumer: jamie.chen@demo.com");
  console.log("\nWidget API keys:");
  for (const [marinaId, key] of Object.entries(DEMO_WIDGET_KEYS)) {
    const marina = MARINAS.find((m) => m.id === marinaId);
    console.log(`  ${marina?.name}: ${key}`);
  }
  console.log("\nAdd to .env.local:");
  console.log(`DEMO_WIDGET_API_KEY_STATE_PARK=${DEMO_WIDGET_KEYS[IDS.marinas.statePark]}`);
}

async function seedReviews() {
  console.log("Seeding sample reviews...");

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, boat_id, marina_id, customer_id, customers(user_id)")
    .eq("status", "completed")
    .limit(12);

  const sampleComments = [
    "Easy online booking and the boat was spotless. Perfect family day on the lake!",
    "Staff was friendly and check-in took two minutes. Will book again.",
    "Great fishing boat with working fish finder. Caught plenty of bass!",
    "Wake boat was a blast. Booking process was seamless.",
    "Beautiful marina and well-maintained fleet. Highly recommend.",
    "Smooth checkout and the pontoon handled great in moderate chop.",
  ];

  let i = 0;
  for (const booking of bookings ?? []) {
    const customer = booking.customers as unknown as { user_id: string | null } | null;
    if (!customer?.user_id) continue;

    const { error } = await supabase.from("reviews").upsert(
      {
        booking_id: booking.id,
        user_id: customer.user_id,
        boat_id: booking.boat_id,
        marina_id: booking.marina_id,
        rating: 4 + (i % 2),
        comment: sampleComments[i % sampleComments.length],
      },
      { onConflict: "booking_id" }
    );

    if (error && !error.message.includes("duplicate")) {
      console.warn(`Review seed skip: ${error.message}`);
    }
    i++;
  }
}

async function main() {
  const now = new Date();
  await cleanup();
  await createUsers();
  await seedMarinasAndFleet();
  await seedMarinaSettings();
  await seedPricingRulesAndHolidays();
  await seedMembershipAndOnboarding();
  await seedWidgetConfigs();
  await seedCustomers();
  await seedAddons();
  await seedBookings(now);
  await seedReviews();
  await seedBlocks(now);
  await seedFavorites();
  await seedExtraNotifications();
  await printSummary();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
