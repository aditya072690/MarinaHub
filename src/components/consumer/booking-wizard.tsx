"use client";

import { AddonSelector } from "@/components/consumer/addon-selector";
import { AlternativeBoatsPanel } from "@/components/consumer/alternative-boats-panel";
import { PriceBreakdown } from "@/components/consumer/price-breakdown";
import { WaitlistForm } from "@/components/consumer/waitlist-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAvailability } from "@/hooks/use-availability";
import { parsePriceQuote } from "@/lib/pricing/quote";
import { DEFAULT_TIMEZONE, formatMarinaLocal } from "@/lib/timezone";
import {
  bookingCheckoutFormSchema,
  type BookingCheckoutFormValues,
} from "@/lib/validations/booking.schema";
import { formatCurrency } from "@/lib/currency/format";
import { calculateAddonsTotal } from "@/lib/pricing/addons";
import type { AddonCatalogItem, AlternativeBoat, Boat, PriceQuote } from "@/types/database";
import { createZodResolver } from "@/lib/forms/zod-resolver";
import { isSlotBookable } from "@/lib/availability/slots";
import { CreditCard, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";

interface CustomerDefaults {
  full_name: string;
  email: string;
  phone?: string;
}

interface BookingWizardProps {
  boat: Boat;
  marinaSlug: string;
  timezone?: string;
  source?: "consumer" | "widget";
  widgetApiKey?: string;
  accentColor?: string;
  buttonText?: string;
  defaultCustomer?: CustomerDefaults;
  addonCatalog?: AddonCatalogItem[];
  allBoats?: Boat[];
}

export function BookingWizard({
  boat: initialBoat,
  marinaSlug,
  timezone = DEFAULT_TIMEZONE,
  source = "consumer",
  widgetApiKey,
  accentColor,
  buttonText = "Book Now",
  defaultCustomer,
  addonCatalog = [],
  allBoats = [],
}: BookingWizardProps) {
  const primaryStyle = accentColor ? { backgroundColor: accentColor } : undefined;
  const router = useRouter();
  const [boat, setBoat] = useState(initialBoat);
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [waiverSignature, setWaiverSignature] = useState<string>("");
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [alternatives, setAlternatives] = useState<AlternativeBoat[]>([]);
  const [slotUnavailable, setSlotUnavailable] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);

  const {
    slots,
    isLoading: loadingSlots,
    isError,
    error,
    refetch,
  } = useAvailability({
    marinaId: boat.marina_id,
    marinaSlug,
    boatId: boat.id,
    minBookingHours: boat.min_booking_hours,
    timezone,
    selectedDate,
    source,
    widgetApiKey,
  });

  const fetchQuote = useCallback(async (start: Date, end: Date) => {
    setQuoteLoading(true);
    try {
      const params = new URLSearchParams({
        boat_id: boat.id,
        start: start.toISOString(),
        end: end.toISOString(),
      });
      const res = await fetch(`/api/v1/marinas/quote?${params}`);
      const data = await res.json();
      if (res.ok && data.quote) {
        setQuote(parsePriceQuote(data.quote));
      }
    } catch {
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [boat.id]);

  const checkAlternatives = useCallback(async (start: Date, end: Date, guestCount: number) => {
    const params = new URLSearchParams({
      marina_id: boat.marina_id,
      boat_id: boat.id,
      start: start.toISOString(),
      end: end.toISOString(),
      guest_count: String(guestCount),
    });
    const res = await fetch(`/api/v1/marinas/alternatives?${params}`);
    const data = await res.json();
    if (res.ok) {
      setSlotUnavailable(!data.available);
      setAlternatives(data.alternatives ?? []);
    }
  }, [boat.id, boat.marina_id]);

  useEffect(() => {
    if (isError) {
      toast.error(error?.message ?? "Failed to load availability");
    }
  }, [isError, error]);

  const form = useForm<BookingCheckoutFormValues>({
    resolver: createZodResolver(bookingCheckoutFormSchema),
    defaultValues: {
      boat_id: boat.id,
      guest_count: 1,
      customer: {
        full_name: defaultCustomer?.full_name ?? "",
        email: defaultCustomer?.email ?? "",
        phone: defaultCustomer?.phone ?? "",
      },
    },
  });

  useEffect(() => {
    if (selectedSlot) {
      fetchQuote(selectedSlot.start, selectedSlot.end);
      checkAlternatives(selectedSlot.start, selectedSlot.end, form.getValues("guest_count"));
    } else {
      setQuote(null);
      setAlternatives([]);
      setSlotUnavailable(false);
    }
  }, [selectedSlot, boat.id, fetchQuote, checkAlternatives, form]);

  useEffect(() => {
    form.setValue("boat_id", boat.id);
  }, [boat.id, form]);

  useEffect(() => {
    if (defaultCustomer) {
      form.reset({
        boat_id: boat.id,
        guest_count: form.getValues("guest_count"),
        customer: {
          full_name: defaultCustomer.full_name,
          email: defaultCustomer.email,
          phone: defaultCustomer.phone ?? "",
        },
      });
    }
  }, [defaultCustomer, boat.id, form]);

  const addonsTotal = calculateAddonsTotal(selectedAddonIds, addonCatalog);
  const basePrice = quote?.base_price ?? 0;
  const taxAmount = quote
    ? Math.round((basePrice + addonsTotal) * Number(quote.breakdown.tax_rate ?? 0) * 100) / 100
    : 0;
  const total = basePrice + addonsTotal + taxAmount;
  const deposit = quote
    ? Math.round(total * (Number(quote.breakdown.deposit_pct ?? 25) / 100) * 100) / 100
    : 0;

  const selectedAddons = addonCatalog
    .filter((a) => selectedAddonIds.includes(a.id))
    .map((a) => ({ name: a.name, price: Number(a.price) }));

  function handleSelectAlternative(boatId: string) {
    const alt = allBoats.find((b) => b.id === boatId) ?? alternatives.find((a) => a.boat_id === boatId);
    if (allBoats.find((b) => b.id === boatId)) {
      setBoat(allBoats.find((b) => b.id === boatId)!);
    }
    setSelectedSlot(null);
    setAlternatives([]);
    setSlotUnavailable(false);
    setShowWaitlist(false);
    toast.info(`Switched to ${alt && "name" in alt ? alt.name : "alternative boat"}`);
  }

  async function onSubmit(values: BookingCheckoutFormValues) {
    if (!selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }

    if (!waiverAccepted) {
      toast.error("Please accept the rental waiver to continue");
      return;
    }

    if (!waiverSignature && sigCanvas.current?.isEmpty()) {
      toast.error("Please provide your signature on the rental waiver");
      return;
    }

    const signatureData = waiverSignature || sigCanvas.current?.toDataURL() || "";

    setSubmitting(true);

    try {
      const fresh = await refetch();
      if (fresh.isError || !fresh.data) {
        toast.error("Could not verify availability. Please refresh the page and try again.");
        return;
      }

      const stillAvailable = isSlotBookable(
        selectedSlot.start,
        selectedSlot.end,
        fresh.data.bookings,
        fresh.data.blocks
      );
      if (!stillAvailable) {
        toast.error("This time slot is no longer available");
        await checkAlternatives(selectedSlot.start, selectedSlot.end, values.guest_count);
        setSlotUnavailable(true);
        return;
      }

      setRedirectingToCheckout(true);

      const payload = {
        ...values,
        boat_id: boat.id,
        start_at: selectedSlot.start.toISOString(),
        end_at: selectedSlot.end.toISOString(),
        addon_ids: selectedAddonIds,
        waiver_accepted: waiverAccepted,
        waiver_signature: signatureData,
      };

      const endpoint =
        source === "widget"
          ? `/api/v1/widget/${boat.marina_id}/bookings`
          : `/api/v1/marinas/${marinaSlug}/bookings`;

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (source === "widget" && widgetApiKey) {
        headers["X-Widget-Key"] = widgetApiKey;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok || !result) {
        if (res.status === 409 && result?.alternatives) {
          setAlternatives(result.alternatives);
          setSlotUnavailable(true);
        }
        toast.error(result?.error ?? "Booking failed — please try again");
        return;
      }

      if (result.requiresPayment) {
        if (!result.checkoutToken) {
          toast.error("Could not start payment. Please try booking again.");
          return;
        }

        const checkoutRes = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            booking_id: result.booking.id,
            checkout_token: result.checkoutToken,
            source,
          }),
        });
        const checkoutData = await checkoutRes.json().catch(() => null);

        if (!checkoutRes.ok || !checkoutData?.checkoutUrl) {
          const msg =
            checkoutData?.error ??
            (checkoutRes.status === 422
              ? "This marina is not set up for online payments yet. Ask the marina owner to connect Stripe under Dashboard → Payments."
              : "Could not start payment. Please try again.");
          toast.error(msg);
          return;
        }

        window.location.href = checkoutData.checkoutUrl;
        return;
      }

      toast.success("Booking confirmed!");
      const confirmPath =
        source === "widget"
          ? `/embed/${boat.marina_id}?confirmed=${result.booking.id}`
          : `/m/${marinaSlug}/booking/confirmation/${result.booking.id}`;
      router.push(confirmPath);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setRedirectingToCheckout(false);
    }
  }

  function onInvalid() {
    toast.error("Please fill in all required fields correctly");
  }

  return (
    <div className="space-y-6">
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Date & Time — {boat.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedSlot(null);
                setShowWaitlist(false);
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border"
            />

            {selectedDate && (
              <div>
                <p className="mb-2 text-sm font-medium">Available times</p>
                {loadingSlots ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="skeleton-shimmer h-10 rounded-md" />
                    ))}
                  </div>
                ) : slots.length === 0 || slots.every((slot) => !slot.available) ? (
                  <p className="text-sm text-muted-foreground">
                    No available times on this date. Choose another day.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {slots.map((slot) => (
                      <Button
                        key={slot.start.toISOString()}
                        type="button"
                        variant={
                          selectedSlot?.start.getTime() === slot.start.getTime()
                            ? "default"
                            : "outline"
                        }
                        disabled={!slot.available}
                        className="text-xs"
                        onClick={() => {
                          setSelectedSlot(slot);
                          setShowWaitlist(false);
                          if (!slot.available) {
                            setSlotUnavailable(true);
                          }
                        }}
                      >
                        {formatMarinaLocal(slot.start, timezone, "h:mm a")}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedSlot && quoteLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating price...
              </div>
            )}

            {selectedSlot && quote && !quoteLoading && (
              <PriceBreakdown
                basePrice={quote.base_price}
                addons={[]}
                tax={0}
                total={quote.base_price}
                ruleLabel={quote.rule_label}
              />
            )}

            {selectedSlot && slotUnavailable && (
              <>
                <AlternativeBoatsPanel
                  alternatives={alternatives}
                  onSelect={handleSelectAlternative}
                  currency={quote?.currency ?? "INR"}
                />
                {!showWaitlist ? (
                  <Button variant="outline" className="w-full" onClick={() => setShowWaitlist(true)}>
                    Join Waitlist Instead
                  </Button>
                ) : (
                  <WaitlistForm
                    marinaId={boat.marina_id}
                    boatId={boat.id}
                    startAt={selectedSlot.start.toISOString()}
                    endAt={selectedSlot.end.toISOString()}
                    guestCount={form.getValues("guest_count")}
                    defaultName={defaultCustomer?.full_name}
                    defaultEmail={defaultCustomer?.email}
                    defaultPhone={defaultCustomer?.phone}
                  />
                )}
              </>
            )}

            <Button
              className="w-full"
              style={primaryStyle}
              disabled={!selectedSlot || slotUnavailable}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit, onInvalid)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="customer.full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guest_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guests</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => {
                          field.onChange(Number(v ?? 1));
                          if (selectedSlot) {
                            checkAlternatives(selectedSlot.start, selectedSlot.end, Number(v ?? 1));
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: boat.capacity }, (_, i) => i + 1).map(
                            (n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n} guest{n > 1 ? "s" : ""}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <AddonSelector
                  catalog={addonCatalog}
                  selectedIds={selectedAddonIds}
                  onChange={setSelectedAddonIds}
                />

                <PriceBreakdown
                  basePrice={basePrice}
                  addons={selectedAddons}
                  tax={taxAmount}
                  deposit={deposit}
                  total={total}
                  ruleLabel={quote?.rule_label}
                />

                <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                  <Checkbox
                    checked={waiverAccepted}
                    onCheckedChange={setWaiverAccepted}
                    className="mt-0.5"
                  />
                  <span>
                    I agree to the rental waiver and understand the terms of boat
                    rental, including safety requirements and liability policies.
                  </span>
                </label>

                {waiverAccepted && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <FormLabel>Digital Signature</FormLabel>
                    <p className="text-xs text-muted-foreground">Please sign below to accept the waiver.</p>
                    <div className="border bg-white rounded-md overflow-hidden" style={{ touchAction: 'none' }}>
                      <SignatureCanvas
                        ref={sigCanvas}
                        canvasProps={{ className: "w-full h-32" }}
                        onEnd={() => {
                          if (sigCanvas.current) {
                            setWaiverSignature(sigCanvas.current.toDataURL());
                          }
                        }}
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        sigCanvas.current?.clear();
                        setWaiverSignature("");
                      }}
                    >
                      Clear Signature
                    </Button>
                  </div>
                )}

                <div className="rounded-lg border border-dashed p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <CreditCard className="h-4 w-4" />
                    Secure Payment
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You&apos;ll be redirected to Stripe Checkout to pay securely.
                    {deposit > 0 &&
                      ` Full total ${formatCurrency(total, quote?.currency ?? "INR")} due today (deposit policy: ${formatCurrency(deposit, quote?.currency ?? "INR")}).`}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    style={primaryStyle}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {redirectingToCheckout ? "Redirecting to payment..." : "Confirming..."}
                      </>
                    ) : (
                      `${buttonText} — ${formatCurrency(total, quote?.currency ?? "INR")}`
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
