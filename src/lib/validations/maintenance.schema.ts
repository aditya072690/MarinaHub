import { z } from "zod";

export const maintenanceLogSchema = z.object({
  boat_id: z.string().uuid(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  scheduled_at: z.string().datetime({ offset: true }),
  completed_at: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().max(2000).optional(),
  block_calendar: z.boolean().optional(),
});

export type MaintenanceLogFormValues = z.infer<typeof maintenanceLogSchema>;
