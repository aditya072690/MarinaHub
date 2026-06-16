import { describe, it, expect } from "vitest";
import { isSlotBlocked } from "./slots";

describe("availability block validation", () => {
  const slotStart = new Date("2026-07-15T10:00:00Z");
  const slotEnd = new Date("2026-07-15T12:00:00Z");

  it("blocks slot overlapping maintenance block", () => {
    const blocked = isSlotBlocked(
      slotStart,
      slotEnd,
      [],
      [{ start_at: "2026-07-15T09:00:00Z", end_at: "2026-07-15T11:00:00Z" }]
    );
    expect(blocked).toBe(true);
  });

  it("allows slot after block ends", () => {
    const blocked = isSlotBlocked(
      slotStart,
      slotEnd,
      [],
      [{ start_at: "2026-07-15T08:00:00Z", end_at: "2026-07-15T10:00:00Z" }]
    );
    expect(blocked).toBe(false);
  });

  it("blocks slot with checked_in booking overlap", () => {
    const blocked = isSlotBlocked(
      slotStart,
      slotEnd,
      [{ start_at: "2026-07-15T11:00:00Z", end_at: "2026-07-15T13:00:00Z" }],
      []
    );
    expect(blocked).toBe(true);
  });

  it("handles adjacent non-overlapping slots", () => {
    const blocked = isSlotBlocked(
      slotStart,
      slotEnd,
      [{ start_at: "2026-07-15T12:00:00Z", end_at: "2026-07-15T14:00:00Z" }],
      []
    );
    expect(blocked).toBe(false);
  });
});
