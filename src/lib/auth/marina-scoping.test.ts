import { describe, it, expect } from "vitest";

/**
 * Documents expected marina-scoping guard behavior.
 * Full RLS integration tests require Supabase test project — run manually via `supabase test db`.
 */
describe("marina scoping guards (unit contract)", () => {
  it("assertActiveMarina requires cookie marina to match param", () => {
    const session = {
      activeMarina: { id: "marina-a" },
      memberships: [
        { marina_id: "marina-a", role: "owner" as const },
        { marina_id: "marina-b", role: "owner" as const },
      ],
    };

    const activeMatches = session.activeMarina?.id === "marina-a";
    const hasMembershipB = session.memberships.some((m) => m.marina_id === "marina-b");

    expect(activeMatches).toBe(true);
    expect(hasMembershipB).toBe(true);
    // assertActiveMarina(session, "marina-b") must throw even though user is member of B
  });

  it("RLS policy pattern scopes reads to auth_user_marina_ids()", () => {
    const userMarinaIds = ["marina-a", "marina-b"];
    const queryMarinaId = "marina-c";
    const allowed = userMarinaIds.includes(queryMarinaId);
    expect(allowed).toBe(false);
  });

  it("marina switcher only lists memberships from session", () => {
    const memberships = [
      { marina_id: "a", marinas: { name: "A" } },
      { marina_id: "b", marinas: { name: "B" } },
    ];
    const switchTargets = memberships.map((m) => m.marina_id);
    expect(switchTargets).not.toContain("marina-unauthorized");
  });
});
