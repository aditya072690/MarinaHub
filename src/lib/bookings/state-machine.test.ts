import { describe, it, expect } from "vitest";
import { getAllowedActions, validateTransition } from "./state-machine";

describe("validateTransition", () => {
  it("blocks completed → pending", () => {
    expect(validateTransition("completed", "pending", "owner").valid).toBe(false);
  });

  it("blocks staff from cancelling", () => {
    expect(validateTransition("confirmed", "cancelled", "staff").valid).toBe(false);
  });

  it("allows manager to confirm pending", () => {
    expect(validateTransition("pending", "confirmed", "manager").valid).toBe(true);
  });

  it("allows staff to check in confirmed", () => {
    expect(validateTransition("confirmed", "checked_in", "staff").valid).toBe(true);
  });

  it("allows staff to check out from checked_in", () => {
    expect(validateTransition("checked_in", "checked_out", "staff").valid).toBe(true);
  });

  it("allows staff to complete from checked_out", () => {
    expect(validateTransition("checked_out", "completed", "staff").valid).toBe(true);
  });

  it("blocks staff from confirming pending", () => {
    expect(validateTransition("pending", "confirmed", "staff").valid).toBe(false);
  });
});

describe("getAllowedActions", () => {
  it("staff on confirmed gets check_in, not cancel", () => {
    const actions = getAllowedActions("confirmed", "staff");
    expect(actions).toContain("check_in");
    expect(actions).not.toContain("cancel");
    expect(actions).not.toContain("confirm");
  });

  it("manager on pending gets confirm and cancel", () => {
    const actions = getAllowedActions("pending", "manager");
    expect(actions).toContain("confirm");
    expect(actions).toContain("cancel");
  });

  it("checked_in offers check_out", () => {
    const actions = getAllowedActions("checked_in", "staff");
    expect(actions).toContain("check_out");
    expect(actions).not.toContain("check_in");
  });

  it("checked_out offers complete", () => {
    const actions = getAllowedActions("checked_out", "staff");
    expect(actions).toContain("complete");
  });
});
