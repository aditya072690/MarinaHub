import { describe, it, expect } from "vitest";
import {
  classifyPricingDayType,
  isDateInPeakSeason,
  isHolidayDate,
} from "./classify-day";

describe("classifyPricingDayType (SQL parity)", () => {
  it("holiday beats weekend", () => {
    expect(
      classifyPricingDayType({ isHoliday: true, isPeakSeason: false, dayOfWeek: 6 })
    ).toBe("holiday");
  });

  it("holiday beats peak season", () => {
    expect(
      classifyPricingDayType({ isHoliday: true, isPeakSeason: true, dayOfWeek: 3 })
    ).toBe("holiday");
  });

  it("peak season beats weekend", () => {
    expect(
      classifyPricingDayType({ isHoliday: false, isPeakSeason: true, dayOfWeek: 0 })
    ).toBe("peak_season");
  });

  it("Saturday is weekend when not holiday/peak", () => {
    expect(
      classifyPricingDayType({ isHoliday: false, isPeakSeason: false, dayOfWeek: 6 })
    ).toBe("weekend");
  });

  it("Wednesday is weekday", () => {
    expect(
      classifyPricingDayType({ isHoliday: false, isPeakSeason: false, dayOfWeek: 3 })
    ).toBe("weekday");
  });
});

describe("isHolidayDate", () => {
  it("matches exact date", () => {
    expect(
      isHolidayDate("2026-07-04", [{ date: "2026-07-04", is_recurring: false }])
    ).toBe(true);
  });

  it("matches recurring month/day", () => {
    expect(
      isHolidayDate("2027-07-04", [{ date: "2026-07-04", is_recurring: true }])
    ).toBe(true);
  });
});

describe("isDateInPeakSeason", () => {
  it("returns true inside range", () => {
    expect(
      isDateInPeakSeason("2026-08-15", [
        { peak_start: "2026-06-01", peak_end: "2026-08-31" },
      ])
    ).toBe(true);
  });

  it("returns false outside range", () => {
    expect(
      isDateInPeakSeason("2026-09-01", [
        { peak_start: "2026-06-01", peak_end: "2026-08-31" },
      ])
    ).toBe(false);
  });
});
