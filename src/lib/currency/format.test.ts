import { describe, it, expect } from "vitest";
import { formatCurrency } from "./format";

describe("formatCurrency", () => {
  it("defaults to INR", () => {
    const result = formatCurrency(50000);
    expect(result).toMatch(/₹|INR/);
  });

  it("formats USD", () => {
    const result = formatCurrency(1250.5, "USD");
    expect(result).toMatch(/\$1,250\.50|US\$1,250\.50/);
  });

  it("formats INR", () => {
    const result = formatCurrency(50000, "INR");
    expect(result).toMatch(/₹|INR/);
  });

  it("falls back for unknown currency codes", () => {
    const result = formatCurrency(100, "XYZ");
    expect(result).toContain("100.00");
  });
});
