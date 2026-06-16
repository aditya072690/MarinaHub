import { z } from "zod";

export const addonIdsSchema = z.array(z.string().uuid()).default([]);

export const waiverSchema = z.literal(true, {
  message: "You must accept the rental waiver to continue",
});
