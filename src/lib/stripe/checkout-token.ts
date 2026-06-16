import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { isStripeConfigured } from "./config";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function signingSecret(): string {
  const secret = process.env.STRIPE_SECRET_KEY ?? process.env.CHECKOUT_TOKEN_SECRET;
  if (!secret) {
    throw new Error("Checkout token secret not configured");
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function createCheckoutToken(bookingId: string, ttlMs = TOKEN_TTL_MS): string {
  if (!isStripeConfigured()) {
    throw new Error("Stripe not configured");
  }
  const exp = Date.now() + ttlMs;
  const payload = `${bookingId}.${exp}`;
  return `${exp}.${signPayload(payload)}`;
}

export function verifyCheckoutToken(bookingId: string, token: string): boolean {
  if (!token || !isStripeConfigured()) return false;

  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  const payload = `${bookingId}.${exp}`;
  const expected = signPayload(payload);

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
