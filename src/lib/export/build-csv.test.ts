import { describe, expect, it } from "vitest";
import { buildCsv } from "./build-csv";

describe("buildCsv", () => {
  it("escapes commas and quotes", () => {
    const csv = buildCsv(
      [{ key: "name", header: "Name" }],
      [{ name: 'Boat, "Special"' }]
    );
    expect(csv).toContain('"Boat, ""Special"""');
  });

  it("includes BOM and header row", () => {
    const csv = buildCsv(
      [
        { key: "a", header: "A" },
        { key: "b", header: "B" },
      ],
      [{ a: "1", b: "2" }]
    );
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("A,B");
    expect(csv).toContain("1,2");
  });
});
