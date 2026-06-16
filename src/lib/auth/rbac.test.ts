import { describe, it, expect } from "vitest";
import { can } from "./rbac";

describe("rbac", () => {
  it("owner has full permissions", () => {
    expect(can("owner", "team:manage")).toBe(true);
    expect(can("owner", "onboarding:write")).toBe(true);
  });

  it("manager cannot manage team or onboarding", () => {
    expect(can("manager", "team:manage")).toBe(false);
    expect(can("manager", "onboarding:write")).toBe(false);
    expect(can("manager", "bookings:confirm")).toBe(true);
  });

  it("staff can check in but not cancel or manage boats", () => {
    expect(can("staff", "bookings:checkin")).toBe(true);
    expect(can("staff", "bookings:cancel")).toBe(false);
    expect(can("staff", "boats:write")).toBe(false);
    expect(can("staff", "analytics:view")).toBe(false);
  });

  it("null role has no permissions", () => {
    expect(can(null, "bookings:read")).toBe(false);
  });
});
