import { describe, expect, it, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const mockRpc = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: mockRpc,
    from: mockFrom,
  }),
}));

vi.mock("./server", () => ({
  getStripe: () => ({
    paymentIntents: {
      retrieve: vi.fn().mockResolvedValue({ application_fee_amount: 3540 }),
    },
  }),
}));

import {
  confirmBookingFromCheckoutSession,
  handleCheckoutSessionExpired,
} from "./webhook-handlers";

function mockSession(
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Checkout.Session {
  return {
    id: "cs_test_123",
    object: "checkout.session",
    payment_status: "paid",
    amount_total: 118000,
    payment_intent: "pi_test_123",
    metadata: { booking_id: "booking-1", marina_id: "marina-1" },
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe("confirmBookingFromCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ error: null });
  });

  it("calls confirm_booking_payment RPC with session totals", async () => {
    const ok = await confirmBookingFromCheckoutSession(
      mockSession(),
      "evt_test_completed"
    );

    expect(ok).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("confirm_booking_payment", {
      p_booking_id: "booking-1",
      p_marina_id: "marina-1",
      p_session_id: "cs_test_123",
      p_payment_intent_id: "pi_test_123",
      p_amount_cents: 118000,
      p_platform_fee_cents: 3540,
      p_stripe_event_id: "evt_test_completed",
      p_stripe_charge_id: null,
      p_currency: "inr",
    });
  });

  it("uses page_sync event id for confirmation-page fallback", async () => {
    await confirmBookingFromCheckoutSession(mockSession(), "page_sync_cs_test_123");

    expect(mockRpc).toHaveBeenCalledWith(
      "confirm_booking_payment",
      expect.objectContaining({ p_stripe_event_id: "page_sync_cs_test_123" })
    );
  });

  it("skips unpaid sessions", async () => {
    const ok = await confirmBookingFromCheckoutSession(
      mockSession({ payment_status: "unpaid" }),
      "evt_test"
    );
    expect(ok).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("skips sessions without booking metadata", async () => {
    const ok = await confirmBookingFromCheckoutSession(
      mockSession({ metadata: {} }),
      "evt_test"
    );
    expect(ok).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("handleCheckoutSessionExpired", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const chain = {
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ error: null }),
    };
    mockUpdate.mockReturnValue(chain);
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it("cancels pending bookings tied to the expired session", async () => {
    await handleCheckoutSessionExpired(mockSession());

    expect(mockFrom).toHaveBeenCalledWith("bookings");
    expect(mockUpdate).toHaveBeenCalledWith({
      status: "cancelled",
      payment_status: "failed",
    });
  });
});
