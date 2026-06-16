import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const availabilityQuerySchema = z.object({
  boat_id: z.string().uuid(),
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
});

export const marinaIdParamSchema = z.object({
  marinaId: z.string().uuid(),
});
