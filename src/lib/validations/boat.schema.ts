import { z } from "zod";

const optionalRate = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().min(0).optional()
);

export const boatSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(2000).optional(),
  boat_type: z.string().max(50).optional(),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(100),
  hourly_rate: z.coerce.number().min(0, "Hourly rate must be 0 or greater"),
  daily_rate: optionalRate,
  status: z.enum(["active", "inactive", "maintenance"]).default("active"),
  amenities: z.array(z.string()).default([]),
  min_booking_hours: z.coerce.number().int().min(1).max(24).default(2),
});

export type BoatFormValues = z.infer<typeof boatSchema>;
