import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createZodResolver } from "./zod-resolver";

describe("createZodResolver", () => {
  const schema = z.object({
    name: z.string().min(1),
    count: z.coerce.number().int().positive(),
  });

  it("returns parsed values on success", async () => {
    const resolver = createZodResolver(schema);
    const result = await resolver({ name: "Test", count: 2 }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ name: "Test", count: 2 });
  });

  it("returns nested errors on failure", async () => {
    const resolver = createZodResolver(schema);
    const result = await resolver({ name: "", count: 0 }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });
    expect(result.values).toEqual({});
    expect(result.errors.name).toBeDefined();
  });
});
