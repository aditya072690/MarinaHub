import { describe, expect, it } from "vitest";
import {
  deriveStripeStatus,
  mapAccountToFields,
  marinaCanAcceptStripePayments,
} from "./connect";
import type { MarinaPaymentAccount } from "@/types/database";
import type Stripe from "stripe";

function mockAccount(overrides: Partial<Stripe.Account> = {}): Stripe.Account {
  return {
    id: "acct_test",
    object: "account",
    charges_enabled: false,
    payouts_enabled: false,
    details_submitted: false,
    requirements: { disabled_reason: null },
    ...overrides,
  } as Stripe.Account;
}

describe("deriveStripeStatus", () => {
  it("returns connected when charges and payouts are enabled", () => {
    expect(
      deriveStripeStatus(
        mockAccount({ charges_enabled: true, payouts_enabled: true })
      )
    ).toBe("connected");
  });

  it("returns restricted when Stripe disabled the account", () => {
    expect(
      deriveStripeStatus(
        mockAccount({
          requirements: { disabled_reason: "requirements.past_due" },
        } as Partial<Stripe.Account>)
      )
    ).toBe("restricted");
  });

  it("returns pending when details submitted but not fully live", () => {
    expect(
      deriveStripeStatus(mockAccount({ details_submitted: true }))
    ).toBe("pending");
  });
});

describe("mapAccountToFields", () => {
  it("sets onboarding complete when details submitted and charges enabled", () => {
    const fields = mapAccountToFields(
      mockAccount({ details_submitted: true, charges_enabled: true }),
      null
    );
    expect(fields.stripe_onboarding_complete).toBe(true);
    expect(fields.connected_at).toBeTruthy();
  });

  it("preserves existing connected_at", () => {
    const connectedAt = "2026-01-01T00:00:00.000Z";
    const fields = mapAccountToFields(
      mockAccount({ details_submitted: true, charges_enabled: true }),
      connectedAt
    );
    expect(fields.connected_at).toBe(connectedAt);
  });
});

describe("marinaCanAcceptStripePayments", () => {
  const base: MarinaPaymentAccount = {
    id: "mpa-1",
    marina_id: "marina-1",
    stripe_status: "connected",
    stripe_account_id: "acct_123",
    platform_fee_pct: 0.03,
    connected_at: null,
    created_at: "",
    updated_at: "",
    stripe_onboarding_complete: true,
    stripe_charges_enabled: true,
    stripe_payouts_enabled: true,
    stripe_details_submitted: true,
  };

  it("accepts when Connect account is fully ready", () => {
    expect(marinaCanAcceptStripePayments(base)).toBe(true);
  });

  it("rejects when charges are disabled", () => {
    expect(
      marinaCanAcceptStripePayments({ ...base, stripe_charges_enabled: false })
    ).toBe(false);
  });

  it("rejects when onboarding is incomplete", () => {
    expect(
      marinaCanAcceptStripePayments({
        ...base,
        stripe_onboarding_complete: false,
      })
    ).toBe(false);
  });
});
