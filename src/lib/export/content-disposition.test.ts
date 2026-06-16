import { describe, expect, it } from "vitest";
import { buildAttachmentContentDisposition } from "./content-disposition";

describe("buildAttachmentContentDisposition", () => {
  it("includes attachment and ascii fallback filename", () => {
    const header = buildAttachmentContentDisposition("state-park-bookings.csv");
    expect(header).toContain('attachment');
    expect(header).toContain('filename="state-park-bookings.csv"');
  });

  it("includes RFC 5987 filename* for non-ascii names", () => {
    const header = buildAttachmentContentDisposition("marina-café.csv");
    expect(header).toContain("filename*=UTF-8''");
    expect(header).toContain(encodeURIComponent("marina-café.csv"));
  });
});
