import { calculateAddonsTotal, normalizeAddonIds, validateAddonSelection } from "@/lib/pricing/addons";
import { parseAlternativeBoats, parsePriceQuote } from "@/lib/pricing/quote";
import { isStripeConfigured } from "@/lib/stripe/config";
import { createCheckoutToken } from "@/lib/stripe/checkout-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicBookingSchema } from "@/lib/validations/booking.schema";
import { differenceInHours } from "date-fns";
import { jsPDF } from "jspdf";

export interface PublicBookingConfirmation {
  id: string;
  start_at: string;
  end_at: string;
  total_price: number;
  base_price: number;
  addons_total: number;
  tax_amount: number;
  deposit_amount: number;
  status: string;
  payment_status: string;
  boat_id: string;
  ticket_token: string | null;
  rule_label?: string;
}

export async function createPublicBooking(
  marinaId: string,
  body: unknown,
  source: "consumer" | "widget",
  userId?: string | null
) {
  const parsed = publicBookingSchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input", status: 400 };
  }

  if (parsed.data.waiver_accepted === false) {
    return { error: "You must accept the rental waiver to continue", status: 400 };
  }

  const startAt = new Date(parsed.data.start_at);
  const endAt = new Date(parsed.data.end_at);

  if (startAt <= new Date()) {
    return { error: "Booking must be in the future", status: 400 };
  }

  const supabase = createAdminClient();

  const { data: boat, error: boatError } = await supabase
    .from("boats")
    .select("id, marina_id, status, name, description, hourly_rate, sort_order, capacity, min_booking_hours, created_at")
    .eq("id", parsed.data.boat_id)
    .eq("marina_id", marinaId)
    .eq("status", "active")
    .single();

  if (boatError || !boat) {
    return { error: "Boat not found", status: 404 };
  }

  if (parsed.data.guest_count > boat.capacity) {
    return {
      error: `Maximum capacity is ${boat.capacity} guests`,
      status: 400,
    };
  }

  const durationHours = differenceInHours(endAt, startAt);
  if (durationHours < boat.min_booking_hours) {
    return {
      error: `Minimum booking duration is ${boat.min_booking_hours} hours`,
      status: 400,
    };
  }

  const { data: available } = await supabase.rpc("is_boat_available", {
    p_boat_id: parsed.data.boat_id,
    p_start: parsed.data.start_at,
    p_end: parsed.data.end_at,
  });

  if (!available) {
    const { data: alternativesRaw } = await supabase.rpc("suggest_alternative_boats", {
      p_marina_id: marinaId,
      p_boat_id: parsed.data.boat_id,
      p_start: parsed.data.start_at,
      p_end: parsed.data.end_at,
      p_guest_count: parsed.data.guest_count,
      p_limit: 5,
    });

    return {
      error: "This time slot is no longer available",
      status: 409,
      alternatives: parseAlternativeBoats(alternativesRaw),
    };
  }

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id, user_id")
    .eq("marina_id", marinaId)
    .eq("email", parsed.data.customer.email)
    .maybeSingle();

  let customerId = existingCustomer?.id;

  if (customerId) {
    const updatePayload: {
      full_name: string;
      phone?: string;
      user_id?: string;
    } = {
      full_name: parsed.data.customer.full_name,
      phone: parsed.data.customer.phone,
    };

    if (userId && !existingCustomer?.user_id) {
      updatePayload.user_id = userId;
    }

    await supabase.from("customers").update(updatePayload).eq("id", customerId);
  } else {
    const { data: newCustomer, error: custError } = await supabase
      .from("customers")
      .insert({
        marina_id: marinaId,
        full_name: parsed.data.customer.full_name,
        email: parsed.data.customer.email,
        phone: parsed.data.customer.phone,
        user_id: userId ?? null,
      })
      .select("id")
      .single();

    if (custError) return { error: custError.message, status: 500 };
    customerId = newCustomer.id;
  }

  const { data: priceRaw, error: priceError } = await supabase.rpc("resolve_booking_price", {
    p_boat_id: parsed.data.boat_id,
    p_start: parsed.data.start_at,
    p_end: parsed.data.end_at,
  });

  if (priceError || !priceRaw) {
    return { error: priceError?.message ?? "Pricing error", status: 500 };
  }

  const quote = parsePriceQuote(priceRaw);

  const addonIds = normalizeAddonIds(parsed.data.addon_ids ?? []);
  let catalog: { id: string; price: number; name: string }[] = [];

  if (addonIds.length > 0) {
    const { data } = await supabase
      .from("addon_catalog")
      .select("id, price, name")
      .eq("marina_id", marinaId)
      .eq("is_active", true)
      .in("id", addonIds);
    catalog = data ?? [];

    const addonValidation = validateAddonSelection(addonIds, catalog);
    if (!addonValidation.valid) {
      return { error: addonValidation.error ?? "Invalid add-ons", status: 400 };
    }
  }

  const addonsTotal = calculateAddonsTotal(addonIds, catalog);
  const subtotal = quote.base_price + addonsTotal;
  const taxAmount = Math.round(subtotal * Number(quote.breakdown.tax_rate ?? 0) * 100) / 100;
  const totalPrice = Math.round((subtotal + taxAmount) * 100) / 100;
  const depositAmount = Math.round(totalPrice * (Number(quote.breakdown.deposit_pct ?? 25) / 100) * 100) / 100;

  const stripeEnabled = isStripeConfigured();

  let waiverUrl = null;
  if (parsed.data.waiver_signature) {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Marina Rental Waiver Agreement", 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Customer: ${parsed.data.customer.full_name}`, 20, 40);
      doc.text(`Email: ${parsed.data.customer.email}`, 20, 50);
      doc.text(`Boat: ${boat.name}`, 20, 60);
      doc.text(`Start: ${startAt.toLocaleString()}`, 20, 70);
      doc.text(`End: ${endAt.toLocaleString()}`, 20, 80);
      
      doc.setFontSize(10);
      const text = "I agree to the rental waiver and understand the terms of boat rental, including safety requirements and liability policies. I assume all risks associated with the rental and operation of the boat.";
      const splitText = doc.splitTextToSize(text, 170);
      doc.text(splitText, 20, 100);
      
      doc.setFontSize(12);
      doc.text("Signature:", 20, 130);
      
      const sigData = parsed.data.waiver_signature;
      if (sigData.startsWith("data:image")) {
        doc.addImage(sigData, "PNG", 20, 135, 80, 30);
      }
      
      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      const fileName = `${marinaId}/${Date.now()}-${parsed.data.customer.full_name.replace(/\s+/g, "_")}.pdf`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("waivers")
        .upload(fileName, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true
        });
        
      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage.from("waivers").getPublicUrl(uploadData.path);
        waiverUrl = publicUrlData.publicUrl;
      }
    } catch (err) {
      console.error("Failed to generate/upload waiver PDF:", err);
      // We continue with booking even if PDF generation fails to not block checkout
    }
  }

  const { data: booking, error: bookingError } = await supabase
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
      status: stripeEnabled ? "pending" : "confirmed",
      payment_status: stripeEnabled ? "unpaid" : "paid",
      paid_at: stripeEnabled ? null : new Date().toISOString(),
      source,
      waiver_accepted_at: parsed.data.waiver_accepted ? new Date().toISOString() : null,
      waiver_accepted_by: parsed.data.waiver_accepted && userId ? userId : null,
      waiver_url: waiverUrl,
    })
    .select("id, start_at, end_at, total_price, base_price, addons_total, tax_amount, deposit_amount, status, payment_status, boat_id, ticket_token")
    .single();

  if (bookingError) {
    if (bookingError.code === "23P01") {
      return { error: "Time slot conflict — please choose another time", status: 409 };
    }
    return { error: bookingError.message, status: 500 };
  }

  if (catalog.length > 0 && booking) {
    await supabase.from("booking_addons").insert(
      catalog.map((item) => ({
        booking_id: booking.id,
        marina_id: marinaId,
        addon_id: item.id,
        quantity: 1,
        unit_price: Number(item.price),
        total_price: Number(item.price),
      }))
    );
  }

  return {
    booking: {
      ...booking,
      rule_label: quote.rule_label,
    } as PublicBookingConfirmation,
    requiresPayment: stripeEnabled,
    checkoutToken: stripeEnabled && booking ? createCheckoutToken(booking.id) : undefined,
    status: 201 as const,
  };
}
