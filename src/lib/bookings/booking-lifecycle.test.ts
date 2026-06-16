import { describe, it, expect } from "vitest";
import { getAllowedActions, validateTransition } from "@/lib/bookings/state-machine";

const ALL_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "completed",
  "cancelled",
  "no_show",
] as const;

describe("invalid status skips", () => {
  const invalidJumps: [string, string][] = [
    ["pending", "checked_in"],
    ["pending", "completed"],
    ["confirmed", "completed"],
    ["confirmed", "checked_out"],
    ["checked_in", "completed"],
    ["checked_in", "confirmed"],
    ["checked_out", "checked_in"],
    ["completed", "checked_in"],
    ["cancelled", "confirmed"],
    ["no_show", "confirmed"],
  ];

  it.each(invalidJumps)("blocks %s → %s for owner", (from, to) => {
    expect(
      validateTransition(from as typeof ALL_STATUSES[number], to as typeof ALL_STATUSES[number], "owner").valid
    ).toBe(false);
  });
});

describe("full lifecycle per role", () => {
  it("staff can run check-in → check-out → complete chain", () => {
    expect(validateTransition("confirmed", "checked_in", "staff").valid).toBe(true);
    expect(validateTransition("checked_in", "checked_out", "staff").valid).toBe(true);
    expect(validateTransition("checked_out", "completed", "staff").valid).toBe(true);
  });

  it("staff cannot confirm or cancel", () => {
    expect(getAllowedActions("pending", "staff")).not.toContain("confirm");
    expect(getAllowedActions("confirmed", "staff")).not.toContain("cancel");
  });

  it("terminal states expose no actions", () => {
    expect(getAllowedActions("completed", "staff")).toEqual([]);
    expect(getAllowedActions("cancelled", "owner")).toEqual([]);
    expect(getAllowedActions("no_show", "manager")).toEqual([]);
  });
});

describe("concurrent transition guard pattern", () => {
  it("only one action available per active status for staff", () => {
    expect(getAllowedActions("confirmed", "staff")).toEqual(["check_in"]);
    expect(getAllowedActions("checked_in", "staff")).toEqual(["check_out"]);
    expect(getAllowedActions("checked_out", "staff")).toEqual(["complete"]);
  });
});
