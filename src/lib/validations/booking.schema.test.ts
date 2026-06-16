import { describe, it, expect } from "vitest";
import { publicBookingSchema, authSchema } from "./booking.schema";

describe("publicBookingSchema", () => {
  const valid = {
    boat_id: "550e8400-e29b-41d4-a716-446655440000",
    start_at: "2026-06-15T14:00:00Z",
    end_at: "2026-06-15T16:00:00Z",
    guest_count: 4,
    customer: { full_name: "Jane", email: "jane@test.com" },
  };

  it("rejects end before start", () => {
    const r = publicBookingSchema.safeParse({
      ...valid,
      end_at: "2026-06-15T12:00:00Z",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = publicBookingSchema.safeParse({
      ...valid,
      customer: { ...valid.customer, email: "not-email" },
    });
    expect(r.success).toBe(false);
  });
});

describe("authSchema", () => {
  it("rejects weak passwords", () => {
    const r = authSchema.safeParse({
      email: "user@test.com",
      password: "short",
    });
    expect(r.success).toBe(false);
  });

  it("accepts login without full_name", () => {
    const r = authSchema.safeParse({
      email: "owner@stateparkmarina.demo",
      password: "DemoMarina2026!",
    });
    expect(r.success).toBe(true);
  });

  it("rejects null full_name on login-style payload", () => {
    const r = authSchema.safeParse({
      email: "user@test.com",
      password: "SecurePass123",
      full_name: null,
    });
    expect(r.success).toBe(false);
  });
});
