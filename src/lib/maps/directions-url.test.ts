import { describe, expect, it } from "vitest";
import {
  buildDirectionsUrl,
  buildMailtoUrl,
  buildTelUrl,
} from "./directions-url";

describe("buildDirectionsUrl", () => {
  it("uses lat/lng when both provided", () => {
    expect(
      buildDirectionsUrl({ lat: 34.0397, lng: -81.152 })
    ).toBe("https://www.google.com/maps/search/?api=1&query=34.0397,-81.152");
  });

  it("falls back to encoded address when coordinates missing", () => {
    const url = buildDirectionsUrl({
      address: "2301 Bush River Rd",
      city: "Columbia",
      state: "SC",
      zip: "29210",
    });
    expect(url).toContain("google.com/maps/search");
    expect(url).toContain(encodeURIComponent("2301 Bush River Rd, Columbia, SC, 29210"));
  });

  it("prefers lat/lng over address when both present", () => {
    const url = buildDirectionsUrl({
      lat: 32.7874,
      lng: -79.94,
      address: "360 Concord St",
      city: "Charleston",
    });
    expect(url).toContain("32.7874,-79.94");
    expect(url).not.toContain("Concord");
  });
});

describe("buildTelUrl", () => {
  it("strips non-digit characters except leading +", () => {
    expect(buildTelUrl("(803) 555-0142")).toBe("tel:8035550142");
  });
});

describe("buildMailtoUrl", () => {
  it("wraps email in mailto scheme", () => {
    expect(buildMailtoUrl("info@marina.demo")).toBe("mailto:info@marina.demo");
  });
});
