import { describe, it, expect } from "vitest";
import { AUDIT_ACTIONS, FEED_ACTIONS } from "./actions";

describe("AUDIT_ACTIONS", () => {
  it("includes all blueprint-critical actions", () => {
    expect(AUDIT_ACTIONS.maintenance.created).toBe("maintenance.created");
    expect(AUDIT_ACTIONS.waitlist.converted).toBe("waitlist.converted");
    expect(AUDIT_ACTIONS.team.member_invited).toBe("team.member_invited");
    expect(AUDIT_ACTIONS.block.updated).toBe("block.updated");
    expect(AUDIT_ACTIONS.marina_holiday.created).toBe("marina_holiday.created");
    expect(AUDIT_ACTIONS.booking.updated).toBe("booking.updated");
  });

  it("feed actions include operational events", () => {
    expect(FEED_ACTIONS).toContain(AUDIT_ACTIONS.maintenance.created);
    expect(FEED_ACTIONS).toContain(AUDIT_ACTIONS.waitlist.converted);
    expect(FEED_ACTIONS).not.toContain(AUDIT_ACTIONS.team.member_invited);
  });
});
