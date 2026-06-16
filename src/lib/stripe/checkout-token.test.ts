import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createCheckoutToken, verifyCheckoutToken } from "./checkout-token";

describe("checkout token", () => {
  const originalSecret = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_checkout_token_secret";
  });

  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = originalSecret;
  });

  it("creates a verifiable token for a booking", () => {
    const token = createCheckoutToken("booking-abc");
    expect(verifyCheckoutToken("booking-abc", token)).toBe(true);
  });

  it("rejects tokens for a different booking", () => {
    const token = createCheckoutToken("booking-abc");
    expect(verifyCheckoutToken("booking-other", token)).toBe(false);
  });

  it("rejects tampered tokens", () => {
    const token = createCheckoutToken("booking-abc");
    expect(verifyCheckoutToken("booking-abc", `${token}x`)).toBe(false);
  });

  it("rejects expired tokens", () => {
    vi.useFakeTimers();
    const token = createCheckoutToken("booking-abc", 1000);
    vi.advanceTimersByTime(2000);
    expect(verifyCheckoutToken("booking-abc", token)).toBe(false);
    vi.useRealTimers();
  });
});
