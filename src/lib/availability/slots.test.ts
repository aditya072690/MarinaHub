import { describe, expect, it } from "vitest";
import { generateHourlySlots, isSlotBookable } from "./slots";

describe("generateHourlySlots business hours", () => {
  const date = new Date("2026-07-15T12:00:00Z");

  it("returns no slots when marina is closed", () => {
    expect(
      generateHourlySlots(date, 2, "America/New_York", {
        open: "08:00",
        close: "18:00",
        closed: true,
      })
    ).toEqual([]);
  });

  it("respects custom open/close hours", () => {
    const slots = generateHourlySlots(date, 2, "America/New_York", {
      open: "09:00",
      close: "13:00",
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.length).toBeLessThan(
      generateHourlySlots(date, 2, "America/New_York").length
    );
  });
});

describe("isSlotBookable", () => {
  it("rejects slots that already started", () => {
    const now = new Date("2026-06-14T14:00:00Z");
    const slotStart = new Date("2026-06-14T13:00:00Z");
    const slotEnd = new Date("2026-06-14T15:00:00Z");

    expect(isSlotBookable(slotStart, slotEnd, [], [], now)).toBe(false);
  });

  it("accepts future slots with no conflicts", () => {
    const now = new Date("2026-06-14T13:00:00Z");
    const slotStart = new Date("2026-06-14T15:00:00Z");
    const slotEnd = new Date("2026-06-14T17:00:00Z");

    expect(isSlotBookable(slotStart, slotEnd, [], [], now)).toBe(true);
  });
});
