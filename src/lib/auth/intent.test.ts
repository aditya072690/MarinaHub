import { describe, it, expect } from "vitest";
import { isSafeRedirect } from "./intent";

describe("isSafeRedirect", () => {
  it("allows same-origin paths", () => {
    expect(isSafeRedirect("/account")).toBe(true);
    expect(isSafeRedirect("/account/trips")).toBe(true);
    expect(isSafeRedirect("/dashboard/bookings")).toBe(true);
    expect(isSafeRedirect("/account?tab=upcoming")).toBe(true);
  });

  it("rejects protocol-relative and external URLs", () => {
    expect(isSafeRedirect("//evil.com")).toBe(false);
    expect(isSafeRedirect("https://evil.com")).toBe(false);
    expect(isSafeRedirect(null)).toBe(false);
    expect(isSafeRedirect("")).toBe(false);
  });

  it("rejects backslash paths", () => {
    expect(isSafeRedirect("/\\evil.com")).toBe(false);
    expect(isSafeRedirect("/%5cevil.com")).toBe(false);
  });
});
