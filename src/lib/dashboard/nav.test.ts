import { describe, it, expect } from "vitest";
import { getNavItems, isNavActive } from "./nav";

describe("getNavItems", () => {
  it("owner sees full navigation including widget and settings", () => {
    const labels = getNavItems("owner").map((i) => i.label);
    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Fleet");
    expect(labels).toContain("Analytics");
    expect(labels).toContain("Widget Settings");
    expect(labels).toContain("Settings");
    expect(labels).toContain("Payments");
    expect(labels).not.toContain("Team");
    expect(labels).not.toContain("Blocks");
    expect(labels).not.toContain("Email Templates");
  });

  it("manager sees analytics but not widget or settings", () => {
    const labels = getNavItems("manager").map((i) => i.label);
    expect(labels).toContain("Fleet");
    expect(labels).toContain("Analytics");
    expect(labels).not.toContain("Widget Settings");
    expect(labels).not.toContain("Settings");
    expect(labels).not.toContain("Payments");
    expect(labels).not.toContain("Team");
  });

  it("staff sees dashboard and bookings but not fleet or analytics", () => {
    const labels = getNavItems("staff").map((i) => i.label);
    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Bookings");
    expect(labels).toContain("Calendar");
    expect(labels).toContain("Customers");
    expect(labels).not.toContain("Fleet");
    expect(labels).not.toContain("Analytics");
    expect(labels).not.toContain("Widget Settings");
    expect(labels).not.toContain("Settings");
  });
});

describe("isNavActive", () => {
  it("dashboard is not active on analytics path", () => {
    expect(isNavActive("/dashboard/analytics", "/dashboard")).toBe(false);
    expect(isNavActive("/dashboard/analytics", "/dashboard/analytics")).toBe(true);
  });

  it("matches nested booking routes", () => {
    const hrefs = ["/dashboard/bookings", "/dashboard/customers"];
    expect(isNavActive("/dashboard/bookings/abc", "/dashboard/bookings", hrefs)).toBe(
      true
    );
    expect(isNavActive("/dashboard/bookings/abc", "/dashboard/customers", hrefs)).toBe(
      false
    );
  });

  it("segments is active but customers is not on segments page", () => {
    const hrefs = ["/dashboard/customers", "/dashboard/customers/segments"];
    expect(
      isNavActive("/dashboard/customers/segments", "/dashboard/customers/segments", hrefs)
    ).toBe(true);
    expect(
      isNavActive("/dashboard/customers/segments", "/dashboard/customers", hrefs)
    ).toBe(false);
  });

  it("customers stays active on customer detail", () => {
    const hrefs = ["/dashboard/customers", "/dashboard/customers/segments"];
    expect(
      isNavActive("/dashboard/customers/abc-123", "/dashboard/customers", hrefs)
    ).toBe(true);
    expect(
      isNavActive("/dashboard/customers/abc-123", "/dashboard/customers/segments", hrefs)
    ).toBe(false);
  });
});
