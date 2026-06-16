import { describe, it, expect } from "vitest";
import { assertActiveMarina, assertMarinaAccess, AuthError } from "./guards";
import type { SessionContext } from "./session";

function makeSession(overrides?: Partial<SessionContext>): SessionContext {
  return {
    userId: "user-1",
    email: "owner@test.demo",
    memberships: [
      {
        id: "m1",
        marina_id: "marina-a",
        user_id: "user-1",
        role: "owner",
        invited_by: null,
        joined_at: new Date().toISOString(),
        marinas: {
          id: "marina-a",
          slug: "marina-a",
          name: "Marina A",
          description: null,
          address: null,
          city: null,
          state: null,
          zip: null,
          country: "US",
          timezone: "America/New_York",
          logo_url: null,
          primary_color: "#0ea5e9",
          contact_email: null,
          contact_phone: null,
          settings: {},
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      {
        id: "m2",
        marina_id: "marina-b",
        user_id: "user-1",
        role: "owner",
        invited_by: null,
        joined_at: new Date().toISOString(),
        marinas: {
          id: "marina-b",
          slug: "marina-b",
          name: "Marina B",
          description: null,
          address: null,
          city: null,
          state: null,
          zip: null,
          country: "US",
          timezone: "America/New_York",
          logo_url: null,
          primary_color: "#0ea5e9",
          contact_email: null,
          contact_phone: null,
          settings: {},
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    ],
    activeMarina: {
      id: "marina-a",
      slug: "marina-a",
      name: "Marina A",
      description: null,
      address: null,
      city: null,
      state: null,
      zip: null,
      country: "US",
      timezone: "America/New_York",
      logo_url: null,
      primary_color: "#0ea5e9",
      contact_email: null,
      contact_phone: null,
      settings: {},
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    activeRole: "owner",
    ...overrides,
  };
}

describe("assertMarinaAccess", () => {
  it("allows member of marina", () => {
    const session = makeSession();
    expect(() => assertMarinaAccess(session, "marina-b")).not.toThrow();
  });

  it("rejects non-member marina", () => {
    const session = makeSession();
    expect(() => assertMarinaAccess(session, "marina-c")).toThrow(AuthError);
  });
});

describe("assertActiveMarina", () => {
  it("allows active marina", () => {
    const session = makeSession();
    expect(() => assertActiveMarina(session, "marina-a")).not.toThrow();
  });

  it("rejects non-active marina even with membership", () => {
    const session = makeSession();
    expect(() => assertActiveMarina(session, "marina-b")).toThrow(AuthError);
  });
});
