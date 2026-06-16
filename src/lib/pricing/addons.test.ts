import { describe, it, expect } from "vitest";
import {
  calculateAddonsTotal,
  normalizeAddonIds,
  validateAddonSelection,
} from "./addons";

const catalog = [
  { id: "a1", price: 45 },
  { id: "a2", price: 150 },
  { id: "a3", price: 75 },
];

describe("normalizeAddonIds", () => {
  it("deduplicates repeated ids", () => {
    expect(normalizeAddonIds(["a1", "a1", "a2"])).toEqual(["a1", "a2"]);
  });
});

describe("calculateAddonsTotal", () => {
  it("sums unique addon prices", () => {
    expect(calculateAddonsTotal(["a1", "a2"], catalog)).toBe(195);
  });

  it("does not double-count duplicate ids", () => {
    expect(calculateAddonsTotal(["a1", "a1"], catalog)).toBe(45);
  });

  it("ignores unknown ids silently (server validates separately)", () => {
    expect(calculateAddonsTotal(["a1", "unknown"], catalog)).toBe(45);
  });

  it("returns 0 for empty selection", () => {
    expect(calculateAddonsTotal([], catalog)).toBe(0);
  });
});

describe("validateAddonSelection", () => {
  it("rejects unknown addon ids", () => {
    const result = validateAddonSelection(["a1", "bad"], catalog);
    expect(result.valid).toBe(false);
  });

  it("accepts valid unique ids", () => {
    expect(validateAddonSelection(["a1", "a3"], catalog).valid).toBe(true);
  });
});

describe("booking total integrity", () => {
  it("base + addons equals displayed total", () => {
    const base = 320;
    const addons = calculateAddonsTotal(["a1", "a3"], catalog);
    expect(base + addons).toBe(440);
  });
});
